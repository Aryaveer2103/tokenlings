import { test } from "node:test"
import assert from "node:assert/strict"
import { createBrain, MAX_CLONES } from "../core/brain.mjs"
import { createSessions, stateAction, doneAction } from "../core/sessions.mjs"
import { SCENES } from "../core/social.mjs"
import { CLIPS, ACTIONS } from "../clips/index.mjs"
import { compile } from "../core/clips.mjs"
import { FORMS } from "../forms/forms.mjs"
import * as Progression from "../core/progression.mjs"

const clipMs = name => (CLIPS[name] ? compile(name, CLIPS).duration : 1500)
const isClip = name => !!CLIPS[name]
const isAction = name => !!ACTIONS[name]
const form = n => ({ id: n, provider: n, personality: FORMS[n].personality, habits: FORMS[n].habits, moves: FORMS[n].moves })

function brainWith(names, opts) {
  const b = createBrain(Object.assign({ seed: 11, clipMs, isAction }, opts))
  b.setPets(names.map(form), { spacing: 34 })
  return b
}
function run(b, from, to, step) {
  const out = []
  let now = from
  while (now <= to) {
    const r = b.update(now)
    for (const c of r.commands) out.push(Object.assign({ t: now }, c))
    now = Math.max(now + (step || 50), Math.min(r.due, to + 1))
  }
  return out
}
const ev = (pet, event, at, extra) => Object.assign({ pet, session: "s1", event, at }, extra || {})

test("sessions: state follows events; needs escalates; turns are timed", () => {
  const s = createSessions()
  s.apply(ev("a", "session.start", 0))
  s.apply(ev("a", "prompt", 1000))
  assert.equal(stateAction(s.primary("a"), 2000), "thinking")
  assert.equal(stateAction(s.primary("a"), 30000), "thinking.long")
  s.apply(ev("a", "tool.start", 31000, { tool: "edit" }))
  assert.equal(stateAction(s.primary("a"), 31500), "tool.edit")
  s.apply(ev("a", "tool.start", 32000, { tool: "shell" }))
  s.apply(ev("a", "tool.start", 33000, { tool: "read" }))
  assert.equal(stateAction(s.primary("a"), 33500), "busy")
  s.apply(ev("a", "needs", 40000))
  assert.equal(stateAction(s.primary("a"), 41000), "needs.0")
  assert.equal(stateAction(s.primary("a"), 40000 + 31000), "needs.30s")
  assert.equal(stateAction(s.primary("a"), 40000 + 121000), "needs.2m")
  assert.equal(stateAction(s.primary("a"), 40000 + 601000), "needs.10m")
  s.apply(ev("a", "needs.end", 700000))
  const done = s.apply(ev("a", "turn.end", 720000))
  assert.equal(done.turn.ms, 719000)
  assert.equal(doneAction(30000, 1), "done.short")
  assert.equal(doneAction(5 * 60000, 2), "done.medium")
  assert.equal(doneAction(20 * 60000, 3), "done.long")
  assert.equal(doneAction(5000, 5), "done.streak")
})

test("sessions are collected on end, on a dead pid, and after 30 min of silence", () => {
  const s = createSessions()
  s.apply(ev("a", "session.start", 0, { session: "x", pid: 100 }))
  s.apply(ev("a", "session.start", 0, { session: "y", pid: 200 }))
  s.apply(ev("a", "session.start", 0, { session: "z" }))
  assert.equal(s.count("a"), 3)
  s.gc(1000, pid => pid !== 100)
  assert.equal(s.count("a"), 2)
  s.apply(ev("a", "session.end", 2000, { session: "y" }))
  assert.equal(s.count("a"), 1)
  s.gc(31 * 60000 + 1, () => true)
  assert.equal(s.count("a"), 0)
})

test("agent events drive the pet: start → think → tool → needs → done → end", () => {
  const b = brainWith(["ember"])
  const actions = []
  const step = (t, e) => { if (e) b.event(e, t); for (const c of b.update(t).commands) if (c.action || c.clip) actions.push(c.action || c.clip) }
  step(0, ev("ember", "session.start", 0)); step(3000)
  step(3100, ev("ember", "prompt", 3100)); step(4000)
  step(5000, ev("ember", "tool.start", 5000, { tool: "edit" })); step(6000)
  step(7000, ev("ember", "needs", 7000)); step(8000)
  step(9000, ev("ember", "needs.end", 9000)); step(9100, ev("ember", "turn.end", 9100)); step(12000)
  step(13000, ev("ember", "session.end", 13000)); step(14000)
  for (const a of ["session.start", "prompt", "thinking", "tool.edit", "needs.0", "done.short", "session.end"]) assert.ok(actions.includes(a), a + " in " + actions.join(","))
  assert.ok(actions.indexOf("prompt") < actions.indexOf("tool.edit"))
})

