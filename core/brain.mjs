// The brain: decides what every pet does, from agent events, the pointer, the
// other pets, the desktop and the time. Plain JS, deterministic under a seed;
// the shell turns its commands into engine calls.
//
// Priority layers (higher preempts, lower resumes afterwards):
//   agent > interaction > social > context > ambient
//
// update(now) returns { commands, due }:
//   { pet, action }            play an action (a variant is picked downstream)
//   { pet, clip }              play a specific clip
//   { pet, rest: true }        back to the resting pose
//   { pet, offset: { x, ms } } walk/slide along the bar (grid units)
//   { pet, awake: bool }       eyes system on/off
//   { pet, clones: [...] }     the pet's shadow clones changed
//   { pet, turn: { ms, failed } }  a finished turn (progression)
//   { pet, goHome: name }      a trip (roam.*) was cut short: back to the slot
//   { pet, tripStart: scene }  a trip (or a walk home) begins: the shell readies the surface
//   { pet, tripDone: name }    a trip ended with the pet home
// takeNotes() → [{ pet, what }]: needs (it waits for you) or done (a long turn
// ended), at the moment the event arrives — also while the pets are hidden
// (fullscreen), which is when a notification matters most. The shell notifies
// only when the user turned notifications on.
// due is when update() next has something to do (Infinity: nothing).
import * as Rng from "./rng.mjs"
import { createSessions, stateAction, nextEscalation, doneAction } from "./sessions.mjs"
import { SCENES, pointSteps } from "./social.mjs"

export const MAX_CLONES = 3
const AMBIENT_RANGE = { rare: [60000, 180000], normal: [20000, 90000], lively: [10000, 45000] }
const DOZE_MS = { showoff: 15 * 60000, balanced: 10 * 60000, battery: 2 * 60000, still: 2 * 60000 }
const SOCIAL_COOLDOWN = 3 * 60000
const ROAM_GAP = 60000                // between any two trips on the bar
const ROAM_PET_GAP = 3 * 60000        // between two trips of one pet
const EXPLORE_GAP = 4 * 60000         // between two desktop excursions

