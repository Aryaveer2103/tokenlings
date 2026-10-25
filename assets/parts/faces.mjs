// Eyes and mouths. An eye style draws one eye at (cx, cy) for side -1 (left)
// or +1 (right), mirrored where it matters; a `shared` style draws once
// across both eyes. Blinks squash the whole eye group, so every style blinks.
//
// Expressions are the faces a clip can switch to (happy, wide, dizzy, …).
// "open" is always the pet's own eye style; the rest are drawn the same way
// for every pet, in its eye colour, so a clip reads the same on any face.
// Each expression is baked once into its own texture and swapped, never
// redrawn.
import { circle, ellipse, rrect, quad, star, sparkle, heart, line, fill, stroke } from "./geometry.mjs"

const GOLD = "#FFD23F"
const PINK = "#FF5C8A"
const TONGUE = "#FF6F86"

// The shine every eye gets: one big highlight up and to the right, one small
// one down and to the left.
function shines(cx, cy, r) {
  return [
    fill(circle(cx + 0.42 * r, cy - 0.48 * r, 0.42 * r), "white"),
    fill(circle(cx - 0.42 * r, cy + 0.5 * r, 0.2 * r), "white", { opacity: 0.85 })
  ]
}

export const EYES = {
  dot: {
    label: "Dot",
    draw: (cx, cy) => [fill(ellipse(cx, cy, 1.45, 1.6), "eye"), ...shines(cx, cy, 1.5)]
  },
  ovalSparkle: {
    label: "Oval sparkle",
    draw: (cx, cy) => [
      fill(ellipse(cx, cy, 1.45, 1.95), "eye"),
      fill(circle(cx + 0.5, cy - 0.7, 0.62), "white"),
      fill(sparkle(cx - 0.45, cy + 0.75, 0.55), "white")
    ]
  },
  sleepy: {
    label: "Sleepy",
    draw: (cx, cy) => [
      fill(`M${cx - 1.8} ${cy - 0.2} A1.8 1.75 0 0 0 ${cx + 1.8} ${cy - 0.2} Z`, "eye"),
      fill(circle(cx + 0.7, cy + 0.6, 0.36), "white"),
      stroke(line(cx - 2.1, cy - 0.4, cx + 2.1, cy - 0.4), "eye", 0.9)
    ]
  },
  button: {
    label: "Button",
    draw: (cx, cy) => [
      fill(circle(cx, cy, 1.7), "eye"),
      fill(circle(cx - 0.5, cy - 0.1, 0.32), "white", { opacity: 0.9 }),
      fill(circle(cx + 0.5, cy - 0.1, 0.32), "white", { opacity: 0.9 }),
      fill(circle(cx + 0.6, cy - 0.95, 0.35), "white", { opacity: 0.7 })
    ]
  },
  visor: {
    label: "Visor",
    shared: true,
    draw: (cx, cy, side, b) => [
      fill(rrect(16 - b.eyeDX - 2.6, cy - 1.7, 2 * b.eyeDX + 5.2, 3.4, 1.7), "eye", { stroke: "outline", width: 0.5 }),
      fill(rrect(16 - b.eyeDX - 1.4, cy - 0.8, 2 * b.eyeDX + 2.8, 1, 0.5), "accent", { opacity: 0.95 }),
      stroke(line(16 - b.eyeDX - 1.2, cy - 1.05, 16 - b.eyeDX + 1, cy - 1.05), "white", 0.4, { opacity: 0.7 })
    ]
  },
  anime: {
    label: "Anime highlight",
    draw: (cx, cy) => [
      fill(ellipse(cx, cy, 1.6, 2.3), "eye"),
      fill(`M${cx - 1.4} ${cy + 0.5} Q${cx} ${cy + 2.6} ${cx + 1.4} ${cy + 0.5} Z`, "accent", { opacity: 0.9 }),
      fill(circle(cx + 0.5, cy - 0.9, 0.72), "white"),
      fill(circle(cx - 0.6, cy + 0.85, 0.34), "white")
    ]
  },
  caret: {
    label: "Block caret",
    draw: (cx, cy) => [
      fill(rrect(cx - 1.4, cy - 2, 2.8, 4, 0.5), "eye", { opacity: 0.25 }),
      fill(rrect(cx - 1.05, cy - 1.6, 2.1, 3.2, 0.3), "eye"),
      fill(rrect(cx - 0.75, cy - 1.3, 0.55, 1.2, 0.2), "white", { opacity: 0.7 })
    ]
  },
  starry: {
    label: "Starry",
    draw: (cx, cy) => [
      fill(circle(cx, cy, 2), "eye"),
      fill(star(cx, cy + 0.1, 1.55, 0.7), GOLD),
      fill(circle(cx + 0.75, cy - 0.85, 0.45), "white")
    ]
  },
  browDot: {
    label: "Dot with brows",
    draw: (cx, cy, side) => [
      fill(ellipse(cx, cy, 1.45, 1.6), "eye"), ...shines(cx, cy, 1.5),
      stroke(line(cx - 1.7 * side, cy - 2.5, cx + 1.6 * side, cy - 3.1), "eye", 1.05)
    ]
  },
  lash: {
    label: "Lashes",
    draw: (cx, cy, side) => [
      fill(ellipse(cx, cy, 1.45, 1.85), "eye"),
      ...shines(cx, cy, 1.6),
      stroke(line(cx + 1.2 * side, cy - 1.3, cx + 2.2 * side, cy - 2), "eye", 0.6),
      stroke(line(cx + 1.4 * side, cy - 0.5, cx + 2.5 * side, cy - 0.9), "eye", 0.6)
    ]
  }
}

