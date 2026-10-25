import { test } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { encode, decode, cksum, PREFIX } from "../core/card.mjs"
import { load, defaultPet } from "../core/config.mjs"
import { propose, parseScan, configFrom, scanScript } from "../core/welcome.mjs"

const CLI = new URL("../bin/tokenlings", import.meta.url).pathname

function petFrom(raw) { const r = load(JSON.stringify({ version: 1, pets: [raw] })); return r.config.pets[0] }

test("cards round-trip a pet's design and nothing about the machine", () => {
  const pet = petFrom({ id: "work", name: "Émber ✓", provider: "claude", account: { configDir: "~/.claude-work" },
                        look: { body: "bean", accessories: ["scarf", "roundGlasses"], palette: { body: "#123456" } }, personality: { energy: 0.9 } })
  const card = encode(pet)
  assert.ok(card.startsWith(PREFIX) && card.length < 1200, card.length)
  assert.ok(!card.includes("claude-work"))
  const r = decode(card)
  assert.ok(r.ok, r.errors.join("; "))
  assert.equal(r.pet.name, "Émber ✓")
  assert.equal(r.pet.look.body, "bean")
  assert.deepEqual(r.pet.look.accessories, ["scarf", "roundGlasses"])
  assert.equal(r.pet.personality.energy, 0.9)
  assert.equal(r.pet.account, undefined)
  assert.equal(r.pet.id, undefined)
  // a hashed palette (Bit) is left out, so the importer hashes its own
  const bit = decode(encode(defaultPet("whatever", "w", "W")))
  assert.ok(bit.ok)
  assert.equal(bit.pet.look.palette, undefined)
})

test("cards are strict: damaged, foreign or oversized cards are refused", () => {
  const good = encode(defaultPet("claude"))
  const body = good.slice(PREFIX.length, good.lastIndexOf("."))
  const sum = good.slice(good.lastIndexOf(".") + 1)
  const forge = obj => { const b = Buffer.from(JSON.stringify(obj)); return PREFIX + b.toString("base64url") + "." + cksum([...b]).toString(16).padStart(8, "0") }
  const base = JSON.parse(Buffer.from(body, "base64url").toString())
  const bad = [
    "", "tkl2:" + body + "." + sum, PREFIX + body, PREFIX + body + ".00000000", PREFIX + body.slice(0, -2) + "." + sum,
    PREFIX + "!!!!" + "." + sum, good + "x".repeat(5000),
    forge(Object.assign({}, base, { extra: 1 })),
    forge(Object.assign({}, base, { l: Object.assign({}, base.l, { body: "<img src=x>" }) })),
    forge(Object.assign({}, base, { l: Object.assign({}, base.l, { accessories: ["crown", "crown"] }) })),
    forge(Object.assign({}, base, { l: Object.assign({}, base.l, { palette: { body: "red" } }) })),
    forge(Object.assign({}, base, { q: Object.assign({}, base.q, { energy: 7 }) })),
    forge(Object.assign({}, base, { n: "x".repeat(40) })),
    forge(Object.assign({}, base, { p: "../../etc" })),
    forge(Object.assign({}, base, { m: "rm -rf" })),
    forge([1, 2, 3]),
    PREFIX + Buffer.from([0xff, 0xfe, 0x00]).toString("base64url") + "." + cksum([0xff, 0xfe, 0x00]).toString(16).padStart(8, "0")
  ]
  for (const c of bad) assert.equal(decode(c).ok, false, c.slice(0, 60))
})

