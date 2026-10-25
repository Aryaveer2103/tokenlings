// Several accounts of the same agent: detection, sibling looks, and the hook
// routing each event to the pet on its account.
import { test } from "node:test"
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync, copyFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { ACCOUNTS, PROVIDERS, extraGlobs, dirFromEnv, absolute } from "../core/accounts.mjs"
import * as Siblings from "../core/siblings.mjs"
import * as Welcome from "../core/welcome.mjs"
import * as Config from "../core/config.mjs"
import { FORMS } from "../forms/forms.mjs"

const HOOK = fileURLToPath(new URL("../bin/tokenlings-hook", import.meta.url))
const CLI = fileURLToPath(new URL("../bin/tokenlings", import.meta.url))
const HOME = "/h/u"

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), "tkl-acct-"))
  chmodSync(root, 0o700)
  const home = join(root, "home")
  mkdirSync(join(home, ".config", "tokenlings"), { recursive: true })
  return { root, home, rt: root }
}
function petsJson(sb, pets) { writeFileSync(join(sb.home, ".config", "tokenlings", "pets.json"), JSON.stringify({ version: 1, pets })) }
function hook(sb, args, env) {
  return spawnSync("sh", [HOOK, ...args], {
    input: JSON.stringify({ session_id: "s1", hook_event_name: "Stop" }),
    env: Object.assign({ PATH: process.env.PATH, HOME: sb.home, XDG_RUNTIME_DIR: sb.rt }, env || {}), timeout: 10000
  })
}
const logOf = (sb, pet) => { const f = join(sb.rt, "tokenlings", "events", pet + ".log"); return existsSync(f) ? readFileSync(f, "utf8").trim().split("\n").filter(Boolean).length : 0 }

// ---- the table

test("the hook reads the same account variable as core/accounts.mjs for every provider", () => {
  const text = readFileSync(HOOK, "utf8")
  for (const p of PROVIDERS) {
    const a = ACCOUNTS[p]
    const line = text.split("\n").find(l => l.trim().startsWith(p + ")"))
    assert.ok(line, `${p}: no case line in the hook`)
    if (a.env) assert.ok(line.includes(a.env), `${p}: hook does not read ${a.env}`)
    if (!a.env && a.xdg) assert.ok(line.includes("XDG_CONFIG_HOME") && line.includes("/" + a.xdg), `${p}: hook does not use $XDG_CONFIG_HOME/${a.xdg}`)
    assert.ok(line.includes("/" + a.dir) || (a.xdg && line.includes("/" + a.xdg)), `${p}: default folder ${a.dir}`)
    assert.equal(/shared=1/.test(line), !!a.shared, `${p}: shared hook location`)
  }
})

test("extra-account patterns cover ~/.<dir>-* and ~/.config/<provider>-* for every provider", () => {
  for (const p of PROVIDERS) {
    const g = extraGlobs(p)
    assert.ok(g.some(x => x.startsWith(".config/" + p + "-")), `${p}: ${g}`)
    assert.ok(g.some(x => /^\.[a-z-]+\[-_\]\*$/.test(x)), `${p}: ${g}`)
  }
  assert.deepEqual(extraGlobs("claude"), [".claude[-_]*", ".config/claude-*"])
  assert.deepEqual(extraGlobs("opencode"), [".opencode[-_]*", ".config/opencode-*"])
})

test("an agent's environment names its account folder", () => {
  assert.equal(dirFromEnv("claude", { CLAUDE_CONFIG_DIR: "/h/u/.claude-work/" }, HOME), "/h/u/.claude-work")
  assert.equal(dirFromEnv("gemini", { GEMINI_CLI_HOME: "/h/u/alt" }, HOME), "/h/u/alt/.gemini")
  assert.equal(dirFromEnv("muse", { XDG_CONFIG_HOME: "/h/u/x" }, HOME), "/h/u/x/muse")
  assert.equal(dirFromEnv("grok", {}, HOME), "")
  assert.equal(absolute("~/.codex-2", HOME), "/h/u/.codex-2")
})

// ---- sibling looks

const minimal = pets => Config.load(JSON.stringify({ version: 1, pets }), { home: HOME })