test("agent preempts ambient; ambient resumes later", () => {
  const b = brainWith(["ember", "slate"])
  run(b, 0, 200000, 1000)
  b.event(ev("ember", "prompt", 200000), 200000)
  const r = b.update(200001)
  assert.ok(r.commands.some(c => c.pet === 0 && c.action === "prompt"))
  b.event(ev("ember", "turn.end", 205000), 205000)
  const later = run(b, 205000, 500000, 1000)
  assert.ok(later.some(c => c.pet === 0 && (c.clip || (c.action && !c.action.startsWith("done"))) ), "ember does something idle again")
})

test("the global attention cap: never two ambient pets at once (Balanced)", () => {
  const b = brainWith(["ember", "slate", "prism", "jinx", "lyra"], { clipMs: () => 4000 })
  b.setSettings({ social: false, ambient: "lively" })
  let now = 0, maxBusy = 0
  const busyUntil = {}
  while (now < 30 * 60000) {
    const r = b.update(now)
    for (const c of r.commands) if ((c.action || c.clip) && c.action !== "asleep.still" && c.action !== "wake") busyUntil[c.pet] = now + 4000
    maxBusy = Math.max(maxBusy, Object.values(busyUntil).filter(t => t > now).length)
    now = Math.max(now + 100, Math.min(r.due, now + 60000))
  }
  assert.ok(maxBusy <= 1, `${maxBusy} at once`)
})

test("a 30 min seeded soak is alive but calm, and repeats exactly", () => {
  const soak = seed => {
    const b = createBrain({ seed, clipMs, isAction })
    b.setPets(["ember", "slate", "jinx"].map(form), { spacing: 34 })
    return run(b, 0, 30 * 60000, 200).filter(c => c.action || c.clip).map(c => [Math.round(c.t / 1000), c.pet, c.action || c.clip])
  }
  const a = soak(7), again = soak(7)
  assert.deepEqual(a, again)
  const perMin = a.length / 30
  assert.ok(perMin > 0.5 && perMin < 12, `${perMin.toFixed(1)} plays a minute`)
  // they doze after 10 quiet minutes and nap a while: a long silent stretch
  for (let pet = 0; pet < 3; pet++) {
    const times = a.filter(x => x[1] === pet).map(x => x[0])
    let gap = 0
    for (let i = 1; i < times.length; i++) gap = Math.max(gap, times[i] - times[i - 1])
    assert.ok(gap >= 5 * 60, `pet ${pet}: longest nap ${gap} s`)
  }
})

test("idle users and quiet hours put everyone to sleep (and nothing is due)", () => {
  const b = brainWith(["ember", "slate"])
  run(b, 0, 10000)
  b.setContext({ userIdle: true })
  const r = run(b, 10000, 20000)
  assert.ok(r.some(c => c.action === "asleep.still"))
  const r2 = b.update(30000)
  assert.equal(r2.commands.length, 0)
  assert.equal(r2.due, Infinity)
})

test("Prism dozes while friends work; Jinx pranks; Ember tidies after a celebration", () => {
  const b = brainWith(["prism", "ember", "jinx"])
  b.event(ev("ember", "prompt", 0), 0)
  b.event(ev("ember", "tool.start", 100, { tool: "edit" }), 100)
  const out = run(b, 200, 15 * 60000, 500)
  assert.ok(out.some(c => c.pet === 0 && (c.clip === "hammockNap" || c.clip === "nodOff")), "prism dozes")
  const b2 = brainWith(["jinx", "slate"])
  b2.setSettings({ ambient: "lively" })
  const out2 = []
  for (let m = 0; m < 40; m += 5) { b2.interact(1, 10, m * 60000); out2.push(...run(b2, m * 60000, (m + 5) * 60000 - 1, 500)) }
  assert.ok(out2.some(c => c.pet === 0 && (c.clip === "sneakRight" || c.clip === "sneakLeft")), "jinx pranks")
  const b3 = brainWith(["slate", "ember"])
  b3.event(ev("slate", "prompt", 0), 0)
  b3.update(10)
  b3.event(ev("slate", "turn.end", 5 * 60000), 5 * 60000)
  const out3 = run(b3, 5 * 60000, 5 * 60000 + 20000, 100)
  assert.ok(out3.some(c => c.pet === 1 && c.clip === "tidyUp"), "ember tidies")
})

