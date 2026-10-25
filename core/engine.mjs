// The animation engine: everything that moves, as plain JS (unit-tested; the
// QML side only copies the values it returns onto rigs and the FX pool).
//
// Per pet: one playing clip (blended in from wherever the pet was), the eyes
// system (blinks, saccades, look-at), a damped spring on the topper, and its
// share of the FX pool. tick(now) returns only what changed, plus when the
// next visible change is due; with nothing due it returns Infinity and the
// shell's clock sleeps (zero frames at rest).
import { NEUTRAL, SWAP_DEFAULTS, CHANNELS, SWAPS, compileAll, sampleTrack, localTime, nextChange, swapsAt, fxBetween } from "./clips.mjs"
import * as Rng from "./rng.mjs"

export const BLEND_MS = 110          // every clip blends in from the current pose
export const FX_POOL = 16
const EPS = { rot: 0.3, armL: 0.5, armR: 0.5, topRot: 0.4, propRot: 0.5, alpha: 0.02, blink: 0.04, sx: 0.006, sy: 0.006, shadow: 0.02, perch: 0.02 }
const POS_EPS = 0.05                 // grid units (≈ 0.05 px at bar size)

function eps(ch) { return EPS[ch] !== undefined ? EPS[ch] : POS_EPS }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }
function still(x, y) { return { x0: x, y0: y, x1: x, y1: y, start: 0, ms: 0, ease: "smooth", arc: 0 } }