test("the first account keeps the pure base form; siblings get their own look", () => {
  const r = minimal([
    { id: "work", provider: "claude", account: { configDir: "~/.claude-work" } },
    { id: "main", provider: "claude", account: { configDir: "~/.claude" } },
    { id: "b", provider: "claude", account: { configDir: "/h/u/.claude-b" } },
    { id: "slate", provider: "codex" }
  ])
  assert.equal(r.ok, true)
  const [work, main, b, slate] = r.config.pets
  assert.deepEqual(main.look.palette, FORMS.ember.look.palette, "the default folder is the base form, wherever it is in the list")
  assert.deepEqual(main.look.accessories, FORMS.ember.look.accessories)
  assert.equal(main.sibling, undefined)
  assert.equal(slate.sibling, undefined, "one Codex pet: no variant")
  for (const s of [work, b]) {
    assert.ok(s.sibling && s.sibling.rank >= 1)
    assert.notEqual(s.look.palette.body, FORMS.ember.look.palette.body)
    assert.equal(s.look.accessories.length, FORMS.ember.look.accessories.length + 1)
  }
  assert.notEqual(work.look.palette.body, b.look.palette.body, "two siblings differ from each other")
  assert.notEqual(work.sibling.accessory, b.sibling.accessory)
  assert.notEqual(work.sibling.turn, b.sibling.turn)
  const changed = Siblings.TRAITS.filter(t => work.personality[t] !== FORMS.ember.personality[t])
  assert.equal(changed.length, 1, "a nudge to one trait")
})

test("a sibling's look is seeded from its folder: stable across reinstalls and ~ vs absolute", () => {
  const a = minimal([{ id: "m", provider: "codex" }, { id: "x", provider: "codex", account: { configDir: "~/.codex-2" } }]).config.pets[1]
  const b = minimal([{ id: "other", provider: "codex" }, { id: "y", name: "Renamed", provider: "codex", account: { configDir: "/h/u/.codex-2/" } }]).config.pets[1]
  assert.deepEqual(a.look, b.look)
  assert.deepEqual(a.personality, b.personality)
})

test("grey, black and white bodies still change visibly", () => {
  for (const form of ["slate", "jinx", "mochi", "shell"]) {
    const base = FORMS[form].look.palette
    const turned = Siblings.turnPalette(base, 150)
    assert.notEqual(turned.body, base.body, form)
    assert.notEqual(turned.accent, base.accent, form)
  }
})

test("what the user sets wins; look.variant off keeps the base form", () => {
  const r = minimal([
    { id: "m", provider: "grok" },
    { id: "own", provider: "grok", account: { configDir: "~/.grok-work" }, look: { palette: { body: "#123456" }, accessories: ["cape"] }, personality: { energy: 0.1, sociability: 0.1, mischief: 0.1, sleepiness: 0.1 } },
    { id: "off", provider: "grok", account: { configDir: "~/.grok-3" }, look: { variant: "off" } }
  ])
  const [, own, off] = r.config.pets
  assert.equal(own.look.palette.body, "#123456")
  assert.deepEqual(own.look.accessories, ["cape"])
  assert.deepEqual(own.personality, { energy: 0.1, sociability: 0.1, mischief: 0.1, sleepiness: 0.1 })
  assert.deepEqual(off.look.palette, FORMS.jinx.look.palette)
  assert.equal(off.sibling, undefined)
  assert.deepEqual(r.warnings, [])
})

test("eight siblings of one provider all get different hues", () => {
  const pets = [{ id: "m", provider: "kimi" }]
  for (let i = 2; i <= 9; i++) pets.push({ id: "k" + i, provider: "kimi", account: { configDir: "~/.kimi-code-" + i } })
  const turns = minimal(pets).config.pets.slice(1).map(p => p.sibling.turn)
  assert.equal(new Set(turns).size, 8)
})

// ---- detection and proposals

test("proposals: names from the folder suffix, backups unticked, accounts already in pets.json skipped", () => {
  const found = Welcome.parseScan([
    "claude\t/h/u/.claude", "claude\t/h/u/.claude-work", "codex\t/h/u/.codex", "codex\t/h/u/.config/codex-2",
    "kimi\t/h/u/.kimi-code-alt", "claude\t/h/u/.claude-backup", "env\tgrok\t/srv/agents/grok-team", "grok\t/elsewhere/.grok-x",
    "env\tclaude\t/h/u/.claude-work", "nope\t/h/u/.nope", "claude\t/h/u/../etc"
  ].join("\n"), HOME)
  assert.deepEqual(found.map(f => f.dir), ["/h/u/.claude", "/h/u/.claude-work", "/h/u/.codex", "/h/u/.config/codex-2", "/h/u/.kimi-code-alt", "/h/u/.claude-backup", "/srv/agents/grok-team"])
  assert.equal(found.find(f => f.dir === "/srv/agents/grok-team").from, "env")
  const props = Welcome.propose(found, HOME, [{ id: "claude", name: "Ember", provider: "claude", account: { configDir: "~/.claude" } }])
  const byDir = Object.fromEntries(props.map(p => [p.account.configDir, p]))
  assert.equal(byDir["~/.claude"], undefined, "already a pet")
  assert.equal(byDir["~/.claude-work"].name, "Ember Work")
  assert.equal(byDir["~/.claude-work"].id, "claude-work")
  assert.equal(byDir["~/.config/codex-2"].name, "Slate 2")
  assert.equal(byDir["~/.kimi-code-alt"].name, "Mochi Alt")
  assert.equal(byDir["/srv/agents/grok-team"].name, "Jinx Team")
  assert.equal(byDir["~/.claude-backup"].selected, false)
  assert.equal(byDir["~/.claude-work"].selected, true)
})

