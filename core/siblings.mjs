// Siblings: more than one pet for the same provider (two Claude accounts,
// three Codex homes). The first keeps the pure base form; every other one gets
// its own look and a slightly different temperament, so they are easy to tell
// apart in the bar: a shifted palette, an accessory of its own and a nudge to
// one trait. All of it is seeded from the account folder, so a sibling looks
// the same after a reinstall, and anything the user sets in pets.json wins.
import { hash } from "./rng.mjs"
import { parse, toHex, toHsl, fromHsl } from "./palette.mjs"
import { petDir, defaultDir, tilde } from "./accounts.mjs"

// Hue turns, far enough from the base and from each other to read at 28 px.
export const HUE_TURNS = [150, 210, 95, 265, 40, 315, 125, 235]
// Accessories that read at bar size and sit on any body.
export const ACCESSORY_PICKS = ["scarf", "bow", "headphones", "bellCollar", "bandana", "flower", "squareGlasses", "monocle"]
const FACE = ["roundGlasses", "squareGlasses", "monocle", "shades", "sleepMask"]
export const TRAITS = ["energy", "sociability", "mischief", "sleepiness"]

// The order of siblings in each provider: rank 0 is the pet on the
// provider's default folder (or, without one, the first in the list); the
// others follow in pets.json order. → [rank per pet]
export function ranks(pets, home) {
  const groups = {}
  pets.forEach((p, i) => {
    if (!p || p.demo) return
    const key = String(p.provider || "")
    ;(groups[key] = groups[key] || []).push(i)
  })
  const out = pets.map(() => 0)
  for (const key of Object.keys(groups)) {
    const idx = groups[key]
    const def = defaultDir(key, home)
    let first = idx.find(i => def && petDir(pets[i], home) === def)
    if (first === undefined) first = idx[0]
    let r = 1
    for (const i of idx) if (i !== first) out[i] = r++
  }
  return out
}

// What makes sibling `seed` (its account folder in ~ form) different from its
// base form `look`. `taken` = hue turns and accessories already given to its
// brothers and sisters, so two siblings never share them while there are
// others left.
export function variant(seed, look, taken) {
  const h = hash("sibling:" + seed)
  const usedHues = (taken && taken.hues) || [], usedAcc = (taken && taken.accessories) || []
  let hi = h % HUE_TURNS.length
  for (let k = 0; k < HUE_TURNS.length && usedHues.includes(HUE_TURNS[hi]); k++) hi = (hi + 1) % HUE_TURNS.length
  const turn = HUE_TURNS[hi]

  const has = (look && look.accessories) || []
  const faceTaken = has.some(a => FACE.includes(a))
  const options = ACCESSORY_PICKS.filter(a => !has.includes(a) && !(faceTaken && FACE.includes(a)))
  let ai = (h >>> 8) % Math.max(1, options.length)
  for (let k = 0; k < options.length && usedAcc.includes(options[ai]); k++) ai = (ai + 1) % options.length
  const accessory = options[ai] || null

  const trait = TRAITS[(h >>> 16) % TRAITS.length]
  const delta = ((h >>> 20) & 1) ? 0.2 : -0.2
  return { turn, accessory, nudge: { trait, delta } }
}

// A palette turned by `turn` degrees. Near-grey colours (graphite, black,
// white bodies) have no hue to turn, so they take a soft tint of the turned
// accent instead; dark bodies are lifted a little so the tint shows.
export function turnPalette(palette, turn) {
  if (!palette || palette.hashed) return palette
  const acc = parse(palette.accent)
  const accHue = acc ? toHsl(acc)[0] : 0
  const body = parse(palette.body)
  const grey = body ? toHsl(body)[1] < 0.22 : false
  const out = Object.assign({}, palette)
  for (const k of ["body", "shade", "light", "accent"]) {
    const rgb = parse(palette[k])
    if (!rgb) continue
    let [hh, s, l] = toHsl(rgb)
    if (k !== "accent" && grey) {
      hh = accHue + turn
      s = Math.max(s, k === "light" ? 0.35 : 0.3)
      if (l < 0.3) l = Math.min(0.42, l + 0.12)
      else if (l > 0.85) l = l - 0.1
    } else hh = hh + turn
    out[k] = toHex(fromHsl([hh, s, l]))
  }
  return out
}

// Applies sibling looks to loaded pets (in place). `explicit[i]` says which
// parts pet i set itself ({ palette, accessories, personality: {trait: true} }):
// those stay as written. look.variant "off" keeps the pure base form.
export function apply(pets, explicit, home) {
  const r = ranks(pets, home)
  const taken = {}
  pets.forEach((p, i) => {
    if (!r[i] || !p.look || p.look.variant === "off") return
    const key = p.provider
    const t = taken[key] = taken[key] || { hues: [], accessories: [] }
    const seed = tilde(petDir(p, home), home)
    const v = variant(seed, p.look, t)
    t.hues.push(v.turn)
    if (v.accessory) t.accessories.push(v.accessory)
    const ex = (explicit && explicit[i]) || {}
    if (!ex.palette && !p.look.followTheme) p.look.palette = turnPalette(p.look.palette, v.turn)
    if (!ex.accessories && v.accessory && !p.look.accessories.includes(v.accessory)) p.look.accessories = p.look.accessories.concat([v.accessory])
    if (!(ex.personality && ex.personality[v.nudge.trait]))
      p.personality[v.nudge.trait] = Math.round(Math.max(0, Math.min(1, p.personality[v.nudge.trait] + v.nudge.delta)) * 100) / 100
    p.sibling = { rank: r[i], of: key, turn: v.turn, accessory: v.accessory, nudge: v.nudge, account: seed }
  })
  return pets
}
