// Clips: animation as data. A clip is a plain object (see clips/*.mjs):
//
//   duration  ms
//   loop      true: repeats until something else plays
//   step      ms: sample on a fixed grid of absolute time (stepped loops at
//             ≤ 12 fps of real change; every pet on the same grid changes on
//             the same frames, so three working pets cost one repaint, not three)
//   tracks    { channel: [[t, value, ease?], ...] } — value at t; ease shapes
//             the segment that ends at that key (default inOutQuad; "step"
//             holds the previous value until t)
//   set       [[t, { eyes, mouth, seat, desk, hand, over }], ...] swaps
//   fx        [[t, { kind | kinds, n, at, spread, v, vspread, g, life, spin, scale }], ...]
//   use       [[t, clipId, { speed, scale: { channel: k }, add: { channel: d } }], ...]
//             another clip inlined at t (moves reused as content, not code)
//   pose      what reduced motion and Still mode show instead: channel values
//             and swaps held for the clip's length
//   endPose   true when the clip deliberately ends off neutral (sleep, sit):
//             whatever plays next blends from there
//
// compile() turns that into sorted key arrays; sample() and nextChange() are
// what the engine calls per tick. Nothing here touches QML.
import { EASE } from "./clock.mjs"

export const NEUTRAL = { x: 0, y: 0, lift: 0, perch: 0, sx: 1, sy: 1, rot: 0, dir: 1, alpha: 1, shadow: 1, faceX: 0, faceY: 0,
                         gazeX: 0, gazeY: 0, blink: 1, armL: 0, armR: 0, topRot: 0, propRot: 0, propX: 0, propY: 0 }
export const SWAP_DEFAULTS = { eyes: "open", mouth: "base", seat: "", desk: "", hand: "", over: "" }
export const CHANNELS = Object.keys(NEUTRAL)
export const SWAPS = Object.keys(SWAP_DEFAULTS)

const EASES = Object.assign({ step: t => (t >= 1 ? 1 : 0) }, EASE)

function key(k) { return { t: Number(k[0]), v: Number(k[1]), ease: k[2] || "inOutQuad" } }

// Inline `use` entries (recursively) into a flat clip.
function expand(id, library, depth) {
  const src = library[id]
  if (!src) throw new Error(`unknown clip "${id}"`)
  if (depth > 6) throw new Error(`clip "${id}" nests too deep`)
  const tracks = {}, set = [], fx = []
  for (const ch in src.tracks || {}) tracks[ch] = (src.tracks[ch] || []).map(key)
  for (const [t, s] of src.set || []) set.push({ t, s })
  for (const [t, f] of src.fx || []) fx.push({ t, f })
  for (const [t0, other, opts] of src.use || []) {
    const sub = expand(other, library, depth + 1)
    const speed = (opts && opts.speed) || 1, scale = (opts && opts.scale) || {}, addv = (opts && opts.add) || {}
    for (const ch in sub.tracks) {
      const k = scale[ch] !== undefined ? scale[ch] : 1, d = addv[ch] || 0
      const base = NEUTRAL[ch] !== undefined ? NEUTRAL[ch] : 0
      const keys = sub.tracks[ch].map(x => ({ t: t0 + x.t / speed, v: base + (x.v - base) * k + d, ease: x.ease }))
      tracks[ch] = (tracks[ch] || []).concat(keys)
    }
    for (const s of sub.set) set.push({ t: t0 + s.t / speed, s: s.s })
    for (const f of sub.fx) fx.push({ t: t0 + f.t / speed, f: f.f })
  }
  for (const ch in tracks) tracks[ch].sort((a, b) => a.t - b.t)
  set.sort((a, b) => a.t - b.t)
  fx.sort((a, b) => a.t - b.t)
  return { tracks, set, fx }
}

