import { test } from "node:test"
import assert from "node:assert/strict"
import * as Clock from "../core/clock.mjs"
import * as Rng from "../core/rng.mjs"

test("frame interval follows the fps cap and is clamped", () => {
  assert.equal(Clock.frameInterval(24), 42)
  assert.equal(Clock.frameInterval(12), 83)
  assert.equal(Clock.frameInterval(0), 1000)
  assert.equal(Clock.frameInterval(500), 17)
})

test("every easing starts at 0 and ends at 1", () => {
  for (const [name, fn] of Object.entries(Clock.EASE)) {
    assert.ok(Math.abs(fn(0)) < 1e-9, name)
    assert.ok(Math.abs(fn(1) - 1) < 1e-9, name)
  }
})

test("seeded rng is reproducible and in range", () => {
  const r1 = Rng.create(7), r2 = Rng.create(7)
  for (let i = 0; i < 100; i++) {
    const x = r1.next()
    assert.equal(x, r2.next())
    assert.ok(x >= 0 && x < 1)
  }
  assert.equal(Rng.hash("claude"), Rng.hash("claude"))
  assert.notEqual(Rng.hash("claude"), Rng.hash("codex"))
})
