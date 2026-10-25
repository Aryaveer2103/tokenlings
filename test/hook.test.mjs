import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, symlinkSync, existsSync, statSync, chmodSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseLine, normalize, newLines, TIER_A } from "../core/adapters/index.mjs"
import { createSessions, stateAction } from "../core/sessions.mjs"

const HOOK = fileURLToPath(new URL("../bin/tokenlings-hook", import.meta.url))
const FIX = name => readFileSync(new URL(`./fixtures/${name}.jsonl`, import.meta.url), "utf8").trim().split("\n").map(l => JSON.parse(l))

function runtime() {
  const dir = mkdtempSync(join(tmpdir(), "tkl-rt-"))
  chmodSync(dir, 0o700)
  return dir
}
function hook(rt, args, input, env) {
  return spawnSync("sh", [HOOK, ...args], { input, env: Object.assign({ PATH: process.env.PATH, XDG_RUNTIME_DIR: rt }, env || {}), timeout: 10000 })
}
const logOf = (rt, pet) => { const f = join(rt, "tokenlings", "events", pet + ".log"); return existsSync(f) ? readFileSync(f, "utf8") : "" }

for (const provider of TIER_A) {
  test(`${provider}: a recorded session drives start → think → tools → needs you → done → end`, () => {
    const rt = runtime()
    for (const row of FIX(provider)) {
      const r = hook(rt, ["--pet", "p1", "--provider", provider, "--event", row.event], JSON.stringify(row.payload))
      assert.equal(r.status, 0)
      assert.equal(r.stdout.length, 0, "the hook prints nothing")
    }
    const text = logOf(rt, "p1")
    assert.ok(!text.includes("TOP-SECRET"), "no prompt, tool input or output is stored")
    assert.ok(!text.includes("/work/someone"), "no full paths are stored")
    const { lines } = newLines(text, null)
    assert.equal(lines.length, FIX(provider).length)
    const s = createSessions()
    const seen = []
    for (const l of lines) {
      const ev = normalize("p1", l)
      if (!ev) continue
      if (ev.tool) seen.push("tool." + ev.tool)
      const out = s.apply(ev)
      const prim = s.primary("p1")
      seen.push(out.kind === "turn.end" ? "done" : out.kind === "session.end" ? "end" : stateAction(prim, ev.at) || out.kind)
    }
    // three tools inside 8 s merge into the busy montage; the categories still arrive
    for (const want of ["session.start", "thinking", "tool.read", "tool.edit", "tool.shell", "busy", "needs.0", "done", "end"])
      assert.ok(seen.includes(want), `${provider}: ${want} not in ${seen.join(", ")}`)
    rmSync(rt, { recursive: true, force: true })
  })
}

test("Grok running Claude Code's hooks does not wake the Claude pet", () => {
  const rt = runtime()
  const payload = JSON.stringify({ session_id: "x", hook_event_name: "PreToolUse", tool_name: "Bash" })
  hook(rt, ["--pet", "ember", "--provider", "claude", "--event", "PreToolUse"], payload, { GROK_HOOK_EVENT: "PreToolUse", GROK_HOOK_NAME: "h" })
  assert.equal(logOf(rt, "ember"), "")
  hook(rt, ["--pet", "jinx", "--provider", "grok", "--event", "PreToolUse"], payload, { GROK_HOOK_EVENT: "PreToolUse" })
  assert.ok(logOf(rt, "jinx").includes("PreToolUse"))
  hook(rt, ["--pet", "ember", "--provider", "claude", "--event", "PreToolUse"], payload)
  assert.ok(logOf(rt, "ember").includes("PreToolUse"))
})

