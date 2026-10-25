import { test } from "node:test"
import assert from "node:assert/strict"
import { tierOf, windowState, windowEvents, processState, processEvents, parseSamples } from "../core/tiers.mjs"

test("tiers: hooks first, then process and window matches", () => {
  assert.equal(tierOf({ provider: "claude", account: {} }).tier, "A")
  assert.equal(tierOf({ provider: "chatgpt", account: {} }).tier, "C")
  assert.equal(tierOf({ provider: "aider", account: {} }).tier, "B")
  assert.equal(tierOf({ provider: "x", account: { match: "process:^foo$" } }).tier, "B")
  assert.equal(tierOf({ provider: "claude", account: { match: "window:Claude" } }).tier, "C")
  assert.equal(tierOf({ provider: "x", account: { match: "window:(" } }).tier, "none")
  assert.equal(tierOf({ provider: "unknown", account: {} }).tier, "none")
})

test("tier C: a window opening, focusing, retitling and closing", () => {
  const m = tierOf({ provider: "chatgpt", account: {} })
  const s0 = { open: false, focused: false, title: "" }
  const s1 = windowState(m, [{ cls: "ChatGPT", title: "New chat", focused: false }])
  assert.deepEqual(windowEvents("p", s0, s1, 1).map(e => e.event), ["session.start"])
  const s2 = windowState(m, [{ cls: "ChatGPT", title: "New chat", focused: true }])
  assert.deepEqual(windowEvents("p", s1, s2, 2).map(e => e.cue), ["attentive"])
  const s3 = windowState(m, [{ cls: "ChatGPT", title: "Answer ready", focused: true }])
  assert.deepEqual(windowEvents("p", s2, s3, 3).map(e => e.cue), ["listening"])
  assert.deepEqual(windowEvents("p", s3, windowState(m, []), 4).map(e => e.event), ["session.end"])
  // a browser tab is matched by its title
  assert.equal(windowState(m, [{ cls: "chromium", title: "ChatGPT — Chromium" }]).open, true)
})

test("tier B: busy from CPU time, a finished turn after quiet, gone ends it", () => {
  const m = tierOf({ provider: "aider", account: {} })
  const hz = 100
  let st = processState(m, null, parseSamples("10 100 aider\n11 5 bash"), 0, hz)
  let pe = processEvents("p", { running: false }, st, 0)
  assert.deepEqual(pe.events.map(e => e.event), ["session.start"])
  let st2 = processState(m, st, parseSamples("10 160 aider"), 3000, hz)     // 0.6 s CPU in 3 s → busy
  assert.equal(st2.busy, true)
  let pe2 = processEvents("p", Object.assign({}, st, pe), st2, 3000)
  assert.deepEqual(pe2.events.map(e => e.event), ["prompt", "tool.start"])
  let st3 = processState(m, st2, parseSamples("10 161 aider"), 6000, hz)
  let pe3 = processEvents("p", Object.assign({}, st2, pe2), st3, 6000)
  assert.equal(pe3.events.length, 0)
  let st4 = processState(m, st3, parseSamples("10 161 aider"), 17000, hz)
  let pe4 = processEvents("p", Object.assign({}, st3, pe3), st4, 17000)
  assert.deepEqual(pe4.events.map(e => e.event), ["turn.end"])
  let st5 = processState(m, st4, parseSamples(""), 20000, hz)
  assert.deepEqual(processEvents("p", Object.assign({}, st4, pe4), st5, 20000).events.map(e => e.event), ["session.end"])
  assert.deepEqual(parseSamples("junk\n12 7 my proc\n"), [{ pid: 12, ticks: 7, comm: "my proc" }])
})