test("the CLI and the panel read each other's cards, with the same rules", () => {
  const home = mkdtempSync(join(tmpdir(), "tkl-card-"))
  const env = Object.assign({}, process.env, { HOME: home, XDG_CONFIG_HOME: join(home, ".config"), XDG_STATE_HOME: join(home, ".state") })
  mkdirSync(join(home, ".config", "tokenlings"), { recursive: true })
  const pet = petFrom({ id: "a", name: "Pixel", provider: "codex", look: { topper: "ponytail", palette: { body: "#AA3355" } } })
  writeFileSync(join(home, ".config", "tokenlings", "pets.json"), JSON.stringify({ version: 1, pets: [{ id: "a", name: "Pixel", provider: "codex", look: { topper: "sprout", palette: { body: "#AA3355" } } }] }))
  // CLI → panel
  const fromCli = execFileSync(CLI, ["export", "a"], { env }).toString().trim()
  const r = decode(fromCli)
  assert.ok(r.ok, r.errors.join("; "))
  assert.equal(r.pet.look.topper, "sprout")
  assert.equal(r.pet.look.palette.body, "#AA3355")
  // panel → CLI
  const card = encode(pet)
  execFileSync(CLI, ["import", card, "--id", "b", "--yes"], { env })
  const after = JSON.parse(readFileSync(join(home, ".config", "tokenlings", "pets.json"), "utf8"))
  const b = after.pets.find(p => p.id === "b")
  assert.equal(b.name, "Pixel")
  assert.equal(b.look.topper, "ponytail")
  assert.equal(load(JSON.stringify(after)).warnings.length, 0)
  // the CLI refuses what the panel refuses
  const forged = (() => { const d = JSON.parse(Buffer.from(card.slice(5, card.lastIndexOf(".")), "base64url").toString()); d.l.body = "nope"; const b2 = Buffer.from(JSON.stringify(d)); return PREFIX + b2.toString("base64url") + "." + cksum([...b2]).toString(16).padStart(8, "0") })()
  assert.throws(() => execFileSync(CLI, ["import", forged, "--yes"], { env, stdio: "pipe" }))
  assert.throws(() => execFileSync(CLI, ["import", card.slice(0, -3) + "abc", "--yes"], { env, stdio: "pipe" }))
})

test("first run: accounts found → one pet each, unique ids and names, nothing else read", () => {
  const home = "/h/u"
  const found = parseScan(["claude\t/h/u/.claude", "claude\t/h/u/.claude-b", "codex\t/h/u/.codex", "evil\t/etc", "claude\t/tmp/x", "gemini\t/h/u/.gemini\u0007"].join("\n"), home)
  assert.deepEqual(found.map(f => f.dir), ["/h/u/.claude", "/h/u/.claude-b", "/h/u/.codex"])
  const p = propose(found, home)
  assert.deepEqual(p.map(x => x.id), ["claude", "claude-b", "codex"])
  assert.deepEqual(p.map(x => x.name), ["Ember", "Ember B", "Slate"])
  assert.deepEqual(p.map(x => x.account.configDir), ["~/.claude", "~/.claude-b", "~/.codex"])
  const cfg = configFrom(p, {}, "../../omarchy/plugins/io.github.aryaveer2103.tokenlings/schema/pets.schema.json")
  const r = load(JSON.stringify(cfg))
  assert.ok(r.ok)
  assert.equal(r.warnings.length, 0)
  assert.deepEqual(r.config.pets.map(x => x.baseForm), ["ember", "ember", "slate"])
  // the scan itself runs in a fake home and lists folders only
  const fake = mkdtempSync(join(tmpdir(), "tkl-home-"))
  for (const d of [".claude", ".claude-work", ".codex", ".gemini"]) mkdirSync(join(fake, d))
  writeFileSync(join(fake, ".claude", "settings.json"), "{}")
  writeFileSync(join(fake, ".claude-work", "settings.json"), "{}")
  writeFileSync(join(fake, ".claude-backup.tgz"), "x")
  mkdirSync(join(fake, ".codex", "sessions"))
  const out = execFileSync("sh", ["-c", scanScript()], { env: { HOME: fake, PATH: process.env.PATH } }).toString()
  assert.deepEqual(parseScan(out, fake).filter(f => f.from === "folder").map(f => f.provider + ":" + f.dir.slice(fake.length)), ["claude:/.claude", "claude:/.claude-work", "codex:/.codex"])
})