// options: { seed, clipMs(clipOrAction) → ms, isAction(name), onTurn(index, ms, failed) → done action,
//            planRoam(index, kind, rng) → scene | null (stroll, perch, zoomies, explore) }
export function createBrain(options) {
  const opts = Object.assign({ seed: 1, clipMs: () => 1500, isAction: n => n.indexOf(".") !== -1, onTurn: (i, ms) => doneAction(ms, 0), planRoam: () => null }, options || {})
  const rng = Rng.create(opts.seed)
  const sessions = createSessions()
  let pets = []                       // [{ id, provider, personality, habits, moves, levitates, st }]
  let settings = { social: true, ambient: "normal", quietHours: { enabled: false, from: "22:00", to: "07:00" }, progression: true, roaming: "bar" }
  let lastRoamAt = -Infinity
  let lastExploreAt = -Infinity
  let notes = []
  const waiting = {}                   // pet/session → already noted as waiting
  let ctx = { userIdle: false, media: false, batteryLow: false, night: false, morning: false, fullscreen: false, power: "balanced", reduced: false, still: false, onBattery: false, vertical: false }
  let spacing = 34
  // where a pet stands along its bar: its slot in its own row (pets on other
  // bars are in another group and never share a scene)
  const place = i => ((pets[i] && pets[i].slot !== undefined ? pets[i].slot : i) * spacing)
  const sameBar = (p, q) => (p.group || 0) === (q.group || 0)
  // scenes where pets walk to each other: not on a vertical bar (walking is
  // along x, which would take them off it); pointing at a needy pet still is
  const walking = () => settings.social && !ctx.vertical
  let scenes = []
  let lastSocialAt = -Infinity
  let lastSocialName = ""
  let commands = []
  let wakeAt = Infinity                 // a nudge requested from outside
  const recentDone = []                 // [{ pet, at }] for high-fives
  let lastNow = 0
  const pendingScenes = []             // [{ at, make }] scenes that start later (high-fives)

  function st() {
    return { layer: "", action: "", oneShot: false, queue: [], loop: null, busyUntil: 0, interactUntil: 0, scene: null,
             nextAmbient: 0, lastActive: 0, asleep: false, dozed: false, ctxAction: "", ctxUntil: 0, nextCtx: 0,
             clones: [], hatch: false, streakFailed: false, lastCategory: "" }
  }

  function setPets(list, layout) {
    const byId = {}
    for (const p of pets) byId[p.id] = p
    pets = list.map((d, i) => Object.assign({}, d, { index: i, st: byId[d.id] ? byId[d.id].st : st() }))
    if (layout && layout.spacing) spacing = layout.spacing
    scenes = []
    for (const p of pets) { p.st.scene = null; if (!p.st.nextAmbient) p.st.nextAmbient = 0 }
  }
  function setSettings(s) { settings = Object.assign({}, settings, s || {}) }
  // c: { userIdle, media, batteryLow, night, morning, fullscreen, power, reduced, still }
  // plus one-off cues: plugged: true (charger connected), glance: "left" | "right"
  function setContext(c) {
    const before = ctx
    const cue = Object.assign({}, c || {})
    const plugged = cue.plugged, glance = cue.glance
    delete cue.plugged; delete cue.glance
    ctx = Object.assign({}, ctx, cue)
    // the user steps away at night: everyone idle piles up for a nap together
    if (!before.userIdle && ctx.userIdle && ctx.night && walking() && pets.length >= 2) napPile(lastNow)
    if (before.userIdle && !ctx.userIdle) {
      if (scenes.some(x => x.scene.name === "napPile")) endNapPile(lastNow)
      for (const p of pets) { p.st.lastActive = lastNow; if (p.st.asleep && !p.st.scene) wakePet(p) }
    }
    if (before.batteryLow !== ctx.batteryLow || before.media !== ctx.media) for (const p of pets) p.st.nextCtx = 0
    for (const p of pets) {
      if (plugged) p.st.ctxOneShot = "battery.plugged"
      else if (glance) p.st.ctxOneShot = "glance." + glance
      else if (ctx.night && !before.night) p.st.ctxOneShot = "night"
      else if (ctx.morning && !before.morning) p.st.ctxOneShot = "morning"
    }
    wakeAt = 0
  }

  const emit = c => commands.push(c)
  // free for a scene: nothing above ambient going on (an ambient bit is cut short)
  const free = p => !p.st.loop && lastNow >= p.st.interactUntil && !p.st.scene && (!p.st.oneShot || p.st.layer === "ambient")

  function play(p, layer, what, oneShot, ms) {
    const cmd = opts.isAction(what) ? { pet: p.index, action: what } : { pet: p.index, clip: what }
    // ambient bits are calm: the player steps them at a lower frame rate
    if (layer === "ambient") cmd.calm = true
    emit(cmd)
    p.st.layer = layer
    p.st.action = what
    p.st.oneShot = !!oneShot
    p.st.busyUntil = oneShot ? lastNow + (ms || opts.clipMs(what)) : Infinity
    if (p.st.asleep && layer !== "rest") { p.st.asleep = false; emit({ pet: p.index, awake: true }) }
  }
  function restPet(p) {
    emit({ pet: p.index, rest: true })
    p.st.layer = ""; p.st.action = ""; p.st.oneShot = false; p.st.busyUntil = 0
  }
  // nap: a doze ends by itself after a while (sleepier pets nap longer);
  // the user being away or quiet hours keep everyone asleep until they end
  function sleepPet(p, nap) {
    if (p.st.asleep) return
    p.st.asleep = true
    p.st.sleepUntil = nap ? lastNow + (5 + 10 * ((p.personality || {}).sleepiness || 0.5)) * 60000 : 0
    emit({ pet: p.index, action: "asleep.still" })
    emit({ pet: p.index, awake: false })
    p.st.layer = "rest"; p.st.action = "asleep.still"; p.st.oneShot = false; p.st.busyUntil = 0
  }
  function wakePet(p) {
    p.st.asleep = false
    p.st.dozed = false
    emit({ pet: p.index, awake: true })
    play(p, "rest", "wake", true)
  }

  // ---- agent events
  // quiet: replaying a log after a shell restart restores the sessions' state
  // without re-playing their one-off animations.
  function event(ev, now, quiet) {
    lastNow = now
    const p = pets.find(q => q.id === ev.pet)
    if (!p) return
    const out = sessions.apply(Object.assign({}, ev, { at: ev.at || now }))
    if (!out) return
    if (quiet) { syncClones(p); wakeAt = 0; return }
    p.st.lastActive = now
    abortScene(p)
    // waiting for you: noted at once (the escalation ladder plays later)
    if (out.kind === "needs" && !waiting[p.id + "/" + out.session]) { waiting[p.id + "/" + out.session] = true; notes.push({ pet: p.index, what: "needs" }) }
    if (out.kind !== "needs" && out.kind !== "notify") delete waiting[p.id + "/" + out.session]
    const prim = sessions.primary(p.id)
    const isPrimary = !prim || prim.id === out.session
    switch (out.kind) {
      case "session.start": queue(p, "session.start"); maybeBaton(p, now); break
      case "prompt": if (isPrimary) queue(p, "prompt"); break
      case "tool.fail": if (isPrimary) queue(p, "failure"); p.st.streakFailed = true; break
      case "subagent.start": queue(p, "subagent.start"); p.st.hatch = true; break
      case "subagent.stop": queue(p, "subagent.stop"); p.st.hatch = "back"; p.st.hatchUntil = now + 1700; break
      case "turn.end": {
        const failed = p.st.streakFailed
        p.st.streakFailed = false
        const action = opts.onTurn(p.index, out.turn.ms, failed) || doneAction(out.turn.ms, 0)
        if (!isPrimary && sessions.count(p.id) > 1) break
        queue(p, action)
        if (out.turn.ms >= 60000) notes.push({ pet: p.index, what: "done" })
        // two pets finishing within 4 s high-five once both have celebrated
        const other = recentDone.find(r => r.pet !== p.index && now - r.at < 4000 && pets[r.pet] && sameBar(p, pets[r.pet]))
        if (other && walking()) {
          const q = pets[other.pet]
          const after = Math.max(opts.clipMs(action), q.st.busyUntil - now, 0) + 200
          pendingScenes.push({ at: now + after, make: () => SCENES.highFive([q.index, p.index], place) })
          recentDone.splice(recentDone.indexOf(other), 1)
        } else recentDone.push({ pet: p.index, at: now })
        break
      }
      case "turn.fail": p.st.streakFailed = false; opts.onTurn(p.index, out.turn.ms, true); if (isPrimary) queue(p, "failure"); break
      case "turn.cancel": break
      case "session.end": if (sessions.count(p.id) === 0) { queue(p, "session.end"); p.st.endedAt = now; maybeBaton(p, now) } break
      case "usage.exhausted": queue(p, "usage.exhausted"); break
      case "usage.reset": queue(p, "usage.reset"); break
    }
    syncClones(p)
    wakeAt = 0
  }
  function queue(p, action) { p.st.queue.push(action) }


  // baton: one pet's session ends while another's starts, within 5 s
  function maybeBaton(p, now) {
    if (!walking() || pets.length < 2) return
    const other = pets.find(q => q !== p && sameBar(p, q) && Math.abs((q.st.endedAt || -1e12) - now) < 5000 && sessions.count(q.id) === 0)
    if (!other || sessions.count(p.id) === 0) return
    if (other.st.scene || p.st.scene) return
    startScene(SCENES.batonHandoff([other.index, p.index], place), now, true)
  }

  // ---- interaction (the shell plays the clip; the brain only keeps out of the way)
  function interact(index, ms, now) {
    lastNow = now
    const p = pets[index]
    if (!p) return
    p.st.interactUntil = now + (ms || 1500)
    p.st.lastActive = now
    if (p.st.loop) p.st.resumeLoop = true
    if (p.st.asleep) { p.st.asleep = false; p.st.dozed = false; emit({ pet: index, awake: true }) }
    abortScene(p)
    wakeAt = 0
  }

  // ---- scenes
  function startScene(scene, now, force) {
    if (!scene || !scene.pets.length) return false
    const s = { scene, start: now, next: 0 }
    for (const i of scene.pets) { const q = pets[i]; if (!q) return false; if (!force && !free(q)) return false }
    for (const i of scene.pets) { pets[i].st.scene = s; pets[i].st.layer = "social" }
    scenes.push(s)
    lastSocialAt = now
    lastSocialName = scene.name
    return true
  }
  function abortScene(p) {
    const s = p.st.scene
    if (!s) return
    scenes = scenes.filter(x => x !== s)
    const trip = s.scene.name.indexOf("roam.") === 0 || s.scene.name === "walkHome"
    for (const i of s.scene.pets) {
      const q = pets[i]
      if (!q) continue
      q.st.scene = null
      emit(trip ? { pet: i, goHome: s.scene.name } : { pet: i, offset: { x: 0, y: 0, ms: 450 } })
      if (q !== p && !q.st.loop) restPet(q)
    }
  }
  function runScenes(now) {
    let due = Infinity
    for (const s of scenes.slice()) {
      const steps = s.scene.steps
      while (s.next < steps.length && s.start + steps[s.next].at <= now) {
        const step = steps[s.next++], q = pets[step.pet]
        if (!q) continue
        if (step.ifIdle && (q.st.loop || q.st.scene !== s)) continue
        if (step.offset) emit({ pet: step.pet, offset: step.offset })
        if (step.clip) emit({ pet: step.pet, clip: step.clip })
        if (step.action) emit({ pet: step.pet, action: step.action })
        if (step.rest) restPet(q)
      }
      if (s.next >= steps.length && !s.scene.hold) {
        scenes = scenes.filter(x => x !== s)
        for (const i of s.scene.pets) if (pets[i] && pets[i].st.scene === s) { pets[i].st.scene = null; pets[i].st.layer = "" }
        if (s.scene.name.indexOf("roam.") === 0 || s.scene.name === "walkHome") for (const i of s.scene.pets) emit({ pet: i, tripDone: s.scene.name })
      } else if (s.next < steps.length) due = Math.min(due, s.start + steps[s.next].at)
    }
    return due
  }

  // ---- clones: the other sessions of a pet, as semi-transparent minis
  function syncClones(p) {
    const others = sessions.ranked(p.id).slice(1, 1 + MAX_CLONES)
    const want = others.map(s => ({ id: s.id, action: stateAction(s, lastNow) || "idle" }))
    // the subagent: a mini-me hatchling runs off, and comes back with a box
    if (p.st.hatch === true) want.unshift({ id: "hatchling", action: "hatchOut" })
    else if (p.st.hatch === "back" && lastNow < p.st.hatchUntil) want.unshift({ id: "hatchling", action: "hatchBack" })
    else if (p.st.hatch === "back") p.st.hatch = false
    const key = JSON.stringify(want.slice(0, MAX_CLONES))
    if (key !== JSON.stringify(p.st.clones)) { p.st.clones = want.slice(0, MAX_CLONES); emit({ pet: p.index, clones: p.st.clones }) }
  }

  // ---- time of day
  function minutes(hhmm) { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + m }
  function inQuiet(date) {
    const q = settings.quietHours
    if (!q || !q.enabled) return false
    const m = date.getHours() * 60 + date.getMinutes(), a = minutes(q.from), b = minutes(q.to)
    return a <= b ? m >= a && m < b : m >= a || m < b
  }

  // ---- ambient: one utility-scored pick when a pet's turn comes
  function ambientCap() { return ctx.power === "showoff" ? 2 : 1 }
  function activeAmbient() { return pets.filter(p => p.st.layer === "ambient" && p.st.oneShot && lastNow < p.st.busyUntil).length + scenes.filter(s => !s.scene.hold && s.scene.name !== "point" && s.scene.name !== "walkHome").length }
  // trips: roaming on, a power mode that allows it, and nobody else out
  const tripping = () => scenes.some(s => s.scene.name.indexOf("roam.") === 0)
  function roamOk(now) {
    return settings.roaming !== "home" && !ctx.vertical && (ctx.power === "balanced" || ctx.power === "showoff") && !ctx.reduced && !ctx.still && !ctx.fullscreen &&
      !tripping() && now - lastRoamAt > ROAM_GAP
  }
  // desktop excursions: opted in, never on battery
  function exploreOk(now) { return settings.roaming === "desktop" && !ctx.onBattery && ctx.power !== "battery" && now - lastExploreAt > EXPLORE_GAP }
  function nextAmbientDelay() {
    const [lo, hi] = AMBIENT_RANGE[settings.ambient] || AMBIENT_RANGE.normal
    const k = ctx.power === "battery" ? 3 : ctx.power === "showoff" ? 0.6 : 1
    return (lo + rng.next() * (hi - lo)) * k
  }
  function idleFriends(p) { return pets.filter(q => q !== p && sameBar(p, q) && free(q) && !q.st.asleep) }
  function workingFriends(p) { return pets.filter(q => q !== p && sameBar(p, q) && q.st.loop && q.st.layer === "agent") }

  function chooseAmbient(p, now) {
    const per = p.personality || {}
    const idleFor = now - (p.st.lastActive || 0)
    const friends = idleFriends(p), working = workingFriends(p)
    const cand = []
    const cool = cat => (p.st.lastCategory === cat ? 0.35 : 1)
    cand.push({ cat: "micro", w: 1 * cool("micro") })
    cand.push({ cat: "habit", w: 1.3 * cool("habit") })
    cand.push({ cat: "bored", w: (0.4 + Math.min(1, idleFor / 120000)) * (1.1 - (per.sleepiness || 0.5)) * cool("bored") })
    const nightK = ctx.night ? 2 : 1
    cand.push({ cat: "rest", w: (per.sleepiness || 0.5) * nightK * (idleFor > 180000 ? 1.4 : 0.35) * cool("rest") })
    // the lazy ones doze while friends work
    if (working.length && (per.sleepiness || 0) >= 0.8) cand.push({ cat: "dozeWhileWorking", w: 3 })
    if (walking() && friends.length && now - lastSocialAt > SOCIAL_COOLDOWN && ambientCap() - activeAmbient() >= 1)
      cand.push({ cat: "social", w: (per.sociability || 0.5) * 1.6 + (per.mischief || 0) * 0.8 })
    if (roamOk(now) && now - (p.st.lastRoam || -Infinity) > ROAM_PET_GAP)
      cand.push({ cat: "roam", w: (0.5 + 0.9 * (per.energy || 0.5)) * (exploreOk(now) ? 1.4 : 1) })
    let total = 0
    for (const c of cand) total += c.w
    let r = rng.next() * total, pick = cand[0]
    for (const c of cand) { r -= c.w; if (r <= 0) { pick = c; break } }
    p.st.lastCategory = pick.cat
    switch (pick.cat) {
      case "habit": {
        const h = p.habits || {}
        const names = Object.keys(h)
        if (!names.length) return { action: "micro" }
        let t = 0
        for (const n of names) t += h[n]
        let x = rng.next() * t
        for (const n of names) { x -= h[n]; if (x <= 0) return { clip: n } }
        return { clip: names[0] }
      }
      case "dozeWhileWorking": return { clip: (p.habits && p.habits.hammockNap) ? "hammockNap" : "nodOff", ms: 20000 }
      case "social": return { social: true }
      case "roam": return { roam: true }
      default: return { action: pick.cat }
    }
  }

  function socialScene(p, now) {
    const per = p.personality || {}
    const friends = idleFriends(p)
    if (!friends.length) return null
    const friend = friends[Math.floor(rng.next() * friends.length)]
    const pair = [p.index, friend.index]
    const same = friends.filter(q => q.provider && q.provider === p.provider)
    const options = []
    // personality first: the mischievous prank, a lot
    if ((per.mischief || 0) >= 0.7) options.push(["prank", 10 * per.mischief * per.mischief])
    if (same.length) options.push(["syncDance", 2])
    options.push(["tagChase", 0.6 + (per.energy || 0.5)], ["leapfrog", 0.5 + (per.energy || 0.5)], ["catchBall", 1], ["whisper", 0.5 + (per.sociability || 0.5)], ["tugOfWar", 0.4 + (per.mischief || 0.5)])
    const working = workingFriends(p)
    if (working.length && (per.sociability || 0) >= 0.5) options.push(["cheerSquad", 1.5])
    let t = 0
    for (const o of options) t += o[1] * (o[0] === lastSocialName ? 0.3 : 1)
    let x = rng.next() * t, name = options[0][0]
    for (const o of options) { x -= o[1] * (o[0] === lastSocialName ? 0.3 : 1); if (x <= 0) { name = o[0]; break } }
    if (name === "syncDance") return SCENES.syncDance([p.index, ...same.map(q => q.index)])
    if (name === "cheerSquad") { const w = working[Math.floor(rng.next() * working.length)]; return SCENES.cheerSquad([p.index, w.index], place, w.index) }
    return SCENES[name](pair, place, rng)
  }

  // ---- the update
  function update(now) {
    lastNow = now
    let due = Infinity
    const date = new Date(now)
    const quiet = inQuiet(date)
    const ambientOn = !ctx.reduced && !ctx.still && !quiet && !ctx.fullscreen

    while (recentDone.length && now - recentDone[0].at > 4000) recentDone.shift()
    for (const ps of pendingScenes.slice()) {
      if (ps.at > now) { due = Math.min(due, ps.at); continue }
      pendingScenes.splice(pendingScenes.indexOf(ps), 1)
      const scene = ps.make()
      if (scene.pets.every(i => pets[i] && !pets[i].st.loop && !pets[i].st.scene)) startScene(scene, now, true)
    }

    due = Math.min(due, runScenes(now))

    for (const p of pets) {
      const s = p.st
      // one-shots run out
      if (s.oneShot && now >= s.busyUntil) { s.oneShot = false; s.layer = s.loop ? "agent" : ""; s.action = "" }

      // agent layer: queued one-shots, then the session's sustained state
      const prim = sessions.primary(p.id)
      const loopAction = stateAction(prim, now)
      const agentBusy = s.oneShot && s.layer === "agent"
      if (s.queue.length && !agentBusy) {
        const a = s.queue.shift()
        play(p, "agent", a, true)
        if (s.loop && s.loop.indexOf("needs") === 0) unpoint(p)
        s.loop = null
        if (a.indexOf("done") === 0 && walking()) afterCelebration(p, a, now)
        if (a === "session.end") { s.asleep = true; emit({ pet: p.index, awake: false }) }
      } else if (!agentBusy && now >= s.interactUntil) {
        if (loopAction) {
          if (s.loop !== loopAction || s.resumeLoop || s.oneShot) {
            s.resumeLoop = false
            const wasNeeds = !!s.loop && s.loop.indexOf("needs") === 0, needs = loopAction.indexOf("needs") === 0
            // answered (needs → working): the others stop pointing; still
            // waiting (needs.0 → needs.30s): they keep pointing
            if (wasNeeds && !needs) unpoint(p)
            s.loop = loopAction
            abortScene(p)
            play(p, "agent", loopAction, false)
            if (needs && !wasNeeds) pointAt(p)
          }
        } else if (s.loop) {
          if (s.loop.indexOf("needs") === 0) unpoint(p)
          s.loop = null
          restPet(p)
        }
      }
      if (s.oneShot) due = Math.min(due, s.busyUntil)
      due = Math.min(due, nextEscalation(prim, now))
      if (s.queue.length) due = Math.min(due, now + 50)
      syncClones(p)
      if (s.hatch === "back") due = Math.min(due, s.hatchUntil + 1)

      if (s.loop || s.oneShot || s.scene || now < s.interactUntil) { if (now < s.interactUntil) due = Math.min(due, s.interactUntil); continue }

      // sleep: the user is away, quiet hours, or nothing has happened for a while
      const dozeAfter = DOZE_MS[ctx.power] || DOZE_MS.balanced
      if (ctx.userIdle || quiet || ctx.fullscreen) { if (!s.asleep) sleepPet(p); continue }
      if (!s.asleep && s.lastActive && now - s.lastActive > dozeAfter) {
        // nod off first (when the attention cap allows), then sleep for good
        if (!s.dozed && ambientOn && activeAmbient() < ambientCap()) { s.dozed = true; play(p, "ambient", "rest", true) } else sleepPet(p, true)
        continue
      }
      if (s.asleep) {
        // a nap ends by itself, when the attention cap allows (else a little later)
        if (s.sleepUntil && now >= s.sleepUntil) {
          if (activeAmbient() < ambientCap()) { s.lastActive = now; s.sleepUntil = 0; wakePet(p); s.layer = "ambient"; s.oneShot = true; s.busyUntil = now + opts.clipMs("wake") }
          else s.sleepUntil = now + 4000 + rng.next() * 4000
          continue
        }
        if (s.sleepUntil) due = Math.min(due, s.sleepUntil)
        continue
      }
      if (!s.lastActive) s.lastActive = now
      due = Math.min(due, s.lastActive + dozeAfter + 1)

      // context: media, low battery, plugged in, mornings and nights
      if (s.ctxOneShot) { play(p, "context", s.ctxOneShot, true); s.ctxOneShot = ""; continue }
      if (!ctx.reduced && (ctx.media || ctx.batteryLow) && now >= s.nextCtx && activeAmbient() < ambientCap()) {
        play(p, "context", ctx.batteryLow ? "battery.low" : "media", true, 12000)
        s.nextCtx = now + 45000 + rng.next() * 30000
        continue
      }
      if (ctx.media || ctx.batteryLow) due = Math.min(due, s.nextCtx)

      // ambient, under the global attention cap
      if (!ambientOn) continue
      if (!s.nextAmbient) s.nextAmbient = now + nextAmbientDelay() * (0.3 + 0.7 * rng.next())
      if (now >= s.nextAmbient) {
        if (activeAmbient() < ambientCap()) {
          const pick = chooseAmbient(p, now)
          s.nextAmbient = now + nextAmbientDelay()
          if (pick.social) {
            const scene = socialScene(p, now)
            if (!(scene && startScene(scene, now))) play(p, "ambient", "micro", true)
          } else if (pick.roam) {
            if (!startTrip(p, now)) play(p, "ambient", "micro", true)
          } else if (pick.clip) play(p, "ambient", pick.clip, true, pick.ms)
          else play(p, "ambient", pick.action, true)
        } else s.nextAmbient = now + 3000 + rng.next() * 4000
      }
      due = Math.min(due, s.nextAmbient)
    }
    // whatever started in this update ends (or wakes) at a known time
    for (const p of pets) {
      if (p.st.oneShot && p.st.busyUntil > now) due = Math.min(due, p.st.busyUntil)
      if (p.st.asleep && p.st.sleepUntil) due = Math.min(due, p.st.sleepUntil)
    }
    // scenes started during this update: their first steps are due too
    for (const sc of scenes) if (sc.next < sc.scene.steps.length) due = Math.min(due, sc.start + sc.scene.steps[sc.next].at)
    if (wakeAt <= now) wakeAt = Infinity
    const out = commands
    commands = []
    return { commands: out, due: Math.min(due, wakeAt) }
  }

  // ---- trips: the shell plans them (it knows the bar and the windows)
  function tripKind(p) {
    const per = p.personality || {}
    const kinds = [["stroll", 1], ["perch", 0.8 + 0.5 * (1 - (per.energy || 0.5))], ["zoomies", 1.2 * (per.energy || 0.5)]]
    let t = 0
    for (const k of kinds) t += k[1]
    let x = rng.next() * t
    for (const k of kinds) { x -= k[1]; if (x <= 0) return k[0] }
    return "stroll"
  }
  function startTrip(p, now, kind) {
    let scene = null
    if (!kind && exploreOk(now) && rng.next() < 0.5) { scene = opts.planRoam(p.index, "explore", rng); if (scene) lastExploreAt = now }
    if (!scene) scene = opts.planRoam(p.index, kind || tripKind(p), rng)
    if (!scene || !startScene(scene, now, !!kind)) return false
    emit({ pet: p.index, tripStart: scene })
    lastRoamAt = now
    p.st.lastRoam = now
    return true
  }
  // The shell swaps a running trip for another (a parachute when the window
  // under an exploring pet moves) without sending the pet home first.
  function replaceTrip(index, scene, now) {
    lastNow = now
    const p = pets[index]
    if (!p || !scene) return false
    const s = p.st.scene
    if (s) { scenes = scenes.filter(x => x !== s); p.st.scene = null }
    wakeAt = 0
    if (!startScene(scene, now, true)) return false
    emit({ pet: index, tripStart: scene })
    return true
  }
  // The shell ends a trip itself (it sends the pet home on its own).
  function cancelTrip(index) {
    const p = pets[index]
    const s = p ? p.st.scene : null
    if (!s) return false
    scenes = scenes.filter(x => x !== s)
    for (const i of s.scene.pets) if (pets[i]) { pets[i].st.scene = null; pets[i].st.layer = "" }
    wakeAt = 0
    return true
  }
  // After a fling: dizzy (or not) where it landed, then a walk home.
  function walkHome(index, scene, now) {
    lastNow = now
    const p = pets[index]
    if (!p || !scene || p.st.loop) return false
    wakeAt = 0
    if (!startScene(scene, now, true)) return false
    emit({ pet: index, tripStart: scene })
    return true
  }

  // others point at a pet that needs you (idle ones only)
  function pointAt(p) {
    if (!settings.social) return
    for (const step of pointSteps(pets.filter(q => q !== p && sameBar(p, q) && free(q) && !q.st.asleep).map(q => q.index), p.index)) {
      const q = pets[step.pet]
      q.st.pointing = p.index
      q.st.layer = "social"
      emit({ pet: step.pet, clip: step.clip })
      q.st.oneShot = true
      q.st.busyUntil = Infinity
    }
  }
  function unpoint(p) {
    for (const q of pets) if (q.st.pointing === p.index) { q.st.pointing = undefined; q.st.oneShot = false; q.st.busyUntil = 0; restPet(q) }
  }

  // after a big celebration: a conga (long tasks) or a tidy-up (Ember's habit)
  function afterCelebration(p, action, now) {
    const friends = idleFriends(p)
    if (!friends.length) return
    if (action === "done.long" && friends.length >= 1) {
      const scene = SCENES.conga([p.index, ...friends.map(q => q.index)], place, rng, p.index)
      for (const step of scene.steps) step.at += opts.clipMs("done.long")
      startScene(scene, now, true)
      p.st.scene = null
      return
    }
    const tidy = friends.find(q => q.habits && q.habits.tidyUp)
    if (tidy && (action === "done.medium" || action === "done.long")) {
      const scene = SCENES.tidyAfter([tidy.index], place, rng, p.index)
      for (const step of scene.steps) step.at += 2200
      startScene(scene, now)
    }
  }

  // night: everyone idle piles up for a nap; morning: carried home
  function napPile(now) {
    // the bar with the most idle pets piles up
    const groups = {}
    for (const q of pets) if (free(q)) (groups[q.group || 0] = groups[q.group || 0] || []).push(q)
    const idle = Object.values(groups).sort((a, b) => b.length - a.length)[0] || []
    if (idle.length < 2) return false
    return startScene(SCENES.napPile(idle.map(q => q.index), place), now)
  }
  function endNapPile(now) {
    const s = scenes.find(x => x.scene.name === "napPile")
    if (!s) return false
    scenes = scenes.filter(x => x !== s)
    for (const i of s.scene.pets) if (pets[i]) pets[i].st.scene = null
    return startScene(SCENES.carryHome(s.scene.pets, place, rng, s.scene.home), now, true)
  }

  // demos and the IPC: a trip of a given kind now (when roaming allows one)
  function tripNow(index, kind, now) {
    lastNow = now
    const p = pets[index]
    if (!p || !free(p) || tripping()) return false
    const ok = startTrip(p, now, kind)
    wakeAt = 0
    return ok
  }

  function startSceneByName(name, list, now, extra) {
    const f = SCENES[name]
    if (!f) return false
    return startScene(f(list, place, rng, extra), now, true)
  }

  function describe(index) {
    const p = pets[index]
    if (!p) return null
    const prim = sessions.primary(p.id)
    return { layer: p.st.layer, action: p.st.action, loop: p.st.loop, asleep: p.st.asleep, sessions: sessions.count(p.id),
             state: prim ? prim.state : "idle", tool: prim ? prim.tool : "", since: prim ? prim.since : 0, clones: p.st.clones.length,
             scene: p.st.scene ? p.st.scene.scene.name : "", cwd: prim && prim.cwd ? prim.cwd : "" }
  }

  function gc(now, alive) {
    lastNow = now
    const gone = sessions.gc(now, alive)
    for (const g of gone) { const p = pets.find(q => q.id === g.pet); if (p) syncClones(p) }
    return gone
  }

  // The process chain of the session a click should focus (its primary one).
  function focusChain(index) {
    const p = pets[index]
    const s = p ? sessions.primary(p.id) : null
    return s ? (s.chain && s.chain.length ? s.chain : (s.pid ? [s.pid] : [])) : []
  }

  return { setPets, setSettings, setContext, event, interact, update, focusChain, gc, napPile, endNapPile, startSceneByName, describe, sessions,
           tripNow, replaceTrip, cancelTrip, walkHome, tripping,
           takeNotes() { const n = notes; notes = []; return n },
           get pets() { return pets } }
}
