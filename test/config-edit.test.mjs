import { test } from "node:test"
import assert from "node:assert/strict"
import { edit, setPet, addPet, removePet, setSetting, freshId, rawOf, load } from "../core/config.mjs"

const SCHEMA = "file:///plugin/schema/pets.schema.json"

test("edits touch only what changed and keep the user's own file as written", () => {
  const mine = JSON.stringify({ "$schema": "x.json", version: 1, settings: { social: false }, pets: [{ id: "a", provider: "claude", look: { body: "bean" } }, { id: "b", provider: "codex" }] }, null, 2)
  const next = edit(mine, raw => setPet(raw, "a", { "look.eyes": "sleepy", name: "Ada" }), SCHEMA)
  const doc = JSON.parse(next)
  assert.equal(doc["$schema"], "x.json")
  assert.deepEqual(doc.settings, { social: false })
  assert.deepEqual(doc.pets[0], { id: "a", provider: "claude", look: { body: "bean", eyes: "sleepy" }, name: "Ada" })
  assert.deepEqual(doc.pets[1], { id: "b", provider: "codex" })
  assert.ok(next.endsWith("\n"))
  // undefined removes a field
  const less = JSON.parse(edit(next, raw => setPet(raw, "a", { name: undefined })))
  assert.equal(less.pets[0].name, undefined)
})

test("no file yet: the first save writes a new one with the schema", () => {
  const text = edit("", raw => addPet(raw, { id: "ember", provider: "claude" }), SCHEMA)
  const doc = JSON.parse(text)
  assert.equal(Object.keys(doc)[0], "$schema")
  assert.equal(doc["$schema"], SCHEMA)
  assert.equal(load(text).config.pets[0].baseForm, "ember")
})

test("settings, adding, removing, fresh ids", () => {
  let text = edit("", raw => { addPet(raw, { id: "x", provider: "demo" }); setSetting(raw, "roaming", "desktop") })
  assert.equal(load(text).config.settings.roaming, "desktop")
  assert.equal(freshId(rawOf(text), "x"), "x-2")
  assert.equal(freshId(rawOf(text), "Émber Work!"), "mber-work")
  assert.equal(freshId(rawOf(text), "--"), "pet")
  text = edit(text, raw => removePet(raw, "x"))
  assert.equal(load(text).config.pets.length, 0)
  assert.throws(() => edit(text, raw => setSetting(raw, "nope", 1)))
  assert.throws(() => edit(text, raw => addPet(raw, { id: "Bad Id" })))
  assert.throws(() => edit(text, raw => setPet(raw, "ghost", { name: "x" })))
})

test("an edit that would make the file unusable is refused before writing", () => {
  assert.throws(() => edit('{"version": 1, "pets": []}', raw => { raw.pets = "oops" }))
  assert.throws(() => edit('{"version": 1, "pets": []}', raw => { raw.version = 99 }))
  assert.throws(() => edit("{ not json"))
})
