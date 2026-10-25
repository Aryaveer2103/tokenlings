// pets.json: parsing, migrations, validation and defaults.
//
// load(text) → { ok, config, errors, warnings, migratedFrom }
//   ok false  the file cannot be used at all (not JSON, wrong shape, from a
//             newer Tokenlings): the caller keeps the last good config and
//             tells the user once.
//   warnings  values that were wrong but fixable; the pet still loads with the
//             offending field replaced by its base form's value.
import { FORMS, formFor, SIGNATURE_MOVES, MOVE_ALIASES } from "../forms/forms.mjs"
import { EVOLUTION_NAMES } from "../assets/parts/evolutions.mjs"
import { LIBRARY } from "./compose.mjs"
import { isHex } from "./palette.mjs"
import * as Siblings from "./siblings.mjs"

export const VERSION = 1
export const MAX_BYTES = 256 * 1024
export const MAX_PETS = 64

export const SETTINGS_DEFAULTS = {
  powerMode: "auto",          // auto | showoff | balanced | battery | still
  roaming: "bar",             // home | bar | desktop
  social: true,
  ambient: "normal",          // rare | normal | lively
  quietHours: { enabled: false, from: "22:00", to: "07:00" },
  reducedMotion: false,
  notifications: false,
  showCwd: false,
  progression: true,
  petSize: "large",           // small | medium | large | huge: every pet, against the bar's thickness
  usageLimits: true,          // account limits in tooltips and the Pets tab (Omarchy's usage collectors)
  autoConnect: false          // install hooks for new pets without asking (once per hooks file); Welcome's "Connect all" turns it on
}

const ENUMS = {
  powerMode: ["auto", "showoff", "balanced", "battery", "still"],
  roaming: ["home", "bar", "desktop"],
  ambient: ["rare", "normal", "lively"],
  petSize: ["small", "medium", "large", "huge"],
  onClick: ["usage", "focus", "jump", "panel", "none"],
  size: ["small", "medium", "large"],
  evolved: ["auto", "on", "off"],
  variant: ["auto", "off"]
}
const ID_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const PALETTE_KEYS = ["body", "shade", "light", "accent", "cheek", "eye"]
const PERSONALITY_KEYS = ["energy", "sociability", "mischief", "sleepiness"]

const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v)
const clone = v => JSON.parse(JSON.stringify(v))

// Older shapes → the current one. Each step is one version.
export const MIGRATIONS = {
  // v0: a bare array of pets, or an object without "version"; looks used
  // "colors" before "palette".
  0: (raw) => {
    const out = Array.isArray(raw) ? { pets: raw } : Object.assign({}, raw)
    out.pets = (Array.isArray(out.pets) ? out.pets : []).map(p => {
      if (!isObj(p)) return p
      const q = Object.assign({}, p)
      if (isObj(q.look) && isObj(q.look.colors) && !q.look.palette) {
        q.look = Object.assign({}, q.look, { palette: q.look.colors })
        delete q.look.colors
      }
      return q
    })
    out.version = 1
    return out
  }
}

export function migrate(raw) {
  let version = Array.isArray(raw) ? 0 : (isObj(raw) && Number.isInteger(raw.version) ? raw.version : 0)
  const from = version
  let cur = raw
  while (version < VERSION) {
    const step = MIGRATIONS[version]
    if (!step) break
    cur = step(cur)
    version++
  }
  return { config: cur, from: from < VERSION ? from : null }
}

export function defaultPet(provider, id, name) {
  const formName = formFor(provider)
  const form = FORMS[formName]
  return {
    id: id || formName,
    name: name || form.label,
    provider: provider || "demo",
    account: {},
    baseForm: formName,
    look: Object.assign(clone(form.look), { followTheme: false, size: "medium", evolution: form.evolution, evolved: "auto", variant: "auto" }),
    personality: clone(form.personality),
    signatureMove: form.moves[0],
    onClick: "usage",
    home: "bar",
    enabled: true
  }
}

// No pets.json yet: one pet in demo personality so the plugin is charming
// out of the box.
export function defaults() {
  const pet = defaultPet("demo", "bit", "Bit")
  pet.demo = true
  return { version: VERSION, settings: clone(SETTINGS_DEFAULTS), pets: [pet] }
}

function num01(v) { return typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(1, v)) : null }

