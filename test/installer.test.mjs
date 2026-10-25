import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const CLI = fileURLToPath(new URL("../bin/tokenlings", import.meta.url))

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), "tkl-inst-"))
  const env = { PATH: process.env.PATH, HOME: join(root, "home"), XDG_STATE_HOME: join(root, "state"), XDG_CONFIG_HOME: join(root, "cfg"), XDG_RUNTIME_DIR: root }
  mkdirSync(env.HOME, { recursive: true })
  return { root, env }
}
function cli(sb, args) { return spawnSync("sh", [CLI, ...args], { env: sb.env, encoding: "utf8" }) }
const json = f => JSON.parse(readFileSync(f, "utf8"))

const FOREIGN = { command: "bash '/somewhere/herdr-agent-state.sh' session", timeout: 10, type: "command" }

test("claude: merges beside foreign hooks, is idempotent, uninstalls back to the original", () => {
  const sb = sandbox(), dir = join(sb.root, "claude-b")
  mkdirSync(dir)
  const original = { model: "x", hooks: { SessionStart: [{ hooks: [FOREIGN] }], PreToolUse: [{ matcher: "Bash", hooks: [FOREIGN] }] } }
  writeFileSync(join(dir, "settings.json"), JSON.stringify(original, null, 2))
  let r = cli(sb, ["hooks", "install", "claude", "--pet", "work", "--config-dir", dir, "--yes"])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /\+.*tokenlings-hook/, "a diff is shown")
  const s = json(join(dir, "settings.json"))
  assert.equal(s.model, "x")
  assert.deepEqual(s.hooks.SessionStart[0], { hooks: [FOREIGN] })
  assert.ok(s.hooks.SessionStart[1].hooks[0].command.includes("--pet work --provider claude --event SessionStart"))
  assert.ok(s.hooks.Stop && s.hooks.SessionEnd && s.hooks.PermissionRequest)
  r = cli(sb, ["hooks", "install", "claude", "--pet", "work", "--config-dir", dir, "--yes"])
  assert.match(r.stdout, /already up to date/)
  assert.ok(readdirSync(join(sb.env.XDG_STATE_HOME, "tokenlings", "backups")).length >= 1, "a backup was taken")
  r = cli(sb, ["hooks", "uninstall", "claude", "--config-dir", dir, "--yes"])
  assert.equal(r.status, 0, r.stderr)
  assert.deepEqual(json(join(dir, "settings.json")), original)
})

test("without a yes nothing is written", () => {
  const sb = sandbox(), dir = join(sb.root, "c")
  mkdirSync(dir)
  writeFileSync(join(dir, "settings.json"), "{}")
  const r = spawnSync("sh", [CLI, "hooks", "install", "claude", "--pet", "p", "--config-dir", dir], { env: sb.env, encoding: "utf8", input: "n\n" })
  assert.equal(readFileSync(join(dir, "settings.json"), "utf8"), "{}")
  assert.match(r.stdout, /nothing written/)
  const dry = cli(sb, ["hooks", "install", "claude", "--pet", "p", "--config-dir", dir, "--dry-run"])
  assert.match(dry.stdout, /dry run/)
  assert.equal(readFileSync(join(dir, "settings.json"), "utf8"), "{}")
})

test("codex: append-only, and nobody else's group ever changes position", () => {
  const sb = sandbox(), dir = join(sb.root, "codex")
  mkdirSync(dir)
  writeFileSync(join(dir, "hooks.json"), JSON.stringify({ hooks: { SessionStart: [{ hooks: [FOREIGN] }, { hooks: [{ type: "command", command: "other" }] }] } }))
  cli(sb, ["hooks", "install", "codex", "--pet", "slate", "--config-dir", dir, "--yes"])
  let h = json(join(dir, "hooks.json")).hooks
  assert.deepEqual(h.SessionStart[0], { hooks: [FOREIGN] })
  assert.equal(h.SessionStart[1].hooks[0].command, "other")
  assert.ok(h.SessionStart[2].hooks[0].command.includes("--pet slate"))
  // someone appends after us; a reinstall keeps our index, uninstall empties ours in place
  h.SessionStart.push({ hooks: [{ type: "command", command: "later" }] })
  writeFileSync(join(dir, "hooks.json"), JSON.stringify({ hooks: h }))
  cli(sb, ["hooks", "install", "codex", "--pet", "slate", "--config-dir", dir, "--yes"])
  h = json(join(dir, "hooks.json")).hooks
  assert.ok(h.SessionStart[2].hooks[0].command.includes("--pet slate"))
  assert.equal(h.SessionStart[3].hooks[0].command, "later")
  cli(sb, ["hooks", "uninstall", "codex", "--config-dir", dir, "--yes"])
  h = json(join(dir, "hooks.json")).hooks
  assert.deepEqual(h.SessionStart[2], { hooks: [] })
  assert.equal(h.SessionStart[3].hooks[0].command, "later")
  assert.equal(h.Stop, undefined, "where ours was last, it is removed")
})

