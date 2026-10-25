// Turns a pet's look into what the rig draws: layers sorted into rig groups,
// colours resolved, expressions and props ready to swap, plus the pivots the
// animation system needs.
//
// Groups (back to front):
//   aura    an evolved pet's glow
//   behind  ears, buns, capes, bags, feet — drawn behind the body
//   body    outline, shading, rim light, gloss, grain, pattern
//   pawL/R  the two paws (they turn about the shoulders: waves, typing)
//   face    cheeks, freckles, glasses (shifts toward the gaze)
//   topper  hair and head-worn things (springs about the head top)
//   front   everything else in front of the body (neck items, straps)
// plus
//   eyeArt(expression), mouthArt(expression)  layers ("open" / "base" are
//           the pet's own eyes and mouth)
//   props   { name: { slot, holds, box, pivot } }; propArt(name) its layers
//           ({ layers } or, for seats, { back, front })
//
// Everything here is baked once per look and theme (see qml/ArtGroup.qml), so
// the finish (shading, rim light, grain, gloss) costs nothing per frame.
import { BODIES } from "../assets/parts/bodies.mjs"
import { EYES, MOUTHS, EYE_EXPRESSIONS, MOUTH_EXPRESSIONS, cheeks, eyeLayers, mouthLayers } from "../assets/parts/faces.mjs"
import { TOPPERS, ACCESSORIES, PATTERNS } from "../assets/parts/wearables.mjs"
import { PROPS } from "../assets/parts/props.mjs"
import { FX, FX_BOX } from "../assets/parts/fx.mjs"
import { EVOLUTIONS, visorLayers, moonLayers } from "../assets/parts/evolutions.mjs"
import { circle, ellipse, outlined, glossy, fill, stroke, speckle } from "../assets/parts/geometry.mjs"
import { hash } from "./rng.mjs"
import * as Palette from "./palette.mjs"

export const LIBRARY = { bodies: BODIES, eyes: EYES, mouths: MOUTHS, toppers: TOPPERS, accessories: ACCESSORIES, patterns: PATTERNS }
export { EYE_EXPRESSIONS, MOUTH_EXPRESSIONS }

export const OUTLINE = 1.5          // the body's outline, in grid units

function resolveGradient(g, palette, tokens) {
  if (!g) return null
  if (Array.isArray(g)) {
    // [from, to] top → bottom
    return { type: "linear", x1: 16, y1: 7, x2: 16, y2: 31,
             stops: [[0, Palette.resolve(g[0], palette, tokens)], [0.5, Palette.mix(Palette.resolve(g[0], palette, tokens), Palette.resolve(g[1], palette, tokens), 0.5)], [1, Palette.resolve(g[1], palette, tokens)]] }
  }
  // "clear" is the previous stop's colour at zero alpha (#00RRGGBB), so a
  // glow fades out instead of darkening toward transparent black.
  const stops = []
  for (const [pos, token] of (g.stops || []).slice(0, 3)) {
    const prev = stops.length ? stops[stops.length - 1][1] : "#000000"
    stops.push([pos, token === "clear" ? "#00" + prev.slice(-6) : Palette.resolve(token, palette, tokens)])
  }
  while (stops.length < 3) stops.push(stops[stops.length - 1] || [1, "#000000"])
  return { type: "radial", cx: g.radial[0], cy: g.radial[1], r: g.radial[2], stops }
}

function resolveLayer(layer, palette, tokens) {
  return {
    d: layer.d,
    fill: Palette.resolve(layer.fill, palette, tokens),
    stroke: layer.stroke ? Palette.resolve(layer.stroke, palette, tokens) : "transparent",
    width: layer.stroke ? (layer.width || 1) : 0,
    cap: layer.cap === "round" ? "round" : "flat",
    opacity: typeof layer.opacity === "number" ? layer.opacity : 1,
    gradient: resolveGradient(layer.gradient, palette, tokens)
  }
}