test("hostile input: huge or binary stdin, bad names, symlinks and FIFOs are refused quietly", () => {
  const rt = runtime()
  const big = Buffer.alloc(8 * 1024 * 1024, 0x41)
  let t0 = Date.now()
  let r = hook(rt, ["--pet", "p", "--provider", "claude", "--event", "Stop"], big)
  assert.equal(r.status, 0)
  assert.ok(Date.now() - t0 < 5000)
  r = hook(rt, ["--pet", "p", "--provider", "claude"], Buffer.from([0, 255, 254, 10, 13, 0x22, 0x7b]))
  assert.equal(r.status, 0)
  r = hook(rt, ["--pet", "../etc", "--provider", "claude", "--event", "Stop"], "{}")
  assert.equal(r.status, 0)
  assert.ok(!existsSync(join(rt, "etc.log")))
  r = hook(rt, ["--pet", "p", "--provider", "claude", "--event", "Stop\"},{\"x"], "{}")
  for (const l of logOf(rt, "p").trim().split("\n")) assert.ok(parseLine(l), "every line stays valid JSON: " + l)
  // a symlinked state folder is not followed
  const rt2 = runtime(), elsewhere = mkdtempSync(join(tmpdir(), "tkl-x-"))
  symlinkSync(elsewhere, join(rt2, "tokenlings"))
  hook(rt2, ["--pet", "p", "--provider", "claude", "--event", "Stop"], "{}")
  assert.ok(!existsSync(join(elsewhere, "events")))
  // a FIFO where the log should be is left alone (and the hook does not hang)
  const rt3 = runtime()
  mkdirSync(join(rt3, "tokenlings", "events"), { recursive: true, mode: 0o700 })
  spawnSync("mkfifo", [join(rt3, "tokenlings", "events", "p.log")])
  t0 = Date.now()
  r = hook(rt3, ["--pet", "p", "--provider", "claude", "--event", "Stop"], "{}")
  assert.equal(r.status, 0)
  assert.ok(Date.now() - t0 < 3000)
})

test("the log stays small and files are private", () => {
  const rt = runtime()
  const payload = JSON.stringify({ session_id: "s", hook_event_name: "PreToolUse", tool_name: "Read" })
  for (let i = 0; i < 420; i++) hook(rt, ["--pet", "p", "--provider", "claude", "--event", "PreToolUse"], payload)
  const f = join(rt, "tokenlings", "events", "p.log")
  assert.ok(statSync(f).size <= 66 * 1024)
  assert.equal(statSync(join(rt, "tokenlings")).mode & 0o777, 0o700)
  assert.equal(statSync(f).mode & 0o777, 0o600)
})

test("without jq the hook still records the event", () => {
  const rt = runtime()
  const bin = mkdtempSync(join(tmpdir(), "tkl-bin-"))
  for (const tool of ["head", "cat", "tr", "cut", "sha256sum", "date", "wc", "mv", "mkdir"]) {
    const which = spawnSync("sh", ["-c", "command -v " + tool]).stdout.toString().trim()
    if (which) symlinkSync(which, join(bin, tool))
  }
  const r = spawnSync("/bin/sh", [HOOK, "--pet", "p", "--provider", "claude", "--event", "Stop"], { input: "{}", env: { PATH: bin, XDG_RUNTIME_DIR: rt } })
  assert.equal(r.status, 0)
  assert.ok(logOf(rt, "p").includes('"e":"Stop"'))
})

test("log reading resumes where it left off, including lines with equal times", () => {
  const mk = (t, e) => JSON.stringify({ t, p: "claude", e, c: "", k: "", s: "a", pid: 1, chain: [], cwd: "" })
  let text = [mk(1, "SessionStart"), mk(2, "UserPromptSubmit"), mk(2, "PreToolUse")].join("\n")
  let r = newLines(text, null)
  assert.equal(r.lines.length, 3)
  text += "\n" + [mk(2, "PostToolUse"), mk(3, "Stop")].join("\n")
  r = newLines(text, r.cursor)
  assert.deepEqual(r.lines.map(l => l.e), ["PostToolUse", "Stop"])
  assert.equal(newLines(text, r.cursor).lines.length, 0)
  assert.equal(parseLine("x".repeat(5000)), null)
  assert.equal(parseLine('{"t":"x"}'), null)
})