test("two pets finishing within 4 s high-five", () => {
  const b = brainWith(["ember", "slate"])
  b.event(ev("ember", "prompt", 0), 0); b.event(ev("slate", "prompt", 0), 0)
  b.update(10)
  b.event(ev("ember", "turn.end", 30000), 30000)
  b.event(ev("slate", "turn.end", 32000), 32000)
  const out = run(b, 32000, 45000, 100)
  assert.ok(out.some(c => c.clip === "highFiveLeft") && out.some(c => c.clip === "highFiveRight"))
})

test("when one pet needs you, the idle others point at it", () => {
  const b = brainWith(["ember", "slate", "jinx"])
  b.update(0)
  b.event(ev("slate", "needs", 1000), 1000)
  const r = b.update(1001)
  assert.ok(r.commands.some(c => c.pet === 0 && c.clip === "pointRight"))
  assert.ok(r.commands.some(c => c.pet === 2 && c.clip === "pointLeft"))
  b.event(ev("slate", "needs.end", 5000), 5000)
  const r2 = b.update(5001)
  assert.ok(r2.commands.some(c => c.pet === 0 && c.rest))
  // a turn that ends straight out of needs-you stops the pointing too
  b.event(ev("slate", "needs", 6000), 6000)
  b.update(6001)
  b.event(ev("slate", "turn.end", 7000), 7000)
  const r3 = b.update(7001)
  assert.ok(r3.commands.some(c => c.pet === 2 && c.rest))
})

test("several sessions on one account show as up to three shadow clones", () => {
  const b = brainWith(["ember"])
  for (let i = 0; i < 5; i++) b.event(ev("ember", "prompt", i, { session: "s" + i }), i)
  b.event(ev("ember", "tool.start", 10, { session: "s2", tool: "shell" }), 10)
  const r = b.update(20)
  const clones = r.commands.filter(c => c.clones).pop()
  assert.ok(clones && clones.clones.length === MAX_CLONES)
})

test("a subagent hatches a mini-me that comes back with a box", () => {
  const b = brainWith(["ember"])
  b.event(ev("ember", "subagent.start", 0), 0)
  let r = b.update(1)
  assert.ok(r.commands.some(c => c.clones && c.clones.some(k => k.action === "hatchOut")))
  b.event(ev("ember", "subagent.stop", 5000), 5000)
  r = b.update(5001)
  assert.ok(r.commands.some(c => c.clones && c.clones.some(k => k.action === "hatchBack")))
  r = b.update(8000)
  assert.ok(r.commands.some(c => c.clones && c.clones.length === 0))
})

test("every scene ends with everyone home and uses only existing clips", () => {
  const rng = { next: () => 0.3 }
  const scenes = [SCENES.highFive([0, 2], 34), SCENES.cheerSquad([0, 1, 2], 34, 1), SCENES.tagChase([0, 1], 34), SCENES.leapfrog([2, 0], 34),
                  SCENES.catchBall([0, 1], 34), SCENES.tugOfWar([0, 1], 34, rng), SCENES.whisper([1, 0], 34), SCENES.conga([0, 1, 2], 34, rng, 1),
                  SCENES.batonHandoff([0, 2], 34), SCENES.syncDance([0, 1]), SCENES.prank([2, 0], 34), SCENES.tidyAfter([0], 34, rng, 2),
                  SCENES.carryHome([0, 1, 2], 34, rng, SCENES.napPile([0, 1, 2], 34).home)]
  for (const s of scenes) {
    const last = {}
    for (const st of s.steps) {
      if (st.clip) assert.ok(CLIPS[st.clip], `${s.name}: ${st.clip}`)
      if (st.action) assert.ok(ACTIONS[st.action], `${s.name}: ${st.action}`)
      if (st.offset) last[st.pet] = st.offset.x
    }
    for (const [p, x] of Object.entries(last)) assert.equal(x, 0, `${s.name}: pet ${p} ends at ${x}`)
  }
})