test("the scan finds extra accounts of every provider by folder, and by a running agent's environment", async () => {
  const sb = sandbox()
  const h = sb.home
  const made = []
  for (const p of PROVIDERS) {
    const a = ACCOUNTS[p]
    const leaf = a.dir.replace(/^\.config\//, "").replace(/^\./, "")
    for (const d of [a.dir, "." + leaf + "-work", ".config/" + p + "-2"]) {
      mkdirSync(join(h, d, a.marker[0]), { recursive: true })
      made.push(p + "\t" + join(h, d))
    }
  }
  mkdirSync(join(h, ".claude-empty"))          // no marker: not an account
  // a running "grok" with GROK_HOME pointing outside the patterns
  const elsewhere = join(sb.root, "team-grok")
  mkdirSync(elsewhere)
  const bin = join(sb.root, "bin")
  mkdirSync(bin)
  copyFileSync("/usr/bin/sleep", join(bin, "grok"))
  chmodSync(join(bin, "grok"), 0o755)
  const agent = spawn(join(bin, "grok"), ["30"], { env: { GROK_HOME: elsewhere, SECRET_TOKEN: "do-not-read" }, stdio: "ignore" })
  await new Promise(r => setTimeout(r, 150))
  try {
    const r = spawnSync("sh", ["-c", Welcome.scanScript()], { env: { PATH: process.env.PATH, HOME: h }, encoding: "utf8", timeout: 20000 })
    assert.equal(r.status, 0, r.stderr)
    const lines = r.stdout.trim().split("\n")
    for (const m of made) assert.ok(lines.includes(m), `missing ${m}`)
    assert.ok(!r.stdout.includes(".claude-empty"))
    assert.ok(lines.includes("env\tgrok\t" + elsewhere), r.stdout)
    assert.ok(!r.stdout.includes("do-not-read"), "only account variables are kept")
    const found = Welcome.parseScan(r.stdout, h)
    assert.ok(found.some(f => f.dir === elsewhere && f.from === "env"))
  } finally {
    agent.kill()
    rmSync(sb.root, { recursive: true, force: true })
  }
})

// ---- routing

test("claude: a session on another account no longer drives this account's pet", () => {
  const sb = sandbox()
  petsJson(sb, [{ id: "main", provider: "claude", account: { configDir: "~/.claude" } }, { id: "work", provider: "claude", account: { configDir: "~/.claude-work" } }])
  const work = { CLAUDE_CONFIG_DIR: join(sb.home, ".claude-work") }
  // hooks installed before --account existed: pets.json says whose session it is
  hook(sb, ["--pet", "main", "--provider", "claude"], work)
  hook(sb, ["--pet", "work", "--provider", "claude"], work)
  assert.equal(logOf(sb, "main"), 0, "~/.claude's hooks (loaded as project settings in $HOME) leave it alone")
  assert.equal(logOf(sb, "work"), 1)
  // hooks with --account: decided without pets.json
  rmSync(join(sb.home, ".config", "tokenlings", "pets.json"))
  hook(sb, ["--pet", "main", "--provider", "claude", "--account", join(sb.home, ".claude")], work)
  hook(sb, ["--pet", "work", "--provider", "claude", "--account", join(sb.home, ".claude-work")], work)
  assert.equal(logOf(sb, "main"), 0)
  assert.equal(logOf(sb, "work"), 2)
  // the default account (no variable) still reaches the main pet
  hook(sb, ["--pet", "main", "--provider", "claude", "--account", join(sb.home, ".claude")])
  assert.equal(logOf(sb, "main"), 1)
  rmSync(sb.root, { recursive: true, force: true })
})

test("grok: one hook file, each event routed to the pet on its GROK_HOME", () => {
  const sb = sandbox()
  const homeA = join(sb.root, "grok-a"), homeB = join(sb.root, "grok-b")
  petsJson(sb, [{ id: "jinx", provider: "grok" }, { id: "jinx-b", provider: "grok", account: { configDir: homeB } }, { id: "ember", provider: "claude" }])
  const g = env => hook(sb, ["--pet", "jinx", "--provider", "grok"], Object.assign({ GROK_HOOK_EVENT: "Stop" }, env))
  g({})                                   // default home
  g({ GROK_HOME: homeB })                 // second account
  g({ GROK_HOME: homeB + "/" })
  g({ GROK_HOME: homeA })                 // an account no pet is on: the default pet
  assert.equal(logOf(sb, "jinx"), 2)
  assert.equal(logOf(sb, "jinx-b"), 2)
  // Grok also runs Claude's hooks: those never reach the Claude pet
  hook(sb, ["--pet", "ember", "--provider", "claude"], { GROK_HOOK_EVENT: "Stop", GROK_HOME: homeB })
  assert.equal(logOf(sb, "ember"), 0)
  rmSync(sb.root, { recursive: true, force: true })
})

test("routing reads pets.json bounded: a FIFO, a huge file or junk falls back to --pet", () => {
  const sb = sandbox()
  const cfg = join(sb.home, ".config", "tokenlings", "pets.json")
  writeFileSync(cfg, "x".repeat(300000))
  hook(sb, ["--pet", "jinx", "--provider", "grok"], { GROK_HOME: "/x/y" })
  writeFileSync(cfg, '{"pets":[{"id":"../../evil","provider":"grok","account":{"configDir":"/x/y"}}]}')
  hook(sb, ["--pet", "jinx", "--provider", "grok"], { GROK_HOME: "/x/y" })
  rmSync(cfg)
  spawnSync("mkfifo", [cfg])
  const r = hook(sb, ["--pet", "jinx", "--provider", "grok"], { GROK_HOME: "/x/y" })
  assert.equal(r.status, 0)
  assert.equal(logOf(sb, "jinx"), 3)
  rmSync(sb.root, { recursive: true, force: true })
})

// ---- installer

test("installed hooks carry their account folder; OpenCode's shared plugin does not", () => {
  const sb = sandbox()
  const env = { PATH: process.env.PATH, HOME: sb.home, XDG_CONFIG_HOME: join(sb.home, ".config"), XDG_STATE_HOME: join(sb.root, "state") }
  const run = args => spawnSync("sh", [CLI, ...args], { env, encoding: "utf8" })
  mkdirSync(join(sb.home, ".codex-2"))
  let r = run(["hooks", "install", "codex", "--pet", "slate-2", "--config-dir", "~/.codex-2", "--yes"])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /CODEX_HOME=.*\.codex-2.*\/hooks/, "the trust step names the account")
  const codex = JSON.parse(readFileSync(join(sb.home, ".codex-2", "hooks.json"), "utf8"))
  assert.ok(codex.hooks.Stop[0].hooks[0].command.includes(`--account '${join(sb.home, ".codex-2")}'`))
  // Grok: each GROK_HOME reads its own hooks folder
  r = run(["hooks", "install", "grok", "--pet", "jinx", "--yes"])
  assert.equal(r.status, 0, r.stderr)
  const grok = JSON.parse(readFileSync(join(sb.home, ".grok", "hooks", "tokenlings.json"), "utf8"))
  assert.ok(grok.hooks.Stop[0].hooks[0].command.includes(`--account '${join(sb.home, ".grok")}'`))
  r = spawnSync("sh", [CLI, "hooks", "install", "grok", "--pet", "jinx-b", "--yes"], { env: Object.assign({}, env, { GROK_HOME: join(sb.root, "grok-b") }), encoding: "utf8" })
  assert.equal(r.status, 0, r.stderr)
  assert.ok(existsSync(join(sb.root, "grok-b", "hooks", "tokenlings.json")))
  // OpenCode: one global plugin for every account, routed by environment
  r = run(["hooks", "install", "opencode", "--pet", "shell", "--yes"])
  assert.equal(r.status, 0, r.stderr)
  assert.ok(!readFileSync(join(sb.home, ".config", "opencode", "plugins", "tokenlings.js"), "utf8").includes("--account"))
  // doctor: none of the new Codex hooks is trusted yet
  r = run(["doctor", "--json"])
  const codexCheck = JSON.parse(r.stdout).find(c => c.check === "codex")
  assert.equal(codexCheck.status, "warn")
  assert.match(codexCheck.detail, /8 of 8 hooks .* not trusted/)
  writeFileSync(join(sb.home, ".codex-2", "config.toml"), Object.keys(codex.hooks).map(ev =>
    `[hooks.state."${join(sb.home, ".codex-2", "hooks.json")}:${ev.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()}:0:0"]\ntrusted_hash = "sha256:x"\n`).join("\n"))
  r = run(["doctor", "--json"])
  assert.equal(JSON.parse(r.stdout).find(c => c.check === "codex").status, "ok")
  rmSync(sb.root, { recursive: true, force: true })
})