export function compile(id, library) {
  const src = library[id]
  const flat = expand(id, library, 0)
  let last = 0
  for (const ch in flat.tracks) for (const k of flat.tracks[ch]) last = Math.max(last, k.t)
  for (const s of flat.set) last = Math.max(last, s.t)
  for (const f of flat.fx) last = Math.max(last, f.t)
  const duration = Math.max(1, Number(src.duration) || last || 1)
  // A one-shot that leaves a channel off neutral eases it back over its last
  // 120 ms (holding until then), so every clip ends where any other can start.
  if (!src.loop && !src.endPose) {
    for (const ch in flat.tracks) {
      const keys = flat.tracks[ch], end = keys[keys.length - 1], rest = NEUTRAL[ch]
      if (rest === undefined || Math.abs(end.v - rest) < 1e-9 || (ch === "rot" && Math.abs(end.v % 360) < 1e-9)) continue
      const close = Math.max(end.t + 80, duration)
      if (close - 120 > end.t) keys.push({ t: close - 120, v: end.v, ease: "linear" })
      keys.push({ t: close, v: rest, ease: "inOutQuad" })
    }
  }
  return {
    id,
    duration,
    loop: !!src.loop,
    step: Math.max(0, Number(src.step) || 0),
    tracks: flat.tracks,
    channels: Object.keys(flat.tracks),
    set: flat.set,
    fx: flat.fx,
    pose: src.pose || null,
    endPose: !!src.endPose,
    agent: !!src.agent
  }
}

export function compileAll(library) {
  const out = {}
  for (const id in library) out[id] = compile(id, library)
  return out
}

// Value of a key track at local time t.
export function sampleTrack(keys, t) {
  if (!keys.length) return undefined
  if (t <= keys[0].t) return keys[0].v
  const last = keys[keys.length - 1]
  if (t >= last.t) return last.v
  let lo = 0, hi = keys.length - 1
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (keys[mid].t <= t) lo = mid; else hi = mid }
  const a = keys[lo], b = keys[hi]
  if (b.v === a.v) return a.v
  const fn = EASES[b.ease] || EASES.inOutQuad
  return a.v + (b.v - a.v) * fn((t - a.t) / (b.t - a.t))
}

// The earliest local time ≥ t at which the track's value changes: t itself
// while interpolating, the end of a hold, or Infinity when it rests for good.
export function trackNextChange(keys, t) {
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i]
    if (b.t <= t) continue
    if (a.v === b.v) continue
    if (b.ease === "step") return Math.max(t, b.t)
    return Math.max(t, a.t)
  }
  return Infinity
}

// Local time inside a (possibly looping) clip for absolute `now`, honouring
// the step grid (absolute, so every stepped clip shares the same frames).
// stepScale stretches the grid (Battery mode: 2 → stepped loops at half rate).
export function localTime(clip, start, now, speed, stepScale) {
  let abs = now
  const step = clip.step * (stepScale || 1)
  if (step > 0) abs = Math.floor(now / step) * step
  let t = Math.max(0, (abs - start) * (speed || 1))
  if (clip.loop) t = t % clip.duration
  return t
}

// Absolute time of the next visible change of a playing clip after `now`.
export function nextChange(clip, start, now, speed, frameMs, stepScale) {
  const step = clip.step * (stepScale || 1)
  const sp = speed || 1
  const raw = Math.max(0, (now - start) * sp)
  if (!clip.loop && raw >= clip.duration) return Infinity
  const cycle = clip.loop ? Math.floor(raw / clip.duration) : 0
  const t = clip.loop ? raw % clip.duration : raw
  let best = Infinity
  for (const ch of clip.channels) best = Math.min(best, trackNextChange(clip.tracks[ch], t))
  for (const s of clip.set) if (s.t > t) { best = Math.min(best, s.t); break }
  for (const f of clip.fx) if (f.t > t) { best = Math.min(best, f.t); break }
  if (best === Infinity) {
    if (clip.loop) best = clip.duration          // wraps to its first frame
    else return start + clip.duration / sp       // its end, so "then" can follow
  }
  let abs = start + (cycle * clip.duration + best) / sp
  if (best <= t) abs = now + frameMs              // interpolating right now
  if (step > 0) abs = Math.max(Math.ceil(abs / step) * step, Math.floor(now / step) * step + step)
  return Math.max(abs, now + 1)
}

// Swaps in effect at local time t (the last of each kind at or before t).
export function swapsAt(clip, t) {
  const out = {}
  for (const s of clip.set) {
    if (s.t > t) break
    Object.assign(out, s.s)
  }
  return out
}

// FX events whose time falls in (t0, t1] of local time, wrapping for loops.
export function fxBetween(clip, t0, t1) {
  const out = []
  if (t1 < t0 && clip.loop) {
    for (const f of clip.fx) if (f.t > t0 || f.t <= t1) out.push(f.f)
    return out
  }
  for (const f of clip.fx) if (f.t > t0 && f.t <= t1) out.push(f.f)
  return out
}