// Expressions shared by every face. Each draws one eye at (cx, cy, side).
const EXPRESSION_EYES = {
  closed: (cx, cy) => [stroke(quad(cx - 1.9, cy - 0.2, cx, cy + 1.6, cx + 1.9, cy - 0.2), "eye", 1.05)],
  happy: (cx, cy) => [stroke(quad(cx - 1.9, cy + 0.9, cx, cy - 1.9, cx + 1.9, cy + 0.9), "eye", 1.15)],
  wide: (cx, cy) => [
    fill(circle(cx, cy, 2.25), "#FFFFFF", { stroke: "eye", width: 0.6 }),
    fill(circle(cx, cy + 0.2, 1.05), "eye"),
    fill(circle(cx + 0.4, cy - 0.25, 0.36), "white")
  ],
  star: (cx, cy) => [
    fill(star(cx, cy, 2.5, 1.1), GOLD, { stroke: "outline", width: 0.4 }),
    fill(circle(cx + 0.65, cy - 0.7, 0.42), "white")
  ],
  heart: (cx, cy) => [
    fill(heart(cx, cy, 1.55), PINK, { stroke: "outline", width: 0.35 }),
    fill(circle(cx + 0.7, cy - 0.65, 0.4), "white")
  ],
  dizzy: (cx, cy, side) => [stroke(`M${cx} ${cy} m0.5 0 a0.5 0.5 0 1 ${side > 0 ? 1 : 0} -1 0 a1.1 1.1 0 1 ${side > 0 ? 1 : 0} 2.1 0.2 a1.7 1.7 0 1 ${side > 0 ? 1 : 0} -3.3 -0.4`, "eye", 0.6)],
  squint: (cx, cy, side) => [stroke(`M${cx - 1.3 * side} ${cy - 1.3} L${cx + 1.1 * side} ${cy} L${cx - 1.3 * side} ${cy + 1.3}`, "eye", 1.05)],
  sleepy: (cx, cy) => [
    fill(`M${cx - 1.8} ${cy + 0.2} A1.8 1.3 0 0 0 ${cx + 1.8} ${cy + 0.2} Z`, "eye"),
    stroke(line(cx - 2.1, cy + 0.1, cx + 2.1, cy + 0.1), "eye", 0.95)
  ],
  angry: (cx, cy, side) => [
    fill(ellipse(cx, cy + 0.3, 1.4, 1.4), "eye"), fill(circle(cx + 0.45, cy - 0.15, 0.4), "white"),
    stroke(line(cx - 1.9 * side, cy - 2.7, cx + 1.5 * side, cy - 1.5), "eye", 1.05)
  ],
  worried: (cx, cy, side) => [
    fill(ellipse(cx, cy, 1.4, 1.7), "eye"), ...shines(cx, cy, 1.5),
    stroke(line(cx - 1.8 * side, cy - 2.3, cx + 1.4 * side, cy - 3.1), "eye", 0.95)
  ],
  x: (cx, cy) => [stroke(`M${cx - 1.3} ${cy - 1.3} L${cx + 1.3} ${cy + 1.3} M${cx + 1.3} ${cy - 1.3} L${cx - 1.3} ${cy + 1.3}`, "eye", 0.95)],
  up: (cx, cy) => [fill(ellipse(cx, cy, 1.45, 1.75), "eye"), fill(circle(cx + 0.2, cy - 0.9, 0.62), "white")]
}