test("progression: xp, levels, unlocks, streaks; stats.json is read defensively", () => {
  let s = Progression.emptyStats(), up = []
  for (let i = 0; i < 40; i++) { const r = Progression.recordTurn(s, 5 * 60000, i * 60000, false); s = r.stats; if (r.levelUp) up.push(r.levelUp) }
  assert.ok(s.level >= 5, `level ${s.level}`)
  assert.equal(s.turns, 40)
  assert.equal(s.streak, 40)
  assert.ok(up.includes(5))
  s = Progression.recordTurn(s, 1000, 41 * 60000, true).stats
  assert.equal(s.streak, 0)
  assert.equal(Progression.recordTurn(s, 1000, 41 * 60000 + Progression.STREAK_GAP_MS + 1, false).stats.streak, 1)
  const loaded = Progression.load(JSON.stringify({ version: 1, pets: { ok: { xp: 500, turns: -3, streak: "x" }, "Bad Id": { xp: 1 } } }))
  assert.deepEqual(Object.keys(loaded.pets), ["ok"])
  assert.equal(loaded.pets.ok.turns, 0)
  assert.equal(loaded.pets.ok.level, Progression.levelFor(500))
  assert.deepEqual(Progression.load("{nope").pets, {})
  assert.deepEqual(Progression.load("x".repeat(Progression.MAX_BYTES + 1)).pets, {})
})

test("at night, stepping away piles everyone up for a nap; coming back carries the top one home", () => {
  const b = brainWith(["ember", "slate", "jinx"])
  b.update(0)
  b.setContext({ night: true })
  run(b, 0, 3000)
  b.setContext({ userIdle: true })
  const pile = run(b, 3000, 10000, 100)
  assert.ok(pile.some(c => c.clip === "napOnTop"))
  assert.ok(pile.some(c => c.clip === "napLeanRight") || pile.some(c => c.clip === "napLeanLeft"))
  b.setContext({ userIdle: false })
  const home = run(b, 10000, 20000, 100)
  assert.ok(home.some(c => c.clip === "carry") && home.some(c => c.clip === "carried"))
})

test("trips: sparse, one at a time, never on battery, in Still or with roaming at home; agents cut them short", async () => {
  const { planBarRoam, planExcursion } = await import("../core/roam.mjs")
  const bar = { unit: 0.875, home: 1060, lo: 14, hi: 1266, obstacles: [[700, 820]], pillLift: 0, arcRoom: 4.5 }
  const desk = { unit: 0.875, home: { x: 1060, y: 32 }, area: { x: 0, y: 0, w: 1280, h: 720 }, edge: "top", sizePx: 28, windows: [{ id: "w", x: 646, y: 46, w: 612, h: 664, focused: true }] }
  const planned = []
  const planRoam = (i, kind, rng) => { planned.push(kind); return kind === "explore" ? planExcursion(Object.assign({ pet: i }, desk), rng) : planBarRoam(kind, Object.assign({ pet: i }, bar), rng) }
  const b = brainWith(["ember", "slate", "prism"], { planRoam })
  b.setSettings({ roaming: "bar" })
  // the first 10 minutes (after that, with nothing happening, they doze off)
  const out = run(b, 0, 10 * 60000, 200)
  for (const k of planned) assert.ok(["stroll", "perch", "zoomies"].includes(k), k)
  const done = out.filter(c => c.tripDone)
  assert.ok(done.length >= 2, `trips in 10 min: ${done.length}`)
  assert.ok(done.length <= 12, `trips in 10 min: ${done.length}`)
  // never two pets away at once: between a trip's first offset and its tripDone no other pet starts one
  const away = new Map()
  for (const c of out) {
    if (c.offset && c.offset.ease === "linear") { away.set(c.pet, true); assert.ok([...away.keys()].length === 1, `two out at ${c.t}`) }
    if (c.tripDone) away.delete(c.pet)
  }
  // desktop: explore planned sometimes; on battery or in Still or at home: no trips
  planned.length = 0
  const d = brainWith(["ember", "slate"], { planRoam })
  d.setSettings({ roaming: "desktop" })
  run(d, 0, 40 * 60000, 250)
  assert.ok(planned.includes("explore"))
  for (const [setting, ctx] of [["home", {}], ["bar", { power: "battery", onBattery: true }], ["bar", { still: true, power: "still" }], ["desktop", { onBattery: true, power: "battery" }]]) {
    planned.length = 0
    const q = brainWith(["ember", "slate"], { planRoam })
    q.setSettings({ roaming: setting })
    q.setContext(ctx)
    const r = run(q, 0, 20 * 60000, 250)
    assert.equal(r.filter(c => c.tripDone).length, 0, `${setting} ${JSON.stringify(ctx)}`)
  }
  // an agent event mid-trip: the pet goes home at once
  const e = brainWith(["ember"], { planRoam })
  e.setSettings({ roaming: "bar" })
  e.update(1000)
  assert.ok(e.tripNow(0, "stroll", 1000))
  run(e, 1000, 3000, 100)
  e.event(ev("ember", "session.start", 3100), 3100)
  const after = run(e, 3100, 3300, 50)
  assert.ok(after.some(c => c.goHome === "roam.stroll"))
  assert.equal(e.tripping(), false)
})

