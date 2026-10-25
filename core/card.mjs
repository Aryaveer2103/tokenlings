// Pet cards: a pet's design as a short string people can share.
//
//   tkl1:<base64url of the design's JSON>.<checksum>
//
// The design is the look, personality, signature move, base form, name and a
// provider hint — never the pet's id, account folder or anything else that
// is about the machine it came from. The checksum is POSIX cksum's CRC
// (the CLI checks it with coreutils' cksum), as 8 hex digits.
//
// decode() is strict: anything unexpected (an unknown key, a part that does
// not exist, a value of the wrong type, a bad checksum, a card over 4 KiB)
// rejects the whole card, so an imported pet is always one Tokenlings could
// have made. bin/tokenlings applies the same rules with jq.
import { FORMS, SIGNATURE_MOVES, MOVE_ALIASES } from "../forms/forms.mjs"
import { EVOLUTION_NAMES } from "../assets/parts/evolutions.mjs"
import { LIBRARY } from "./compose.mjs"

export const PREFIX = "tkl1:"
export const MAX_CARD = 4096
const PALETTE_KEYS = ["body", "shade", "light", "accent", "cheek", "eye"]
const PERSONALITY_KEYS = ["energy", "sociability", "mischief", "sleepiness"]
const LOOK_KEYS = ["body", "eyes", "mouth", "topper", "accessories", "pattern", "palette", "followTheme", "size", "evolution", "evolved"]
const HEX = /^#[0-9A-Fa-f]{6}$/
const B64 = /^[A-Za-z0-9_-]+$/

// ---- bytes (QML's JS engine has no TextEncoder or Buffer)
function utf8(str) {
  const out = []
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i)
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) { const d = str.charCodeAt(i + 1); if (d >= 0xdc00 && d < 0xe000) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++ } }
    if (c < 0x80) out.push(c)
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63))
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
  }
  return out
}
function fromUtf8(bytes) {
  let s = ""
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i]
    let c, n
    if (b < 0x80) { c = b; n = 1 }
    else if ((b & 0xe0) === 0xc0) { c = b & 31; n = 2 }
    else if ((b & 0xf0) === 0xe0) { c = b & 15; n = 3 }
    else if ((b & 0xf8) === 0xf0) { c = b & 7; n = 4 }
    else return null
    if (i + n > bytes.length) return null
    for (let k = 1; k < n; k++) { const x = bytes[i + k]; if ((x & 0xc0) !== 0x80) return null; c = (c << 6) | (x & 63) }
    if (c >= 0x10000) { c -= 0x10000; s += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 1023)) } else s += String.fromCharCode(c)
    i += n
  }
  return s
}
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
function b64url(bytes) {
  let s = ""
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0)
    s += ALPHA[(n >> 18) & 63] + ALPHA[(n >> 12) & 63]
    if (i + 1 < bytes.length) s += ALPHA[(n >> 6) & 63]
    if (i + 2 < bytes.length) s += ALPHA[n & 63]
  }
  return s
}
function fromB64url(s) {
  if (!B64.test(s) || s.length % 4 === 1) return null
  const out = []
  for (let i = 0; i < s.length; i += 4) {
    const v = [0, 1, 2, 3].map(k => (i + k < s.length ? ALPHA.indexOf(s[i + k]) : 0))
    const n = (v[0] << 18) | (v[1] << 12) | (v[2] << 6) | v[3]
    out.push((n >> 16) & 255)
    if (i + 2 < s.length) out.push((n >> 8) & 255)
    if (i + 3 < s.length) out.push(n & 255)
  }
  return out
}
// POSIX cksum: CRC-32 (MSB first, polynomial 0x04C11DB7) over the bytes and
// then the length, complemented.
export function cksum(bytes) {
  let crc = 0
  const step = b => {
    crc = (crc ^ (b << 24)) >>> 0
    for (let k = 0; k < 8; k++) crc = (crc & 0x80000000) ? (((crc << 1) ^ 0x04c11db7) >>> 0) : ((crc << 1) >>> 0)
  }
  for (const b of bytes) step(b)
  for (let n = bytes.length; n > 0; n = Math.floor(n / 256)) step(n & 255)
  return (~crc) >>> 0
}
const hex8 = n => ("0000000" + n.toString(16)).slice(-8)

// ---- encode: a normalised pet (core/config.mjs) → card
export function design(pet) {
  const look = {}
  for (const k of LOOK_KEYS) if (pet.look && pet.look[k] !== undefined) look[k] = pet.look[k]
  if (look.palette) {
    const pal = {}
    for (const k of PALETTE_KEYS) if (typeof look.palette[k] === "string" && HEX.test(look.palette[k])) pal[k] = look.palette[k].toUpperCase()
    if (Object.keys(pal).length) look.palette = pal
    else delete look.palette                      // hashed (Bit): the importer hashes its own
  }
  const d = { v: 1, n: pet.name, f: pet.baseForm, p: pet.provider, l: look, q: pet.personality, m: pet.signatureMove }
  return d
}
export function encode(pet) {
  const bytes = utf8(JSON.stringify(design(pet)))
  return PREFIX + b64url(bytes) + "." + hex8(cksum(bytes))
}

