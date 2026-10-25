import { test } from "node:test"
import assert from "node:assert/strict"
import { planBarRoam, planExcursion, planParachute, BAR_TRIP_MS, DESKTOP_TRIP_MS } from "../core/roam.mjs"
import { createEngine } from "../core/engine.mjs"
import { CLIPS } from "../clips/index.mjs"
import * as Rng from "../core/rng.mjs"

const bar = { pet: 0, unit: 0.875, home: 1060, lo: 14, hi: 1266, obstacles: [[700, 820], [880, 960], [1100, 1180]], pillLift: 0, arcRoom: 4.5 }

// Where a scene's offsets take the pet, step by step (the last target of each axis).
function positions(scene) {
  let x = 0, y = 0
  const out = []
  for (const s of scene.steps) if (s.offset) { x = s.offset.x; if (s.offset.y !== undefined) y = s.offset.y; out.push([s.at, x, y]) }
  return out
}

test("bar trips: every kind fits the 10 s budget, ends home and names only real clips", () => {
  for (let seed = 1; seed <= 40; seed++) {
    for (const kind of ["stroll", "perch", "zoomies"]) {
      const scene = planBarRoam(kind, bar, Rng.create(seed))
      if (!scene) continue
      assert.ok(scene.duration <= BAR_TRIP_MS + 200, `${kind} ${seed}: ${scene.duration} ms`)
      const p = positions(scene)
      assert.deepEqual(p[p.length - 1].slice(1), [0, 0], `${kind} ${seed} ends home`)
      for (const s of scene.steps) if (s.clip) assert.ok(CLIPS[s.clip], s.clip)
      // never off the floor's ends
      for (const [, x] of p) {
        const px = bar.home + x * bar.unit
        assert.ok(px >= bar.lo - 0.5 && px <= bar.hi + 0.5, `${kind} ${seed}: ${px}`)
      }
      assert.ok(scene.extent.lo <= 0 && scene.extent.hi >= 0)
    }
  }
})

test("bar trips: a stroll hops at the pills it crosses; perching never sits inside a pill", () => {
  let hops = 0
  for (let seed = 1; seed <= 30; seed++) {
    const s = planBarRoam("stroll", bar, Rng.create(seed))
    if (s) hops += s.steps.filter(x => x.clip === "hopLeft" || x.clip === "hopRight").length
    const p = planBarRoam("perch", bar, Rng.create(seed))
    if (!p) continue
    const sit = p.steps.find(x => x.clip === "perchSit")
    const before = positions(p).filter(([at]) => at <= sit.at).pop()
    const px = bar.home + before[1] * bar.unit
    assert.ok(!bar.obstacles.some(([a, b]) => px > a - 4 && px < b + 4), `seed ${seed} perches at ${px}`)
  }
  assert.ok(hops > 0)
  // bottom bars stand on the pills' tops
  const lifted = planBarRoam("stroll", Object.assign({}, bar, { pillLift: -6 }), Rng.create(3))
  if (lifted && lifted.steps.some(x => x.clip === "hopLeft" || x.clip === "hopRight")) assert.ok(positions(lifted).some(([, , y]) => y === -6))
})

test("bar trips: no room, no trip", () => {
  assert.equal(planBarRoam("stroll", Object.assign({}, bar, { lo: 1040, hi: 1080 }), Rng.create(1)), null)
  assert.equal(planBarRoam("zoomies", Object.assign({}, bar, { lo: 1000, hi: 1100 }), Rng.create(1)), null)
})

test("the same seed and desktop give the same trip", () => {
  assert.deepEqual(planBarRoam("zoomies", bar, Rng.create(9)), planBarRoam("zoomies", bar, Rng.create(9)))
})

const desk = {
  pet: 1, unit: 0.875, home: { x: 1060, y: 32 }, area: { x: 0, y: 0, w: 1280, h: 720 }, edge: "top", sizePx: 28,
  windows: [{ id: "a", x: 10, y: 46, w: 620, h: 664, focused: false }, { id: "b", x: 646, y: 46, w: 612, h: 664, focused: true }]
}