test("pointing stops when the needy pet's request is answered and it goes back to work", () => {
  const b = brainWith(["ember", "slate"])
  b.event(ev("ember", "session.start", 0), 0)
  b.event(ev("ember", "prompt", 100), 100)
  b.event(ev("ember", "needs", 3000), 3000)
  const a = run(b, 3000, 9000, 50)
  assert.ok(a.some(c => c.pet === 1 && /^point/.test(c.clip || "")), "slate points")
  b.event(ev("ember", "tool.start", 9100, { tool: "shell" }), 9100)
  const after = run(b, 9100, 10000, 50)
  assert.ok(after.some(c => c.pet === 1 && c.rest), "slate stops pointing")
  assert.notEqual(b.describe(1).layer, "social")
})

test("vertical bars: no walking scenes and no trips, but pointing still works", () => {
  const b = brainWith(["ember", "slate", "prism"], { planRoam: () => ({ name: "roam.stroll", pets: [0], steps: [], duration: 1 }) })
  b.setSettings({ roaming: "bar" })
  b.setContext({ vertical: true })
  const out = run(b, 0, 15 * 60000, 250)
  assert.equal(out.filter(c => c.offset || c.tripStart).length, 0)
  const v = brainWith(["ember", "slate", "prism"])
  v.setContext({ vertical: true })
  v.event(ev("ember", "session.start", 100), 100)
  v.event(ev("ember", "needs", 200), 200)
  const p = run(v, 200, 9000, 50)
  assert.ok(p.some(c => /^point/.test(c.clip || "")))
})

test("notes for notifications come with the event, once per wait, even with no update", () => {
  const b = brainWith(["ember"])
  b.event(ev("ember", "session.start", 0), 0)
  b.event(ev("ember", "needs", 100), 100)
  b.event(ev("ember", "needs", 200), 200)
  assert.deepEqual(b.takeNotes(), [{ pet: 0, what: "needs" }])
  b.event(ev("ember", "needs.end", 300), 300)
  b.event(ev("ember", "needs", 400), 400)
  assert.deepEqual(b.takeNotes(), [{ pet: 0, what: "needs" }])
  b.event(ev("ember", "prompt", 1000), 1000)
  b.event(ev("ember", "turn.end", 1000 + 5 * 60000), 1000 + 5 * 60000)
  assert.deepEqual(b.takeNotes(), [{ pet: 0, what: "done" }])
  assert.deepEqual(b.takeNotes(), [])
})

test("usage events animate the pet but are not a session", () => {
  const s = createSessions()
  const out = s.apply(ev("a", "usage.exhausted", 0, { session: "usage" }))
  assert.equal(out.kind, "usage.exhausted")
  assert.equal(s.count("a"), 0)
  const b = brainWith(["ember"])
  b.update(0)
  b.event({ pet: "ember", session: "usage", event: "usage.reset", at: 100 }, 100)
  const cmds = run(b, 100, 2000)
  assert.ok(cmds.some(c => c.pet === 0 && (c.action === "usage.reset" || c.clip === "usageReset" || c.clip === "usageResetB")), "the reset plays")
  assert.equal(b.describe(0).sessions, 0)
})
