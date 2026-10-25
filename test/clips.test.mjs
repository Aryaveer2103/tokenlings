import { test } from "node:test"
import assert from "node:assert/strict"
import { CLIPS, ACTIONS, WALK, pick } from "../clips/index.mjs"
import { compile, compileAll, nextChange, NEUTRAL, CHANNELS, SWAPS } from "../core/clips.mjs"
import { createEngine } from "../core/engine.mjs"
import { EYE_EXPRESSIONS, MOUTH_EXPRESSIONS } from "../assets/parts/faces.mjs"
import { PROPS } from "../assets/parts/props.mjs"
import { FX } from "../assets/parts/fx.mjs"
import { FORMS } from "../forms/forms.mjs"
import * as Rng from "../core/rng.mjs"

const compiled = compileAll(CLIPS)

test("clips are plain data (survive a JSON round trip)", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(CLIPS)), CLIPS)
})

test("every clip compiles and refers only to things that exist", () => {
  const slotOf = { seat: "seat", desk: "desk", hand: "hand", over: "over" }
  for (const [id, src] of Object.entries(CLIPS)) {
    const c = compiled[id]
    for (const ch of c.channels) assert.ok(CHANNELS.includes(ch), `${id}: unknown channel ${ch}`)
    const swaps = c.set.map(s => s.s).concat(src.pose ? [src.pose] : [])
    for (const s of swaps) for (const [k, v] of Object.entries(s)) {
      if (!SWAPS.includes(k)) { assert.ok(CHANNELS.includes(k), `${id}: unknown pose key ${k}`); continue }
      if (k === "eyes") assert.ok(EYE_EXPRESSIONS.includes(v), `${id}: eyes ${v}`)
      else if (k === "mouth") assert.ok(MOUTH_EXPRESSIONS.includes(v), `${id}: mouth ${v}`)
      else if (v !== "") assert.equal(PROPS[v] && PROPS[v].slot, slotOf[k], `${id}: ${k} ${v}`)
    }
    for (const f of c.fx) for (const kind of f.f.kinds || [f.f.kind]) assert.ok(FX[kind], `${id}: fx ${kind}`)
  }
})

test("one-shot clips end on the neutral pose (so any clip can follow any other)", () => {
  for (const c of Object.values(compiled)) {
    if (c.loop || c.endPose) continue
    for (const ch of c.channels) {
      const keys = c.tracks[ch], last = keys[keys.length - 1].v
      const ok = Math.abs(last - NEUTRAL[ch]) < 1e-6 || (ch === "rot" && Math.abs(last % 360) < 1e-6)
      assert.ok(ok, `${c.id}.${ch} ends at ${last}`)
    }
  }
})

test("stepped loops change at most 12 times a second", () => {
  for (const c of Object.values(compiled)) {
    if (!c.loop) continue
    assert.ok(c.step >= 83, `${c.id}: sustained loops must be stepped (≥ 83 ms)`)
    let now = 100000, changes = 0
    const start = 100000, end = start + 3 * c.duration
    while (now < end) { now = nextChange(c, start, now, 1, 42); if (now < end) changes++ }
    const rate = changes / (3 * c.duration / 1000)
    assert.ok(rate <= 12.01, `${c.id}: ${rate.toFixed(1)} changes/s`)
  }
})

test("actions, the demo walk and every form's habits and moves point at clips", () => {
  for (const [a, list] of Object.entries(ACTIONS)) for (const v of list) assert.ok(CLIPS[typeof v === "string" ? v : v.clip], `${a} → ${JSON.stringify(v)}`)
  for (const [a] of WALK) assert.ok(ACTIONS[a], a)
  for (const [n, f] of Object.entries(FORMS)) {
    for (const h of Object.keys(f.habits)) assert.ok(CLIPS[h], `${n} habit ${h}`)
    for (const m of f.moves) assert.ok(CLIPS[m], `${n} move ${m}`)
  }
  const multi = Object.entries(ACTIONS).filter(([, l]) => l.length >= 2).length
  assert.ok(multi >= 30, `${multi} actions have variants`)
})