function normalizeSettings(raw, warn) {
  const s = clone(SETTINGS_DEFAULTS)
  if (raw === undefined) return s
  if (!isObj(raw)) { warn("settings: not an object, using defaults"); return s }
  for (const key of ["powerMode", "roaming", "ambient", "petSize"]) {
    if (raw[key] === undefined) continue
    if (ENUMS[key].includes(raw[key])) s[key] = raw[key]
    else warn(`settings.${key}: "${raw[key]}" is not one of ${ENUMS[key].join(", ")}`)
  }
  for (const key of ["social", "reducedMotion", "notifications", "showCwd", "progression", "usageLimits", "autoConnect"]) {
    if (raw[key] === undefined) continue
    if (typeof raw[key] === "boolean") s[key] = raw[key]
    else warn(`settings.${key}: expected true or false`)
  }
  if (raw.quietHours !== undefined) {
    const q = raw.quietHours
    if (!isObj(q)) warn("settings.quietHours: not an object")
    else {
      if (typeof q.enabled === "boolean") s.quietHours.enabled = q.enabled
      for (const k of ["from", "to"]) {
        if (q[k] === undefined) continue
        if (TIME_RE.test(String(q[k]))) s.quietHours[k] = q[k]
        else warn(`settings.quietHours.${k}: expected HH:MM`)
      }
    }
  }
  return s
}