export const EYE_EXPRESSIONS = ["open", "wink", ...Object.keys(EXPRESSION_EYES)]

export function eyeLayers(style, b, expression) {
  const s = EYES[style] || EYES.dot
  const exp = expression || "open"
  const L = 16 - b.eyeDX, R = 16 + b.eyeDX
  if (exp === "open") {
    if (s.shared) return s.draw(16, b.eyeY, 0, b)
    return [...s.draw(L, b.eyeY, -1, b), ...s.draw(R, b.eyeY, 1, b)]
  }
  if (exp === "wink") {
    const left = s.shared ? EXPRESSION_EYES.up(L, b.eyeY, -1) : s.draw(L, b.eyeY, -1, b)
    return [...left, ...EXPRESSION_EYES.happy(R, b.eyeY, 1)]
  }
  const draw = EXPRESSION_EYES[exp] || EXPRESSION_EYES.closed
  return [...draw(L, b.eyeY, -1), ...draw(R, b.eyeY, 1)]
}

export const MOUTHS = {
  smile: { label: "Smile", draw: (b) => [stroke(quad(14.5, b.mouthY - 0.3, 16, b.mouthY + 1.3, 17.5, b.mouthY - 0.3), "eye", 1)] },
  grin: {
    label: "Grin",
    draw: (b) => [
      fill(`M14 ${b.mouthY - 0.6} Q16 ${b.mouthY + 3} 18 ${b.mouthY - 0.6} Z`, "eye"),
      fill(`M15 ${b.mouthY + 1} Q16 ${b.mouthY + 0.3} 17 ${b.mouthY + 1} Q16 ${b.mouthY + 1.9} 15 ${b.mouthY + 1} Z`, TONGUE)
    ]
  },
  cat: {
    label: "Cat",
    draw: (b) => [stroke(`M14.3 ${b.mouthY - 0.3} Q15.15 ${b.mouthY + 1} 16 ${b.mouthY - 0.1} Q16.85 ${b.mouthY + 1} 17.7 ${b.mouthY - 0.3}`, "eye", 0.9)]
  },
  o: { label: "Oh", draw: (b) => [fill(ellipse(16, b.mouthY + 0.2, 0.85, 1.05), "eye")] },
  flat: { label: "Flat", draw: (b) => [stroke(line(14.9, b.mouthY + 0.2, 17.1, b.mouthY + 0.2), "eye", 0.95)] },
  tongue: {
    label: "Tongue out",
    draw: (b) => [
      stroke(quad(14.5, b.mouthY - 0.3, 16, b.mouthY + 1.1, 17.5, b.mouthY - 0.3), "eye", 0.95),
      fill(`M15.5 ${b.mouthY + 0.35} Q15.8 ${b.mouthY + 2.4} 16.6 ${b.mouthY + 2.1} Q17.1 ${b.mouthY + 1.2} 16.9 ${b.mouthY + 0.3} Z`, TONGUE, { stroke: "eye", width: 0.4 })
    ]
  },
  smirk: { label: "Smirk", draw: (b) => [stroke(`M14.7 ${b.mouthY + 0.3} Q16.4 ${b.mouthY + 1.1} 17.8 ${b.mouthY - 0.7}`, "eye", 1)] }
}