// ---- decode: card → { ok, pet (partial, for pets.json), errors }
const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v)
export function validate(d) {
  const e = []
  const only = (o, keys, where) => { for (const k of Object.keys(o)) if (!keys.includes(k)) e.push(`${where}: unexpected "${k}"`) }
  if (!isObj(d)) return ["not an object"]
  only(d, ["v", "n", "f", "p", "l", "q", "m"], "card")
  if (d.v !== 1) e.push("unknown card version")
  if (typeof d.n !== "string" || !d.n.trim() || d.n.length > 24) e.push("name: 1–24 characters")
  if (!FORMS[d.f]) e.push("base form: unknown")
  if (d.p !== undefined && (typeof d.p !== "string" || !/^[a-z0-9_-]{1,32}$/.test(d.p))) e.push("provider: a-z 0-9 _ - (≤ 32)")
  // the signature move and personality are optional (a pet that never set
  // them takes its base form's)
  if (d.m !== undefined && !SIGNATURE_MOVES.includes(MOVE_ALIASES[d.m] || d.m)) e.push("signature move: unknown")
  if (d.q !== undefined) {
    if (!isObj(d.q)) e.push("personality: not an object")
    else {
      only(d.q, PERSONALITY_KEYS, "personality")
      for (const k of Object.keys(d.q)) if (typeof d.q[k] !== "number" || !(d.q[k] >= 0 && d.q[k] <= 1)) e.push(`personality.${k}: a number 0–1`)
    }
  }
  if (!isObj(d.l)) e.push("look: not an object")
  else {
    const l = d.l
    only(l, LOOK_KEYS, "look")
    const part = (k, table) => { if (l[k] !== undefined && !(typeof l[k] === "string" && Object.prototype.hasOwnProperty.call(table, l[k]))) e.push(`look.${k}: unknown`) }
    part("body", LIBRARY.bodies); part("eyes", LIBRARY.eyes); part("mouth", LIBRARY.mouths); part("topper", LIBRARY.toppers); part("pattern", LIBRARY.patterns)
    if (l.accessories !== undefined) {
      if (!Array.isArray(l.accessories) || l.accessories.length > 16) e.push("look.accessories: a list")
      else {
        const seen = new Set()
        for (const a of l.accessories) { if (typeof a !== "string" || !Object.prototype.hasOwnProperty.call(LIBRARY.accessories, a) || seen.has(a)) e.push("look.accessories: unknown or repeated"); seen.add(a) }
      }
    }
    if (l.palette !== undefined) {
      if (!isObj(l.palette)) e.push("look.palette: not an object")
      else { only(l.palette, PALETTE_KEYS, "look.palette"); for (const k of Object.keys(l.palette)) if (typeof l.palette[k] !== "string" || !HEX.test(l.palette[k])) e.push(`look.palette.${k}: #RRGGBB`) }
    }
    if (l.followTheme !== undefined && typeof l.followTheme !== "boolean") e.push("look.followTheme: true or false")
    if (l.size !== undefined && !["small", "medium", "large"].includes(l.size)) e.push("look.size: small, medium or large")
    if (l.evolution !== undefined && !EVOLUTION_NAMES.includes(l.evolution)) e.push("look.evolution: unknown")
    if (l.evolved !== undefined && !["auto", "on", "off"].includes(l.evolved)) e.push("look.evolved: auto, on or off")
  }
  return e
}
export function decode(card) {
  const fail = m => ({ ok: false, pet: null, errors: [m] })
  if (typeof card !== "string") return fail("not text")
  const s = card.trim()
  if (s.length > MAX_CARD) return fail("too long")
  if (s.indexOf(PREFIX) !== 0) return fail("not a Tokenlings card (tkl1:…)")
  const body = s.slice(PREFIX.length)
  const dot = body.lastIndexOf(".")
  if (dot < 1 || !/^[0-9a-f]{8}$/.test(body.slice(dot + 1))) return fail("missing checksum")
  const bytes = fromB64url(body.slice(0, dot))
  if (!bytes) return fail("damaged (not base64url)")
  if (hex8(cksum(bytes)) !== body.slice(dot + 1)) return fail("damaged (checksum does not match)")
  const text = fromUtf8(bytes)
  if (text === null) return fail("damaged (not UTF-8)")
  let d
  try { d = JSON.parse(text) } catch (err) { return fail("damaged (not JSON)") }
  const errors = validate(d)
  if (errors.length) return { ok: false, pet: null, errors }
  const pet = { name: d.n.trim(), baseForm: d.f, look: d.l }
  if (d.q) pet.personality = d.q
  if (d.m) pet.signatureMove = MOVE_ALIASES[d.m] || d.m
  if (d.p) pet.provider = d.p
  return { ok: true, pet, errors: [] }
}