// explicit: filled with the parts this pet sets itself (sibling looks leave
// those alone, see core/siblings.mjs).
function normalizePet(raw, index, seen, warn, explicit) {
  const where = `pets[${index}]`
  if (!isObj(raw)) { warn(`${where}: not an object, skipped`); return null }
  const provider = typeof raw.provider === "string" && raw.provider.trim() ? raw.provider.trim().toLowerCase().slice(0, 32) : "demo"
  let formName = raw.baseForm
  if (formName !== undefined && !FORMS[formName]) { warn(`${where}.baseForm: unknown form "${formName}"`); formName = undefined }
  formName = formName || formFor(provider)
  const form = FORMS[formName]

  let id = typeof raw.id === "string" ? raw.id.trim().toLowerCase() : ""
  if (!ID_RE.test(id)) {
    if (raw.id !== undefined) warn(`${where}.id: "${raw.id}" must be 1–32 of a-z 0-9 _ - (starting with a letter or digit)`)
    id = formName
  }
  let unique = id, n = 2
  while (seen.has(unique)) unique = `${id.slice(0, 29)}-${n++}`
  if (unique !== id) warn(`${where}.id: "${id}" is used twice, renamed to "${unique}"`)
  seen.add(unique)

  const pet = defaultPet(provider, unique, null)
  pet.baseForm = formName
  pet.name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 24).trim() : form.label
  if (raw.name !== undefined && typeof raw.name !== "string") warn(`${where}.name: expected text`)

  if (raw.account !== undefined) {
    if (!isObj(raw.account)) warn(`${where}.account: not an object`)
    else {
      if (typeof raw.account.configDir === "string" && raw.account.configDir.length <= 512) pet.account.configDir = raw.account.configDir
      else if (raw.account.configDir !== undefined) warn(`${where}.account.configDir: expected a path`)
      if (typeof raw.account.match === "string" && raw.account.match.length <= 128) pet.account.match = raw.account.match
      else if (raw.account.match !== undefined) warn(`${where}.account.match: expected text (≤ 128 characters)`)
    }
  }

  const look = isObj(raw.look) ? raw.look : {}
  if (raw.look !== undefined && !isObj(raw.look)) warn(`${where}.look: not an object`)
  const lib = LIBRARY
  const pick = (key, table) => {
    if (look[key] === undefined) return
    if (typeof look[key] === "string" && table[look[key]]) pet.look[key] = look[key]
    else warn(`${where}.look.${key}: unknown "${look[key]}", using ${pet.look[key]}`)
  }
  pick("body", lib.bodies); pick("eyes", lib.eyes); pick("mouth", lib.mouths); pick("topper", lib.toppers); pick("pattern", lib.patterns)
  if (look.accessories !== undefined) {
    if (!Array.isArray(look.accessories)) warn(`${where}.look.accessories: expected a list`)
    else {
      pet.look.accessories = []
      for (const a of look.accessories) {
        if (typeof a === "string" && lib.accessories[a] && !pet.look.accessories.includes(a)) pet.look.accessories.push(a)
        else warn(`${where}.look.accessories: unknown or repeated "${a}"`)
      }
    }
  }
  if (look.accessories !== undefined) explicit.accessories = true
  if (isObj(look.palette) && Object.keys(look.palette).length) explicit.palette = true
  if (look.palette !== undefined) {
    if (!isObj(look.palette)) warn(`${where}.look.palette: not an object`)
    else {
      const base = pet.look.palette.hashed ? {} : pet.look.palette
      const pal = Object.assign({}, base)
      for (const k of PALETTE_KEYS) {
        if (look.palette[k] === undefined) continue
        if (isHex(look.palette[k])) pal[k] = String(look.palette[k]).toUpperCase().replace(/^([^#])/, "#$1")
        else warn(`${where}.look.palette.${k}: expected #RRGGBB`)
      }
      if (Object.keys(pal).length) pet.look.palette = pal
    }
  }
  if (look.followTheme !== undefined) {
    if (typeof look.followTheme === "boolean") pet.look.followTheme = look.followTheme
    else warn(`${where}.look.followTheme: expected true or false`)
  }
  if (look.size !== undefined) {
    if (ENUMS.size.includes(look.size)) pet.look.size = look.size
    else warn(`${where}.look.size: expected small, medium or large`)
  }
  if (look.evolution !== undefined) {
    if (EVOLUTION_NAMES.includes(look.evolution)) pet.look.evolution = look.evolution
    else warn(`${where}.look.evolution: unknown "${look.evolution}"`)
  }
  if (look.evolved !== undefined) {
    if (ENUMS.evolved.includes(look.evolved)) pet.look.evolved = look.evolved
    else warn(`${where}.look.evolved: expected auto, on or off`)
  }
  if (look.variant !== undefined) {
    if (ENUMS.variant.includes(look.variant)) pet.look.variant = look.variant
    else warn(`${where}.look.variant: expected auto or off`)
  }

  if (raw.personality !== undefined) {
    if (!isObj(raw.personality)) warn(`${where}.personality: not an object`)
    else for (const k of PERSONALITY_KEYS) {
      if (raw.personality[k] === undefined) continue
      const v = num01(raw.personality[k])
      if (v === null) warn(`${where}.personality.${k}: expected a number from 0 to 1`)
      else { pet.personality[k] = v; (explicit.personality = explicit.personality || {})[k] = true }
    }
  }
  if (raw.signatureMove !== undefined) {
    const move = MOVE_ALIASES[raw.signatureMove] || raw.signatureMove
    if (SIGNATURE_MOVES.includes(move)) pet.signatureMove = move
    else warn(`${where}.signatureMove: unknown "${raw.signatureMove}"`)
  }
  if (raw.onClick !== undefined) {
    if (ENUMS.onClick.includes(raw.onClick)) pet.onClick = raw.onClick
    else warn(`${where}.onClick: expected ${ENUMS.onClick.join(", ")}`)
  }
  if (raw.home !== undefined) {
    if (typeof raw.home === "string" && raw.home.length <= 64) pet.home = raw.home
    else warn(`${where}.home: expected "bar" or a screen name`)
  }
  if (raw.enabled !== undefined) {
    if (typeof raw.enabled === "boolean") pet.enabled = raw.enabled
    else warn(`${where}.enabled: expected true or false`)
  }
  return pet
}

// options.home: $HOME, so account folders written as "~/…" and as absolute
// paths are the same folder (sibling looks are seeded from it).
export function load(text, options) {
  const home = (options && options.home) || "~"
  const errors = [], warnings = []
  const warn = m => warnings.push(m)
  if (typeof text !== "string") return { ok: false, errors: ["no text"], warnings, config: null, migratedFrom: null }
  if (text.length > MAX_BYTES) return { ok: false, errors: [`file is larger than ${MAX_BYTES / 1024} KiB`], warnings, config: null, migratedFrom: null }
  let raw
  try { raw = JSON.parse(text) } catch (e) {
    return { ok: false, errors: ["not valid JSON: " + String(e && e.message || e)], warnings, config: null, migratedFrom: null }
  }
  if (!isObj(raw) && !Array.isArray(raw)) return { ok: false, errors: ["the top level must be an object"], warnings, config: null, migratedFrom: null }
  if (isObj(raw) && Number.isInteger(raw.version) && raw.version > VERSION)
    return { ok: false, errors: [`written by a newer Tokenlings (version ${raw.version}; this one reads ${VERSION})`], warnings, config: null, migratedFrom: null }
  const { config: migrated, from } = migrate(raw)
  if (!Array.isArray(migrated.pets)) return { ok: false, errors: ['"pets" must be a list'], warnings, config: null, migratedFrom: from }
  const seen = new Set()
  const pets = [], explicit = []
  for (let i = 0; i < migrated.pets.length; i++) {
    if (pets.length >= MAX_PETS) { warn(`more than ${MAX_PETS} pets; the rest are ignored`); break }
    const ex = {}
    const pet = normalizePet(migrated.pets[i], i, seen, warn, ex)
    if (pet) { pets.push(pet); explicit.push(ex) }
  }
  Siblings.apply(pets, explicit, home)
  const config = { version: VERSION, settings: normalizeSettings(migrated.settings, warn), pets }
  if (typeof migrated["$schema"] === "string") config["$schema"] = migrated["$schema"]
  return { ok: true, errors, warnings, config, migratedFrom: from }
}

// ---- writing pets.json from the panel: edits apply to the file as the
// user wrote it (their own layout and comments-free JSON stays theirs: only
// the fields that changed are touched), then it is written back whole.

// The raw document behind `text` (migrated to the current version), or a new
// one when there is no file yet.
export function rawOf(text) {
  if (typeof text !== "string" || !text.trim()) return { version: VERSION, settings: {}, pets: [] }
  if (text.length > MAX_BYTES) throw new Error("pets.json is too large to edit")
  const raw = JSON.parse(text)
  const { config } = migrate(raw)
  if (!isObj(config)) throw new Error("pets.json is not an object")
  if (!Array.isArray(config.pets)) config.pets = []
  if (!isObj(config.settings)) config.settings = {}
  return config
}
// Text to write: "$schema" first, two-space indent, a final newline.
export function serialize(raw, schemaRef) {
  const out = {}
  if (typeof raw["$schema"] === "string") out["$schema"] = raw["$schema"]
  else if (schemaRef) out["$schema"] = schemaRef
  for (const k of Object.keys(raw)) if (k !== "$schema") out[k] = raw[k]
  return JSON.stringify(out, null, 2) + "\n"
}
// text → fn(raw) changes it → new text, checked by load() before anyone writes it.
export function edit(text, fn, schemaRef) {
  const raw = rawOf(text)
  fn(raw)
  const next = serialize(raw, schemaRef)
  const check = load(next)
  if (!check.ok) throw new Error(check.errors.join("; "))
  return next
}
const sameId = id => p => isObj(p) && String(p.id || "").trim().toLowerCase() === id
// Set fields of one pet (a dotted path → value; undefined removes it).
export function setPet(raw, id, changes) {
  const p = raw.pets.find(sameId(id))
  if (!p) throw new Error(`no pet called "${id}"`)
  for (const path of Object.keys(changes)) {
    const keys = path.split(".")
    let o = p
    for (let i = 0; i < keys.length - 1; i++) { if (!isObj(o[keys[i]])) o[keys[i]] = {}; o = o[keys[i]] }
    const last = keys[keys.length - 1]
    if (changes[path] === undefined) delete o[last]
    else o[last] = clone(changes[path])
  }
  return raw
}
export function addPet(raw, pet) {
  if (raw.pets.length >= MAX_PETS) throw new Error(`at most ${MAX_PETS} pets`)
  if (!ID_RE.test(pet.id || "")) throw new Error("id: 1–32 of a-z 0-9 _ -")
  if (raw.pets.some(sameId(pet.id))) throw new Error(`a pet called "${pet.id}" already exists`)
  raw.pets.push(clone(pet))
  return raw
}
export function removePet(raw, id) {
  raw.pets = raw.pets.filter(p => !sameId(id)(p))
  return raw
}
export function setSetting(raw, key, value) {
  if (!(key in SETTINGS_DEFAULTS)) throw new Error(`unknown setting "${key}"`)
  raw.settings[key] = clone(value)
  return raw
}
// A fresh id for a pet called `name` (or of provider `provider`).
export function freshId(raw, base) {
  let id = String(base || "pet").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "pet"
  if (!/^[a-z0-9]/.test(id)) id = "pet-" + id
  const taken = new Set(raw.pets.filter(isObj).map(p => String(p.id || "").toLowerCase()))
  let out = id, n = 2
  while (taken.has(out)) out = `${id}-${n++}`
  return out
}