test("kimi: a marked [[hooks]] block, removed cleanly; inline hooks are refused", () => {
  const sb = sandbox(), dir = join(sb.root, "kimi")
  mkdirSync(dir)
  const original = 'default_model = "k2"\n\n[providers.moonshot]\nbase_url = "x"\n'
  writeFileSync(join(dir, "config.toml"), original)
  cli(sb, ["hooks", "install", "kimi", "--pet", "mochi", "--config-dir", dir, "--yes"])
  const t = readFileSync(join(dir, "config.toml"), "utf8")
  assert.ok(t.startsWith(original))
  assert.match(t, /\[\[hooks\]\]\nevent = "PreToolUse"\ncommand = "\[ -x '.*' \] && '.*' --pet mochi --provider kimi --event PreToolUse --account '[^']*'; exit 0"\ntimeout = 5/)
  cli(sb, ["hooks", "uninstall", "kimi", "--config-dir", dir, "--yes"])
  assert.equal(readFileSync(join(dir, "config.toml"), "utf8").trimEnd(), original.trimEnd())
  writeFileSync(join(dir, "config.toml"), "hooks = []\n")
  const r = cli(sb, ["hooks", "install", "kimi", "--pet", "mochi", "--config-dir", dir, "--yes"])
  assert.notEqual(r.status, 0)
  assert.equal(readFileSync(join(dir, "config.toml"), "utf8"), "hooks = []\n")
})

test("grok, opencode: files of our own; muse gets its schema_version", () => {
  const sb = sandbox()
  const g = join(sb.root, "grok")
  cli(sb, ["hooks", "install", "grok", "--pet", "jinx", "--config-dir", g, "--yes"])
  assert.ok(json(join(g, "hooks", "tokenlings.json")).hooks.StopCancelled)
  const o = join(sb.root, "oc")
  cli(sb, ["hooks", "install", "opencode", "--pet", "shell", "--config-dir", o, "--yes"])
  const js = readFileSync(join(o, "plugins", "tokenlings.js"), "utf8")
  assert.ok(js.includes('const PET = "shell"') && !js.includes("@HOOK@"))
  cli(sb, ["hooks", "uninstall", "opencode", "--config-dir", o, "--yes"])
  assert.ok(!existsSync(join(o, "plugins", "tokenlings.js")))
  const m = join(sb.root, "muse")
  cli(sb, ["hooks", "install", "muse", "--pet", "lyra", "--config-dir", m, "--yes"])
  assert.equal(json(join(m, "settings.json")).schema_version, 1)
})

test("guarded hook commands do nothing when the plugin is gone", () => {
  const sb = sandbox(), dir = join(sb.root, "c")
  cli(sb, ["hooks", "install", "claude", "--pet", "p", "--config-dir", dir, "--yes"])
  const cmd = json(join(dir, "settings.json")).hooks.Stop[0].hooks[0].command.replace(/'[^']*tokenlings-hook'/g, "'/nonexistent/tokenlings-hook'")
  const r = spawnSync("sh", ["-c", cmd], { input: "{}", encoding: "utf8" })
  assert.equal(r.status, 0)
  assert.equal(r.stdout + r.stderr, "")
})

test("status and doctor answer in JSON", () => {
  const sb = sandbox(), dir = join(sb.env.HOME, ".claude")
  mkdirSync(dir, { recursive: true })
  cli(sb, ["hooks", "install", "claude", "--pet", "ember", "--yes"])
  const st = JSON.parse(cli(sb, ["hooks", "status", "--json"]).stdout)
  assert.ok(st.some(x => x.provider === "claude" && x.pets.includes("ember")))
  const doc = JSON.parse(cli(sb, ["doctor", "--json"]).stdout)
  assert.ok(doc.some(x => x.check === "hook" && x.status === "ok"))
})