// Mouth expressions shared by every face ("base" is the pet's own mouth).
const EXPRESSION_MOUTHS = {
  smile: MOUTHS.smile.draw,
  cat: MOUTHS.cat.draw,
  smirk: MOUTHS.smirk.draw,
  grin: MOUTHS.grin.draw,
  o: MOUTHS.o.draw,
  flat: MOUTHS.flat.draw,
  tongue: MOUTHS.tongue.draw,
  open: (b) => [
    fill(`M14.6 ${b.mouthY - 0.3} Q16 ${b.mouthY + 2.4} 17.4 ${b.mouthY - 0.3} Z`, "eye"),
    fill(ellipse(16, b.mouthY + 1.1, 0.75, 0.42), TONGUE)
  ],
  wavy: (b) => [stroke(`M14.4 ${b.mouthY + 0.2} q0.55 -0.7 1.1 0 q0.55 0.7 1.1 0 q0.55 -0.7 1.1 0`, "eye", 0.85)],
  yawn: (b) => [
    fill(ellipse(16, b.mouthY + 0.5, 1.45, 2), "eye"),
    fill(ellipse(16, b.mouthY + 1.6, 0.9, 0.6), TONGUE)
  ],
  pout: (b) => [
    stroke(quad(15, b.mouthY + 0.8, 16, b.mouthY - 0.2, 17, b.mouthY + 0.8), "eye", 0.95),
    fill(ellipse(16 - b.cheekDX + 0.4, b.cheekY - 0.2, 1.7, 1.3), "cheek", { opacity: 0.55 }),
    fill(ellipse(16 + b.cheekDX - 0.4, b.cheekY - 0.2, 1.7, 1.3), "cheek", { opacity: 0.55 })
  ],
  raspberry: (b) => [
    stroke(quad(14.2, b.mouthY - 0.2, 16, b.mouthY + 0.7, 17.8, b.mouthY - 0.2), "eye", 0.95),
    fill(`M14.9 ${b.mouthY + 0.25} Q15.1 ${b.mouthY + 3.4} 16 ${b.mouthY + 3.2} Q16.9 ${b.mouthY + 3.4} 17.1 ${b.mouthY + 0.25} Z`, TONGUE, { stroke: "eye", width: 0.45 }),
    stroke(line(16, b.mouthY + 0.9, 16, b.mouthY + 2.3), "eye", 0.3, { opacity: 0.5 })
  ],
  frown: (b) => [stroke(quad(14.7, b.mouthY + 0.9, 16, b.mouthY - 0.3, 17.3, b.mouthY + 0.9), "eye", 0.95)],
  kiss: (b) => [stroke(`M16.1 ${b.mouthY - 0.8} q1.2 0.45 0 0.9 q1.2 0.45 0 0.9`, "eye", 0.85)],
  steam: (b) => [fill(ellipse(16, b.mouthY + 0.2, 1.1, 0.55), "eye")]
}

export const MOUTH_EXPRESSIONS = ["base", ...Object.keys(EXPRESSION_MOUTHS)]

export function mouthLayers(style, b, expression) {
  const exp = expression || "base"
  if (exp === "base") return (MOUTHS[style] || MOUTHS.smile).draw(b)
  return (EXPRESSION_MOUTHS[exp] || MOUTHS.smile.draw)(b)
}

export function cheeks(b) {
  return [
    fill(ellipse(16 - b.cheekDX, b.cheekY, 1.65, 0.95), "cheek", { opacity: 0.7 }),
    fill(ellipse(16 + b.cheekDX, b.cheekY, 1.65, 0.95), "cheek", { opacity: 0.7 }),
    fill(circle(16 - b.cheekDX + 0.6, b.cheekY - 0.3, 0.3), "white", { opacity: 0.55 }),
    fill(circle(16 + b.cheekDX + 0.6, b.cheekY - 0.3, 0.3), "white", { opacity: 0.55 })
  ]
}
