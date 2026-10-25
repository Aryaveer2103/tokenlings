import { test } from "node:test"
import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync, symlinkSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { READ_SCRIPT, parse } from "../core/safe.mjs"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const read = (path, cap, links) => parse(execFileSync("sh", ["-c", READ_SCRIPT, "sh", path, String(cap + 1), links ? "links" : "nolinks"], { timeout: 3000 }).toString("latin1"), cap)

test("the shell's file reads: regular files of ours only, never symlinks or FIFOs, always capped", () => {
  const d = mkdtempSync(join(tmpdir(), "tkl-safe-"))
  writeFileSync(join(d, "ok.json"), '{"a":1}')
  writeFileSync(join(d, "big"), "x".repeat(300000))
  symlinkSync(join(d, "ok.json"), join(d, "link"))
  mkdirSync(join(d, "dir"))
  execFileSync("mkfifo", [join(d, "fifo")])
  assert.deepEqual(read(join(d, "ok.json"), 1024), { state: "ok", text: '{"a":1}', truncated: false })
  const big = read(join(d, "big"), 262144)
  assert.ok(big.state === "ok" && big.truncated && big.text.length === 262144)
  assert.equal(read(join(d, "link"), 1024).state, "refused")
  assert.equal(read(join(d, "link"), 1024, true).state, "ok")     // pets.json may be a dotfile link
  symlinkSync(join(d, "fifo"), join(d, "fifolink"))
  assert.equal(read(join(d, "fifolink"), 1024, true).state, "refused")
  assert.equal(read(join(d, "dir"), 1024).state, "refused")
  assert.equal(read(join(d, "fifo"), 1024).state, "refused")      // and returns at once (timeout 3 s)
  assert.equal(read(join(d, "missing"), 1024).state, "missing")
  assert.equal(read("/dev/zero", 1024).state, "refused")
  assert.equal(read("/etc/passwd", 1024).state, "refused")         // not ours
})

test("every external string in the QML is plain text", () => {
  const files = []
  const walk = dir => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) { if (f !== ".dev" && f !== ".git" && f !== "node_modules") walk(p) } else if (f.endsWith(".qml")) files.push(p) } }
  walk(ROOT)
  const bad = []
  for (const f of files) {
    const src = readFileSync(f, "utf8")
    // each Text { … } block (and TextEdit/TextInput) must set textFormat: Text.PlainText
    const re = /\b(Text|TextEdit|Label)\s*\{/g
    let m
    while ((m = re.exec(src))) {
      let depth = 0, i = m.index + m[0].length - 1, end = i
      for (; i < src.length; i++) { if (src[i] === "{") depth++; else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break } } }
      const body = src.slice(m.index, end)
      // nested blocks belong to their own check: look at this block's own lines only
      if (!/textFormat:\s*Text\.PlainText/.test(body)) bad.push(f.slice(ROOT.length) + ":" + src.slice(0, m.index).split("\n").length)
    }
  }
  assert.deepEqual(bad, [])
})

test("no personal names, home paths or agent-control files in tracked files", () => {
  // the pattern is built here so this file does not match itself
  const pattern = ["mi" + "key", "clau" + "da", "clau" + "di", "co" + "sex", "/ho" + "me/"].join("|")
  const r = spawnSync("git", ["-C", ROOT, "grep", "-niE", pattern], { encoding: "utf8" })
  assert.equal(r.stdout.trim(), "", r.stdout)
  const tracked = spawnSync("git", ["-C", ROOT, "ls-files"], { encoding: "utf8" }).stdout.split("\n")
  assert.ok(!tracked.some(f => /(^|\/)(CLAUDE|AGENTS)\.md$/.test(f)))
})