test("variant picks are seeded and follow personality", () => {
  const a = Rng.create(5), b = Rng.create(5)
  for (let i = 0; i < 20; i++) assert.equal(pick("bored", { energy: 0.5 }, a), pick("bored", { energy: 0.5 }, b))
  const r = Rng.create(9), counts = {}
  for (let i = 0; i < 2000; i++) { const c = pick("micro", { sleepiness: 1 }, r); counts[c] = (counts[c] || 0) + 1 }
  const r2 = Rng.create(9), counts2 = {}
  for (let i = 0; i < 2000; i++) { const c = pick("micro", { sleepiness: 0 }, r2); counts2[c] = (counts2[c] || 0) + 1 }
  assert.ok(counts.yawn > counts2.yawn * 2)
})

function engineWith(n, opts) {
  const e = createEngine(Object.assign({ clips: CLIPS, seed: 3, fps: 24 }, opts))
  e.setPets(Array.from({ length: n }, (_, i) => ({ id: "p" + i, personality: { energy: 0.5, sociability: 0.5, mischief: 0.5, sleepiness: 0.5 } })))
  return e
}

test("asleep pets cost nothing: no writes, nothing due", () => {
  const e = engineWith(3)
  e.tick(1000)
  for (let i = 0; i < 3; i++) e.setAwake(i, false)
  const r = e.tick(2000)
  const r2 = e.tick(5000)
  assert.equal(r2.writes.length, 0)
  assert.equal(r2.due, Infinity)
})

test("awake but idle: only sparse blinks and saccades are scheduled", () => {
  const e = engineWith(3)
  let now = 0, ticks = 0
  let r = e.tick(now)
  while (now < 60000) { now = Math.max(now + 42, Math.min(r.due, now + 60000)); r = e.tick(now); ticks++ }
  assert.ok(ticks < 60 * 4, `${ticks} ticks in a minute`)
})

test("a new clip blends in from the current pose instead of popping", () => {
  const e = engineWith(1)
  e.tick(0)
  e.play(0, "toolEdit")
  e.tick(0)
  const r = e.tick(42)
  const lift = r.writes.find(w => w[1] === "lift")
  assert.ok(lift && lift[2] > -3 && lift[2] < 0, JSON.stringify(lift))
})

test("three pets working (different tools, eyes awake) change on the same frames", () => {
  const e = engineWith(3)
  e.tick(0)
  e.play(0, "toolEdit"); e.play(1, "toolShell"); e.play(2, "toolRead")
  let now = 1000, r = e.tick(now)
  const times = []
  while (now < 11000) { now = Math.max(now + 1, r.due); r = e.tick(now); if (r.writes.length) times.push(now) }
  const rate = times.length / 10
  // blinks and the topper spring stay on the loops' 125 ms grid too
  assert.ok(rate <= 8.05, `${rate} frames/s for three working pets`)
})

test("clips play deterministically under a seed", () => {
  const run = () => {
    const e = engineWith(2)
    const out = []
    let now = 0
    e.play(0, "doneMedium"); e.play(1, "failure")
    for (let i = 0; i < 80; i++) { const r = e.tick(now); out.push(JSON.stringify([r.writes, r.fx])); now += 42 }
    return out
  }
  assert.deepEqual(run(), run())
})

test("reduced motion shows poses: no particles, no in-between frames", () => {
  const e = engineWith(1, { reduced: true })
  e.tick(0)
  e.setAwake(0, false)
  e.play(0, "doneMedium")
  let now = 0, frames = 0, fx = 0
  for (let i = 0; i < 60; i++) { const r = e.tick(now); if (r.writes.length) frames++; fx += r.fx.length; now += 42 }
  assert.equal(fx, 0)
  assert.ok(frames <= 6, `${frames} frames`)
})

test("the FX pool never holds more than its cap", () => {
  const e = engineWith(3, { maxParticles: 6 })
  e.tick(0)
  for (let i = 0; i < 3; i++) e.play(i, "doneLong")
  let live = new Set(), max = 0
  for (let now = 0; now < 4000; now += 42) {
    const r = e.tick(now)
    for (const [slot, kind] of r.fx) { if (kind) live.add(slot); else live.delete(slot) }
    max = Math.max(max, live.size)
  }
  assert.ok(max <= 6, `${max} live particles`)
})