test("desktop trips: onto a window's top edge, a sit, back home within 20 s", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const scene = planExcursion(desk, Rng.create(seed))
    assert.ok(scene, `seed ${seed}`)
    assert.ok(scene.duration <= DESKTOP_TRIP_MS + 200, `${scene.duration}`)
    assert.ok(["a", "b"].includes(scene.window))
    const win = desk.windows.find(w => w.id === scene.window)
    const p = positions(scene)
    assert.deepEqual(p[p.length - 1].slice(1), [0, 0])
    const topY = (win.y - desk.home.y) / desk.unit
    const watch = scene.steps.find(s => s.clip === "watch")
    const at = p.filter(([t]) => t <= watch.at).pop()
    assert.ok(Math.abs(at[2] - topY) < 1e-9, "sits on the top edge")
    const px = desk.home.x + at[1] * desk.unit
    assert.ok(px >= win.x && px <= win.x + win.w, "within the window")
    for (const s of scene.steps) if (s.clip) assert.ok(CLIPS[s.clip], s.clip)
  }
})

test("desktop trips: bottom bars climb up and float back down; no usable window, no trip", () => {
  const bottom = Object.assign({}, desk, { edge: "bottom", home: { x: 1060, y: 712 }, windows: [{ id: "f", x: 700, y: 420, w: 400, h: 250, focused: true }] })
  const scene = planExcursion(bottom, Rng.create(2))
  assert.ok(scene)
  assert.ok(scene.steps.some(s => s.clip === "climb") && scene.steps.some(s => s.clip === "parachute"))
  assert.equal(planExcursion(Object.assign({}, desk, { windows: [{ id: "n", x: 0, y: 46, w: 60, h: 600 }] }), Rng.create(1)), null)
  assert.equal(planExcursion(Object.assign({}, desk, { edge: "left" }), Rng.create(1)), null)
})

test("parachute: from wherever the pet is, down, back up, home", () => {
  const scene = planParachute(desk, { x: -200, y: 16 })
  const p = positions(scene)
  assert.deepEqual(p[0].slice(1), [-200, 16])
  assert.ok(p.some(([, , y]) => y > 16))
  assert.deepEqual(p[p.length - 1].slice(1), [0, 0])
  assert.ok(scene.steps.some(s => s.clip === "parachute") && scene.steps.some(s => s.clip === "climb"))
})

test("engine: offsets ease in two axes and arcs lift mid-way", () => {
  const eng = createEngine({ clips: CLIPS, seed: 1 })
  eng.setPets([{ id: "a" }])
  eng.tick(1000)
  eng.setOffset(0, 40, 1000, { y: 10, ease: "linear", arc: 5 })
  eng.tick(1500)
  const mid = eng.offsetOf(0)
  assert.ok(Math.abs(mid.x - 20) < 1e-6)
  assert.ok(Math.abs(mid.y - (5 - 5)) < 1e-6, `y ${mid.y}`)     // halfway down, minus the arc's top
  eng.tick(2100)
  assert.deepEqual(eng.offsetOf(0), { x: 40, y: 10 })
  // y left out stays where it is
  eng.setOffset(0, 0, 100)
  eng.tick(2300)
  assert.deepEqual(eng.offsetOf(0), { x: 0, y: 10 })
})

test("engine: a flung pet flies, bounces off the bar's ends, lands and settles; frames stop after", () => {
  const eng = createEngine({ clips: CLIPS, seed: 1, fps: 24 })
  eng.setPets([{ id: "a" }])
  let now = 1000
  eng.tick(now)
  eng.grab(0)
  for (let i = 1; i <= 6; i++) { now += 16; eng.tick(now); eng.drag(0, i * 6, -i * 1.5) }
  const speed = eng.release(0, { lo: -60, hi: 60, ceil: -20 })
  assert.ok(speed > 200, `speed ${speed}`)
  const seen = new Set()
  let settled = null
  for (let k = 0; k < 600 && !settled; k++) {
    now += 42
    const r = eng.tick(now)
    for (const e of r.events) { seen.add(e.type); if (e.type === "settled") settled = e }
    const o = eng.offsetOf(0)
    assert.ok(o.x >= -60.001 && o.x <= 60.001, `x ${o.x}`)
  }
  assert.ok(settled, "settles")
  assert.ok(seen.has("bonk") && seen.has("landed"), [...seen].join(","))
  assert.equal(eng.dragging(0), false)
  assert.ok(Math.abs(eng.offsetOf(0).x - settled.x) < 1e-9)
  // nothing left to animate once the clip-less pet has settled
  eng.setAwake(0, false)
  let r = eng.tick(now + 2000)
  r = eng.tick(now + 4000)
  assert.equal(r.due, Infinity)
})
