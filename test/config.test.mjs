import { test } from "node:test"
import assert from "node:assert/strict"
import * as Config from "../core/config.mjs"

test("no file means one demo pet", () => {
  const d = Config.defaults()
  assert.equal(d.pets.length, 1)
  assert.equal(d.pets[0].baseForm, "bit")
  assert.equal(d.pets[0].demo, true)
  assert.equal(d.settings.notifications, false)
  assert.equal(d.settings.showCwd, false)
})

test("invalid files are rejected, not half-loaded", () => {
  assert.equal(Config.load("{ nope").ok, false)
  assert.equal(Config.load('"just a string"').ok, false)
  assert.equal(Config.load('{"version": 1, "pets": {}}').ok, false)
  assert.equal(Config.load('{"version": 99, "pets": []}').ok, false)
  assert.equal(Config.load("x".repeat(Config.MAX_BYTES + 1)).ok, false)
})

test("a minimal pet fills in from its provider's base form", () => {
  const r = Config.load(JSON.stringify({ version: 1, pets: [{ id: "work", provider: "claude" }] }))
  assert.equal(r.ok, true)
  const p = r.config.pets[0]
  assert.equal(p.baseForm, "ember")
  assert.equal(p.name, "Ember")
  assert.equal(p.look.body, "dumpling")
  assert.equal(p.signatureMove, "bowAndSpin")
  assert.deepEqual(r.warnings, [])
})

test("bad fields are fixed with a warning and the pet still loads", () => {
  const r = Config.load(JSON.stringify({
    version: 1,
    settings: { roaming: "everywhere", quietHours: { from: "25:00" } },
    pets: [{ id: "Bad Id!", provider: "codex", look: { eyes: "laser", palette: { body: "red" }, accessories: ["cape", "jetpack", "cape"] },
             personality: { energy: 7, mischief: "lots" }, onClick: "explode" }]
  }))
  assert.equal(r.ok, true)
  const p = r.config.pets[0]
  assert.equal(p.id, "slate")
  assert.equal(p.look.eyes, "dot")
  assert.deepEqual(p.look.accessories, ["cape"])
  assert.equal(p.personality.energy, 1)
  assert.equal(p.onClick, "focus")
  assert.equal(r.config.settings.roaming, "bar")
  assert.equal(r.config.settings.quietHours.from, "22:00")
  assert.ok(r.warnings.length >= 7, r.warnings.join("\n"))
})

test("duplicate ids are made unique", () => {
  const r = Config.load(JSON.stringify({ version: 1, pets: [{ id: "a" }, { id: "a" }, { id: "a" }] }))
  assert.deepEqual(r.config.pets.map(p => p.id), ["a", "a-2", "a-3"])
})

test("v0 files migrate: bare arrays and look.colors", () => {
  const r = Config.load(JSON.stringify([{ id: "old", provider: "gemini", look: { colors: { body: "#112233" } } }]))
  assert.equal(r.ok, true)
  assert.equal(r.migratedFrom, 0)
  assert.equal(r.config.version, 1)
  assert.equal(r.config.pets[0].look.palette.body, "#112233")
})

test("pet count is capped", () => {
  const pets = Array.from({ length: Config.MAX_PETS + 5 }, (_, i) => ({ id: "p" + i }))
  const r = Config.load(JSON.stringify({ version: 1, pets }))
  assert.equal(r.config.pets.length, Config.MAX_PETS)
})

test("names are plain, trimmed and bounded", () => {
  const r = Config.load(JSON.stringify({ version: 1, pets: [{ id: "x", name: "  <b>Clever</b> name that is far too long  " }] }))
  assert.equal(r.config.pets[0].name, "<b>Clever</b> name that")
})

test("the JSON Schema lists exactly the parts and forms the code knows", async () => {
  const { readFile } = await import("node:fs/promises")
  const { LIBRARY } = await import("../core/compose.mjs")
  const { FORMS } = await import("../forms/forms.mjs")
  const schema = JSON.parse(await readFile(new URL("../schema/pets.schema.json", import.meta.url), "utf8"))
  const look = schema.properties.pets.items.properties.look.properties
  assert.deepEqual(look.body.enum, Object.keys(LIBRARY.bodies))
  assert.deepEqual(look.eyes.enum, Object.keys(LIBRARY.eyes))
  assert.deepEqual(look.mouth.enum, Object.keys(LIBRARY.mouths))
  assert.deepEqual(look.topper.enum, Object.keys(LIBRARY.toppers))
  assert.deepEqual(look.pattern.enum, Object.keys(LIBRARY.patterns))
  assert.deepEqual(look.accessories.items.enum, Object.keys(LIBRARY.accessories))
  assert.deepEqual(schema.properties.pets.items.properties.baseForm.enum, Object.keys(FORMS))
  const { EVOLUTION_NAMES } = await import("../assets/parts/evolutions.mjs")
  assert.deepEqual(look.evolution.enum, EVOLUTION_NAMES)
})

test("older signature move names are read as their successors", () => {
  const r = Config.load(JSON.stringify({ version: 1, pets: [{ id: "a", provider: "codex", signatureMove: "moonwalk" }, { id: "b", signatureMove: "thoughtfulSpin" }] }))
  assert.equal(r.config.pets[0].signatureMove, "moonwalkLaunch")
  assert.equal(r.config.pets[1].signatureMove, "bowAndSpin")
  assert.deepEqual(r.warnings, [])
})

test("evolution settings are validated", () => {
  const r = Config.load(JSON.stringify({ version: 1, pets: [{ id: "a", provider: "claude", look: { evolution: "astral", evolved: "on" } }, { id: "b", look: { evolution: "nope", evolved: 1 } }] }))
  assert.equal(r.config.pets[0].look.evolution, "astral")
  assert.equal(r.config.pets[0].look.evolved, "on")
  assert.equal(r.config.pets[1].look.evolution, "prime")
  assert.equal(r.warnings.length, 2)
})