// options: { clips (source library), seed, fps, reduced, still, maxParticles, sky, stepScale }
export function createEngine(options) {
  const opts = Object.assign({ seed: 1, fps: 24, reduced: false, still: false, maxParticles: FX_POOL, sky: 1, stepScale: 1 }, options || {})
  const clips = compileAll(opts.clips || {})
  const rng = Rng.create(opts.seed)
  let pets = []                      // per-pet state, index = rig index
  const pool = []                    // FX particles: null or { kind, pet, ... }
  for (let i = 0; i < FX_POOL; i++) pool.push(null)
  const poolDirty = new Set()
  let lastNow = 0

  const frameMs = () => Math.round(1000 / Math.max(1, opts.fps || 24))

  function newPet(def) {
    const values = Object.assign({}, NEUTRAL)
    return {
      id: def.id,
      def,
      values,                          // last written channel values
      swaps: Object.assign({}, SWAP_DEFAULTS),
      player: null,                    // { clip, start, speed, then, from, fromSwaps, lastLocal, tag }
      eyes: { awake: true, nextBlink: 0, blinkStart: -1, blinkKind: "single", nextSaccade: 0, sacX: 0, sacY: 0, lookX: 0, lookY: 0 },
      spring: { x: 0, v: 0, lastY: 0, lastT: 0, active: false },
      anchors: def.anchors || { head: [16, 10], hand: [24, 24], mouth: [16, 24], feet: [16, 30.6], eyes: [16, 20] },
      dirty: new Set(CHANNELS.concat(SWAPS)),
      held: null,
      restFrom: null,
      offset: still(0, 0),             // where the pet is away from its slot (grid units; y down)
      body: null                       // dragged or flying: { mode, x, y, vx, vy, ... } (see grab)
    }
  }

  // list: [{ id, personality, anchors, levitates }] — state survives for ids that stay.
  function setPets(list) {
    const byId = {}
    for (const p of pets) byId[p.id] = p
    pets = list.map(def => {
      const old = byId[def.id]
      if (old) { old.def = def; old.anchors = def.anchors || old.anchors; return old }
      return newPet(def)
    })
    for (let i = 0; i < pool.length; i++) if (pool[i] && pool[i].pet >= pets.length) { pool[i] = null; poolDirty.add(i) }
  }

  function personality(p) { return (p.def && p.def.personality) || { energy: 0.5, sociability: 0.5, mischief: 0.5, sleepiness: 0.5 } }

  // Energy sets the tempo of everything that is not locked to the step grid.
  function speedFor(p, clip) {
    if (clip.step > 0 || clip.agent) return 1
    return 0.82 + 0.4 * personality(p).energy
  }

  function poseOnly() { return opts.reduced || opts.still }

  // Play a clip. opts: { then: clipId to follow, speed, tag, fps (a lower
  // cap for this clip: ambient bits step at 12 fps on a shared grid) }
  function play(index, clipId, o) {
    const p = pets[index]
    const clip = clips[clipId]
    if (!p || !clip) return false
    const now = lastNow
    p.held = null
    p.restFrom = null
    p.player = {
      clip, start: now, speed: (o && o.speed) || speedFor(p, clip), then: (o && o.then) || null, tag: (o && o.tag) || clipId,
      from: Object.assign({}, p.values), lastLocal: -1, fps: (o && o.fps) || 0
    }
    // Swaps reset to defaults unless the clip sets them at its start.
    const base = Object.assign({}, SWAP_DEFAULTS, swapsAt(clip, 0))
    if (poseOnly() && clip.pose) for (const k of SWAPS) if (clip.pose[k] !== undefined) base[k] = clip.pose[k]
    for (const k of SWAPS) if (p.swaps[k] !== base[k]) { p.swaps[k] = base[k]; p.dirty.add(k) }
    p.spring.lastT = 0
    return true
  }

  // Back to the resting pose (blended).
  function rest(index) {
    const p = pets[index]
    if (!p) return
    p.player = null
    p.held = null
    p.restFrom = { from: Object.assign({}, p.values), start: lastNow }
    for (const k of SWAPS) if (p.swaps[k] !== SWAP_DEFAULTS[k]) { p.swaps[k] = SWAP_DEFAULTS[k]; p.dirty.add(k) }
  }

  // Snap everything to neutral, no blend, no particles (pause, hide, reload).
  function reset() {
    for (const p of pets) {
      p.player = null
      p.restFrom = null
      p.held = null
      for (const ch of CHANNELS) if (p.values[ch] !== NEUTRAL[ch]) { p.values[ch] = NEUTRAL[ch]; p.dirty.add(ch) }
      for (const k of SWAPS) if (p.swaps[k] !== SWAP_DEFAULTS[k]) { p.swaps[k] = SWAP_DEFAULTS[k]; p.dirty.add(k) }
      p.spring = { x: 0, v: 0, lastY: 0, lastT: 0, active: false }
      p.offset = still(0, 0)
      p.body = null
      p.eyes.blinkStart = -1
    }
    for (let i = 0; i < pool.length; i++) if (pool[i]) { pool[i] = null; poolDirty.add(i) }
  }

  function setAwake(index, awake) {
    const p = pets[index]
    if (!p) return
    p.eyes.awake = !!awake
    if (awake && p.eyes.nextBlink < lastNow) p.eyes.nextBlink = lastNow + 800 + rng.next() * 2500
  }

  // Look-at: x, y in -1..1 (−1 left / up). null returns the gaze to centre.
  function lookAt(index, x, y) {
    const p = pets[index]
    if (!p) return
    p.eyes.lookX = x === null || x === undefined ? 0 : clamp(x, -1, 1)
    p.eyes.lookY = y === null || y === undefined ? 0 : clamp(y, -1, 1)
    p.eyes.nextSaccade = lastNow          // apply now
    p.eyes.forced = true
  }

  // ---- offsets: where a pet is away from its slot (walks, scenes, roaming,
  // desktop trips), in grid units, y down. A tween from where the pet is now
  // to (x, y) over ms, eased (smooth | linear | in | out), optionally along an
  // arc `arc` units high (leaps).
  const EASES = { linear: k => k, in: k => k * k, out: k => k * (2 - k), smooth: k => k * k * (3 - 2 * k) }
  function offsetNow(p, now) {
    const o = p.offset
    if (!o.ms || now >= o.start + o.ms) return { x: o.x1, y: o.y1 }
    const k = Math.max(0, (now - o.start) / o.ms), e = (EASES[o.ease] || EASES.smooth)(k)
    return { x: o.x0 + (o.x1 - o.x0) * e, y: o.y0 + (o.y1 - o.y0) * e - (o.arc ? 4 * o.arc * k * (1 - k) : 0) }
  }
  // A plain walk moves on its walk cycle's grid (8 changes a second, each
  // step landing with a footfall) rather than every frame: trips stay cheap.
  function offsetGrid(p) {
    const c = p.player && p.player.clip, o = p.offset
    return c && c.loop && c.step >= 120 && o.ease === "linear" && !o.arc ? c.step * (opts.stepScale || 1) : 0
  }
  // o: { y, ease, arc } (y left out: stays where it is)
  function setOffset(index, x, ms, o) {
    const p = pets[index]
    if (!p) return
    const at = p.body ? { x: p.body.x, y: p.body.y } : offsetNow(p, lastNow)
    p.body = null
    const y = o && o.y !== undefined ? o.y : (p.offset.ms && lastNow < p.offset.start + p.offset.ms ? p.offset.y1 : at.y)
    p.offset = { x0: at.x, y0: at.y, x1: x, y1: y, start: lastNow, ms: ms || 0, ease: (o && o.ease) || "smooth", arc: (o && o.arc) || 0 }
  }
  function offsetOf(index) {
    const p = pets[index]
    if (!p) return { x: 0, y: 0 }
    return p.body ? { x: p.body.x, y: p.body.y } : offsetNow(p, lastNow)
  }

  // ---- drag and fling: the pointer holds the pet (it dangles like a
  // pendulum), then lets go; a flung pet flies ballistically, bounces off the
  // ends of the bar and the floor, rolls out and settles.
  //   bounds: { lo, hi } along the bar, ceil (≤ 0: room above the floor),
  //   floor 0. Units: grid units and seconds.
  const G = 420, FLOOR_BOUNCE = 0.38, WALL_BOUNCE = 0.55, ROLL = 4, MAX_SPEED = 900
  function grab(index) {
    const p = pets[index]
    if (!p) return
    const at = offsetOf(index)
    p.offset = still(at.x, at.y)
    p.body = { mode: "drag", x: at.x, y: at.y, vx: 0, vy: 0, trail: [[lastNow, at.x, at.y]], swing: 0, swingV: 0, lastT: lastNow, impact: 0, bounds: null }
  }
  function drag(index, x, y) {
    const p = pets[index]
    if (!p || !p.body || p.body.mode !== "drag") return
    const b = p.body
    b.x = x; b.y = y
    b.trail.push([lastNow, x, y])
    while (b.trail.length > 2 && lastNow - b.trail[0][0] > 120) b.trail.shift()
  }
  // Returns the release speed (grid units/s); the caller decides between a
  // gentle drop and a fling.
  function release(index, bounds) {
    const p = pets[index]
    if (!p || !p.body) return 0
    const b = p.body, t0 = b.trail[0], dt = Math.max(16, lastNow - t0[0]) / 1000
    b.vx = clamp((b.x - t0[1]) / dt, -MAX_SPEED, MAX_SPEED)
    b.vy = clamp((b.y - t0[2]) / dt, -MAX_SPEED, MAX_SPEED)
    if (b.vy < 0) b.vy *= opts.sky
    if (b.y > 0) b.vy = Math.min(b.vy, -Math.sqrt(2 * G * b.y))   // below the floor: it pops back up
    b.mode = "fly"
    b.bounds = Object.assign({ lo: -1e6, hi: 1e6, ceil: -1e6 }, bounds || {})
    b.lastT = lastNow
    b.impact = 0
    b.speed = Math.hypot(b.vx, b.vy)
    return b.speed
  }
  function bodyStep(p, now, events, index) {
    const b = p.body
    const span = clamp((now - b.lastT) / 1000, 0, 0.1)
    b.lastT = now
    if (b.mode === "drag") {
      // the pendulum: swings against the pointer's motion, damped
      const t0 = b.trail[0], dt = Math.max(16, now - t0[0]) / 1000
      const goal = clamp(-((b.x - t0[1]) / dt) * 0.12, -40, 40)
      for (let left = span; left > 1e-6; left -= 0.016) {
        const d = Math.min(0.016, left)
        b.swingV += (-90 * (b.swing - goal) - 7 * b.swingV) * d
        b.swing += b.swingV * d
      }
      return Math.abs(b.swingV) > 0.5 || Math.abs(b.swing - goal) > 0.3
    }
    const bd = b.bounds
    for (let left = span; left > 1e-6; left -= 0.008) {
      const d = Math.min(0.008, left)
      const grounded = b.y >= 0 && Math.abs(b.vy) < 1e-6
      if (!grounded) b.vy += G * d
      b.x += b.vx * d
      b.y += b.vy * d
      if (b.x < bd.lo || b.x > bd.hi) {
        b.x = clamp(b.x, bd.lo, bd.hi)
        if (Math.abs(b.vx) > 60) events.push({ pet: index, type: "bonk", speed: Math.abs(b.vx) })
        b.impact = Math.max(b.impact, Math.abs(b.vx))
        b.vx = -b.vx * WALL_BOUNCE
      }
      if (b.y < bd.ceil) { b.y = bd.ceil; b.vy = Math.abs(b.vy) * 0.3 }
      if (b.y >= 0 && b.vy > 0) {
        b.y = 0
        if (b.vy > 40) events.push({ pet: index, type: "landed", speed: b.vy })
        b.impact = Math.max(b.impact, b.vy)
        b.vy = b.vy > 40 ? -b.vy * FLOOR_BOUNCE : 0
        b.vx *= 0.82
      }
      if (b.y >= 0 && b.vy === 0) b.vx *= Math.exp(-ROLL * d)
    }
    b.swing = clamp(b.vx * 0.05, -25, 25)
    if (b.y >= 0 && b.vy === 0 && Math.abs(b.vx) < 2) {
      events.push({ pet: index, type: "settled", x: b.x, impact: b.impact, speed: b.speed })
      p.offset = still(b.x, 0)
      p.body = null
      return false
    }
    return true
  }

  function setMode(m) {
    Object.assign(opts, m || {})
    if (poseOnly()) for (let i = 0; i < pool.length; i++) if (pool[i]) { pool[i] = null; poolDirty.add(i) }
  }

  // ---- FX pool
  function anchorPoint(p, at) {
    if (Array.isArray(at)) return at
    return p.anchors[at || "head"] || p.anchors.head
  }
  function spawn(index, f, now) {
    if (poseOnly()) return
    const p = pets[index]
    const n = Math.max(1, f.n || 1)
    const cap = Math.min(FX_POOL, opts.maxParticles)
    // A fair share each when several pets burst at once (at least 2).
    const share = Math.max(2, Math.floor(cap / Math.max(1, pets.length)))
    for (let k = 0; k < n; k++) {
      let slot = -1, live = 0, mine = 0
      for (let i = 0; i < pool.length; i++) { if (pool[i]) { live++; if (pool[i].pet === index) mine++ } else if (slot === -1) slot = i }
      if (slot === -1 || live >= cap) return
      if (mine >= share) return
      const [ax, ay] = anchorPoint(p, f.at)
      const sp = f.spread || [0, 0], v = f.v || [0, 0], vs = f.vspread || [0, 0]
      const kind = f.kinds ? f.kinds[Math.floor(rng.next() * f.kinds.length)] : (f.kind || "sparkle")
      let vy = v[1] + (rng.next() * 2 - 1) * vs[1]
      if (vy < 0) vy *= opts.sky
      pool[slot] = {
        kind, pet: index, born: now, life: f.life || 900,
        x0: ax + (rng.next() * 2 - 1) * sp[0] + (p.values.x || 0), y0: ay + (rng.next() * 2 - 1) * sp[1] + (p.values.y || 0) + (p.values.lift || 0),
        vx: (v[0] + (rng.next() * 2 - 1) * vs[0]) * (f.mirror ? p.values.dir : 1), vy,
        g: f.g || 0, spin: (f.spin || 0) * (rng.next() < 0.5 ? -1 : 1), s0: (f.scale || 1) * (0.85 + rng.next() * 0.3),
        grow: f.grow || 0, x: 0, y: 0, rot: 0, s: 1, a: 1
      }
      poolDirty.add(slot)
    }
  }
  function stepPool(now) {
    let live = false
    for (let i = 0; i < pool.length; i++) {
      const q = pool[i]
      if (!q) continue
      const t = (now - q.born) / 1000, u = (now - q.born) / q.life
      if (u >= 1) { pool[i] = null; poolDirty.add(i); continue }
      live = true
      q.x = q.x0 + q.vx * t
      q.y = q.y0 + q.vy * t + 0.5 * q.g * t * t
      q.rot = q.spin * t
      q.s = q.s0 * (1 + q.grow * u) * (u < 0.12 ? 0.4 + 5 * u : 1)
      q.a = u > 0.7 ? (1 - u) / 0.3 : 1
      poolDirty.add(i)
    }
    return live
  }

  // ---- eyes: blinks (single, double, slow; stepped so a blink is 2–4
  // frames, the first one already a change), saccades (small snaps), look-at
  // targets. Idle blinks and glances fall on a shared beat, so pets that
  // blink close together change on the same frame, and a glance that would
  // come soon after (or just before) a blink rides along with its last frame.
  const BLINKS = {
    single: [[0, 0.1], [80, 1]],
    double: [[0, 0.1], [70, 1], [160, 0.1], [240, 1]],
    slow: [[0, 0.45], [80, 0.1], [260, 0.45], [350, 1]]
  }
  const BEAT = 1000
  const onBeat = t => Math.ceil(t / BEAT) * BEAT
  const GLANCE_RIDE = 3000
  function blinkValue(kind, t) {
    const ks = BLINKS[kind]
    let v = 1
    for (const [kt, kv] of ks) if (t >= kt) v = kv
    return v
  }
  function eyesStep(p, now, clipOwns) {
    const e = p.eyes, out = {}
    let due = Infinity
    // on a stepped loop a blink is one grid step closed, on the grid
    const grid = p.player && p.player.clip.step ? p.player.clip.step * (opts.stepScale || 1) : 0
    if (grid && e.blinkStart < 0 && e.nextBlink % grid) e.nextBlink = Math.ceil(e.nextBlink / grid) * grid
    else if (!grid && e.blinkStart < 0 && e.nextBlink % BEAT) e.nextBlink = onBeat(e.nextBlink)
    const sleepy = personality(p).sleepiness
    let glanceNow = false
    if (!e.awake || clipOwns.blink || p.swaps.eyes !== "open") {
      out.blink = clipOwns.blink ? undefined : 1
      e.blinkStart = -1
    } else {
      if (e.blinkStart < 0 && now >= e.nextBlink) {
        e.blinkStart = now
        const r = rng.next()
        e.blinkKind = r < 0.14 ? "double" : r < 0.14 + 0.25 * sleepy ? "slow" : "single"
      }
      if (e.blinkStart >= 0) {
        const ks = grid ? [[0, 0.1], [grid, 1]] : BLINKS[e.blinkKind]
        const t = now - e.blinkStart, end = ks[ks.length - 1][0]
        if (t >= end) {
          e.blinkStart = -1
          e.nextBlink = now + 2600 + rng.next() * (4200 + 2600 * (1 - sleepy))
          out.blink = 1
          // a glance due soon happens with the eyes reopening (one frame for both)
          if (e.nextSaccade - now < GLANCE_RIDE) glanceNow = true
        } else {
          out.blink = blinkValue(e.blinkKind, t)
          for (const [kt] of ks) if (kt > t) { due = e.blinkStart + kt; break }
        }
      }
      if (e.blinkStart < 0) due = Math.min(due, e.nextBlink)
    }
    // saccades only with the eyes open (no frames for a sleeping pet's gaze)
    const looking = e.awake && !poseOnly() && p.swaps.eyes === "open"
    if (!clipOwns.gazeX && !clipOwns.gazeY) {
      // a glance about to come due just before a blink waits for the blink
      const blinkSoon = e.awake && e.blinkStart < 0 && !clipOwns.blink && e.nextBlink - now < GLANCE_RIDE / 2 && e.nextBlink > now
      if (looking && now >= e.nextSaccade && blinkSoon && !e.forced) e.nextSaccade = e.nextBlink + 1
      else if (looking && (glanceNow || now >= e.nextSaccade)) {
        e.sacX = (rng.next() * 2 - 1) * 0.35
        e.sacY = (rng.next() * 2 - 1) * 0.2
        e.nextSaccade = onBeat(now + 2200 + rng.next() * 4800)
        e.forced = false
      }
      out.gazeX = clamp(e.lookX * 1.1 + (looking ? e.sacX : 0), -1.4, 1.4)
      out.gazeY = clamp(e.lookY * 0.8 + (looking ? e.sacY : 0), -1, 1)
      if (!clipOwns.faceX) out.faceX = e.lookX * 0.6
      if (!clipOwns.faceY) out.faceY = e.lookY * 0.35
      if (looking) due = Math.min(due, e.nextSaccade)
    }
    return { out, due }
  }

  // ---- the topper spring: lags behind vertical motion and leans, overshoots.
  function springStep(p, now, target, y, rot) {
    const s = p.spring
    if (!s.lastT) { s.lastT = now; s.lastY = y; s.x = target; return false }
    // integrated in small sub-steps, so sampling it sparsely (on a stepped
    // loop's grid) still moves it like a real spring
    const span = clamp((now - s.lastT) / 1000, 0.001, 0.5)
    const vy = (y - s.lastY) / span
    s.lastT = now; s.lastY = y
    const goal = target + clamp(vy * 0.35, -22, 22) + rot * 0.4
    const k = 210, c = 11
    for (let left = span; left > 1e-6; left -= 0.016) {
      const dt = Math.min(0.016, left)
      s.v += (-k * (s.x - goal) - c * s.v) * dt
      s.x += s.v * dt
    }
    if (Math.abs(s.v) < 1.5 && Math.abs(s.x - goal) < 0.4) { s.x = goal; s.v = 0; return false }
    return true
  }

  function write(p, ch, v) {
    const old = p.values[ch]
    if (old === v) return
    if (Math.abs(v - old) < eps(ch) && v !== NEUTRAL[ch]) return
    p.values[ch] = v
    p.dirty.add(ch)
  }

  // ---- the tick
  function tick(now) {
    lastNow = now
    const fm = frameMs()
    let due = Infinity
    const events = []
    for (let i = 0; i < pets.length; i++) {
      const p = pets[i]
      const target = {}
      const owns = {}
      // a one-shot that has run its course: follow it, hold its last frame, or rest
      if (p.player && !p.player.clip.loop && (now - p.player.start) * p.player.speed >= p.player.clip.duration) {
        const done = p.player
        events.push({ pet: i, type: "end", clip: done.clip.id, tag: done.tag })
        if (done.then && clips[done.then]) play(i, done.then, { tag: done.tag })
        else if (done.clip.endPose) {
          p.player = null
          p.held = {}
          for (const ch of done.clip.channels) p.held[ch] = done.clip.tracks[ch][done.clip.tracks[ch].length - 1].v
        } else rest(i)
      }
      const pl = p.player
      if (pl) {
        const clip = pl.clip
        // a lower cap: sampled on an absolute grid, so every calm clip changes
        // on the same frames as the others (and as the eyes' beat)
        const pfm = pl.fps ? Math.max(fm, Math.round(1000 / pl.fps)) : fm
        const tn = pfm > fm ? Math.floor(now / pfm) * pfm : now
        const up = t => pfm > fm ? Math.ceil(t / pfm) * pfm : t
        if (poseOnly() && clip.pose) {
          for (const ch of CHANNELS) if (clip.pose[ch] !== undefined) { target[ch] = clip.pose[ch]; owns[ch] = true }
          if (!clip.loop) due = Math.min(due, pl.start + clip.duration / pl.speed)
        } else {
          const t = localTime(clip, pl.start, Math.max(pl.start, tn), pl.speed, opts.stepScale)
          for (const ch of clip.channels) { target[ch] = sampleTrack(clip.tracks[ch], t); owns[ch] = true }
          // swaps and FX crossed since the last tick
          const t0 = pl.lastLocal
          if (t !== t0) {
            for (const s of clip.set) {
              const crossed = t0 < 0 ? s.t <= t : (t >= t0 ? s.t > t0 && s.t <= t : s.t > t0 || s.t <= t)
              if (!crossed) continue
              for (const k in s.s) if (p.swaps[k] !== s.s[k]) { p.swaps[k] = s.s[k]; p.dirty.add(k) }
            }
            const fx = t0 < 0 ? clip.fx.filter(f => f.t <= t).map(f => f.f) : fxBetween(clip, t0, t)
            for (const f of fx) spawn(i, f, now)
            pl.lastLocal = t
          }
          due = Math.min(due, up(nextChange(clip, pl.start, now, pl.speed, pfm, opts.stepScale)))
        }
        // blend in from where the pet was (pose-only modes snap)
        const b = poseOnly() ? 1 : (Math.max(pl.start, tn) - pl.start) / BLEND_MS
        if (b < 1) {
          const k = b * b * (3 - 2 * b)
          for (const ch of CHANNELS) {
            const to = target[ch] !== undefined ? target[ch] : NEUTRAL[ch]
            target[ch] = pl.from[ch] + (to - pl.from[ch]) * k
          }
          due = Math.min(due, up(now + pfm))
        }
      } else if (p.restFrom) {
        const b = poseOnly() ? 1 : (now - p.restFrom.start) / BLEND_MS
        const k = b >= 1 ? 1 : b * b * (3 - 2 * b)
        for (const ch of CHANNELS) target[ch] = p.restFrom.from[ch] + (NEUTRAL[ch] - p.restFrom.from[ch]) * k
        if (b >= 1) p.restFrom = null
        else due = Math.min(due, now + fm)
      } else if (p.held) {
        for (const ch in p.held) { target[ch] = p.held[ch]; owns[ch] = true }
      }

      // eyes (overlay on channels the clip leaves alone)
      const eyes = eyesStep(p, now, owns)
      for (const ch in eyes.out) if (eyes.out[ch] !== undefined && !owns[ch]) target[ch] = eyes.out[ch]
      due = Math.min(due, eyes.due)

      // channels nobody drives rest at neutral
      for (const ch of CHANNELS) if (target[ch] === undefined) target[ch] = NEUTRAL[ch]
      if (p.body) {
        if (bodyStep(p, now, events, i)) due = Math.min(due, now + fm)
      }
      if (p.body) {
        // in the air: the hop channel (the shadow stays on the ground)
        target.x += p.body.x
        target.y += p.body.y
        target.rot += p.body.swing
        target.shadow = p.body.mode === "drag" ? 0.6 : clamp(1 + Math.min(0, p.body.y) / 30, 0.45, 1)
      } else {
        const grid = offsetGrid(p)
        const off = offsetNow(p, grid ? Math.floor(now / grid) * grid : now)
        target.x += off.x
        target.lift += off.y
        if (p.offset.ms && now < p.offset.start + p.offset.ms) due = Math.min(due, grid ? Math.floor(now / grid) * grid + grid : now + fm)
      }

      // the spring (not in pose-only modes)
      if (!poseOnly()) {
        if (springStep(p, now, target.topRot, target.y + target.lift, target.rot)) {
          // a stepped loop keeps its follow-through on its own grid
          const step = p.player && p.player.clip.step ? p.player.clip.step * (opts.stepScale || 1) : 0
          due = Math.min(due, step ? Math.floor(now / step) * step + step : now + fm)
        }
        target.topRot = p.spring.x
      }

      for (const ch of CHANNELS) write(p, ch, target[ch])
    }
    if (stepPool(now)) due = Math.min(due, now + fm)

    // collect writes
    const writes = []
    for (let i = 0; i < pets.length; i++) {
      const p = pets[i]
      if (!p.dirty.size) continue
      for (const ch of p.dirty) writes.push([i, ch, ch in p.values ? p.values[ch] : p.swaps[ch]])
      p.dirty.clear()
    }
    const fx = []
    for (const i of poolDirty) {
      const q = pool[i]
      fx.push(q ? [i, q.kind, q.pet, q.x, q.y, q.rot, q.s, q.a] : [i, "", -1, 0, 0, 0, 0, 0])
    }
    poolDirty.clear()
    return { writes, fx, due, events }
  }

  function current(index) { const p = pets[index]; return p && p.player ? p.player.tag : null }
  function isBusy() {
    if (pool.some(q => q)) return true
    return pets.some(p => p.player || p.restFrom || p.spring.v !== 0 || p.body || (p.offset.ms && lastNow < p.offset.start + p.offset.ms))
  }
  function hasClip(id) { return !!clips[id] }
  function clip(id) { return clips[id] }

  function dragging(index) { const p = pets[index]; return !!(p && p.body) }

  return { setPets, play, rest, reset, setAwake, lookAt, setOffset, offsetOf, grab, drag, release, dragging, setMode, tick, current, isBusy, hasClip, clip, clips,
           get pets() { return pets } }
}