// The pet's own outline: the theme's, unless the body is so dark that a dark
// outline would vanish on a dark bar (then a mid tone between bar colours).
function outlineFor(palette, tokens, theme) {
  const dark = !theme || theme.mode !== "light"
  if (dark && Palette.luminance(palette.body) < 0.05)
    return Palette.mix(theme && theme.foreground || "#D4D9E1", theme && theme.background || "#101315", 0.45)
  return tokens.outline
}

// look: { body, eyes, mouth, topper, accessories[], pattern, palette, followTheme, evolution? }
// theme: { foreground, background, accent, mode }
// provider: used to hash Bit's colour
// options: { evolved: name | true } draws the evolved form
export function compose(look, theme, provider, options) {
  const b = BODIES[look.body] || BODIES.roundBlob
  let palette = look.followTheme ? Palette.themed(theme) : Object.assign({}, look.palette || {})
  if (palette.hashed) palette = { body: Palette.hashedBody(provider) }

  // Evolved: recolour, swap hero pieces, add an aura.
  const evoName = options && options.evolved ? (typeof options.evolved === "string" ? options.evolved : look.evolution) : null
  const evo = evoName ? EVOLUTIONS[evoName] || null : null
  let topper = look.topper, accessories = (look.accessories || []).slice(), patternName = look.pattern
  if (evo) {
    palette = Object.assign({}, palette, evo.palette)
    if (evo.replace && evo.replace.topper !== undefined) topper = evo.replace.topper
    if (evo.pattern) patternName = evo.pattern
  }
  palette = Palette.complete(palette)
  if (evo) for (const k of ["glow", "glow2", "planet", "gear"]) if (evo.palette[k]) palette[k] = evo.palette[k]
  const tokens = Object.assign({}, Palette.themeTokens(theme))
  tokens.outline = outlineFor(palette, tokens, theme)

  const groups = { aura: [], behind: [], body: [], pawL: [], pawR: [], face: [], topper: [], front: [] }
  const add = (group, layers) => { for (const l of layers) groups[l.behind ? "behind" : (l.group || group)].push(l) }

  // The aura fades out at its edge: a radial gradient into transparent.
  if (evo) groups.aura = [{ d: circle(16, 21, 14.5), fill: palette.glow, opacity: 0.6,
                            gradient: { radial: [16, 21, 14.5], stops: [[0, palette.glow2], [0.45, palette.glow], [1, "clear"]] } }]

  const pattern = PATTERNS[patternName] || PATTERNS.none
  // Feet peek out under the body; floating bodies have none.
  if (!b.floats) add("behind", b.feet.map(x => glossy(ellipse(x, 30.3, 2.3, 1.25), "shade", x - 0.8, 29.6, 2.6, { width: 0.85 })))
  add("pawL", [glossy(ellipse(b.handL[0] + 0.6, b.handL[1], 1.55, 1.85), "body", b.handL[0], b.handL[1] - 1, 2.4, { width: 0.85 })])
  add("pawR", [glossy(ellipse(b.handR[0] - 0.6, b.handR[1], 1.55, 1.85), "body", b.handR[0] - 1.2, b.handR[1] - 1, 2.4, { width: 0.85 })])

  // The body: lit from the top left, falling off into its shade at the
  // bottom right; a gradient pattern runs the light into the accent instead.
  const lx = b.top[0] - b.hatW * 0.7, ly = b.top[1] + 4
  const bodyLayer = { d: b.path, fill: "body", stroke: "outline", width: OUTLINE,
                      gradient: { radial: [lx, ly, 21], stops: [[0, "tint:body"], [0.42, "body"], [1, pattern.bodyGradient ? "accent" : "tone:body"]] } }
  add("body", [bodyLayer])
  // Grain: a seeded speckle of shade and light, too fine to read as spots.
  const seed = hash(JSON.stringify([look.body, palette.body]))
  const hy = (b.top[1] + 30.6) / 2 + 2, hrx = Math.max(3, (b.handR[0] - b.handL[0]) / 2 - 3.4), hry = Math.max(3, (30.6 - b.top[1]) / 2 - 3.2)
  const grain = speckle(seed, 16, hy, hrx, hry, 22)
  add("body", grain.map(([x, y, r], i) => fill(circle(x, y, r), i % 3 ? "tone:body" : "tint:body", { opacity: i % 3 ? 0.32 : 0.4 })))
  add(pattern.group || "body", pattern.draw(b))
  // Rim light inside the upper-left edge, and a glossy highlight on the crown.
  add("body", [stroke(b.rim, "tint:light", 0.75, { opacity: 0.75 })])
  add("body", [fill(ellipse(b.top[0] - b.hatW * 0.5, b.top[1] + 3.2, 1.9, 1), "#FFFFFF", { opacity: 0.5 }),
               fill(circle(b.top[0] - b.hatW * 0.5 - 1.1, b.top[1] + 3.4, 0.45), "#FFFFFF", { opacity: 0.85 })])

  add("face", cheeks(b))
  add("topper", (TOPPERS[topper] || TOPPERS.none).draw(b))

  const swaps = evo && evo.replace && evo.replace.accessories ? evo.replace.accessories : {}
  for (const name of accessories) {
    const swap = swaps[name]
    if (swap === "visor") { add("face", visorLayers(b, palette)); continue }
    if (swap === "moon") { add("topper", moonLayers(b, palette)); continue }
    const acc = ACCESSORIES[name]
    if (acc) add(acc.group || "front", acc.draw(b))
  }
  if (evo && evo.extra) add("front", evo.extra(b, palette))

  const res = list => list.map(l => resolveLayer(l, palette, tokens))
  const resolved = {}
  for (const g in groups) resolved[g] = res(groups[g])

  // Expressions and props are drawn on first request and memoised: a pet
  // only pays for the ones its clips actually show.
  const memo = {}
  const once = (key, make) => (key in memo ? memo[key] : (memo[key] = make()))
  const eyeArt = name => once("e:" + name, () => res(eyeLayers(look.eyes, b, name)))
  const mouthArt = name => once("m:" + name, () => res(mouthLayers(look.mouth, b, name)))
  const props = {}
  for (const name in PROPS) {
    const p = PROPS[name]
    props[name] = { slot: p.slot, holds: p.holds || "", box: p.box || [0, 0, 32, 32], pivot: p.pivot ? b[p.pivot].slice() : b.handR.slice() }
  }
  // seat props: { back, front }; the rest: layers
  const propArt = name => once("p:" + name, () => {
    const p = PROPS[name]
    if (!p) return null
    return p.slot === "seat" ? { back: res(p.back(b)), front: res(p.front(b)) } : { layers: res(p.draw(b)) }
  })

  return {
    groups: resolved,
    eyeNames: EYE_EXPRESSIONS,
    mouthNames: MOUTH_EXPRESSIONS,
    eyeArt,
    mouthArt,
    props,
    propArt,
    palette,
    tokens,
    evolved: evo ? evoName : null,
    pivots: { feet: [16, 30.6], top: b.top.slice(), eyeY: b.eyeY, mouthY: b.mouthY, handL: b.handL.slice(), handR: b.handR.slice(),
              shoulderL: [b.handL[0] + 1.6, b.handL[1] - 2.2], shoulderR: [b.handR[0] - 1.6, b.handR[1] - 2.2] },
    floats: !!b.floats
  }
}

// Particle art for the FX pool, in the theme's colours.
export function composeFx(theme, accent) {
  const palette = Palette.complete({ body: accent || (theme && theme.accent) || "#7AA2F7" })
  const tokens = Palette.themeTokens(theme)
  const out = {}
  for (const k in FX) out[k] = FX[k]().map(l => resolveLayer(l, palette, tokens))
  return { box: FX_BOX, kinds: out }
}
