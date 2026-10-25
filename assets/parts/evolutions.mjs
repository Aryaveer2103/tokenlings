// Evolved forms: the same pet from another reality. An evolution recolours
// the pet, swaps its hero piece for a stronger one and adds an aura; parts the
// owner chose stay where they are. Every base form has one; a pet can pick
// any (the old personal pets' Inferno, Astral and Cyber looks live here).
//
// palette   overrides for the pet's palette (plus glow, glow2 for the aura)
// replace   { topper?, accessories?: { from: to } } hero swaps
// extra(b)  layers added on top, each with a group like any part
import { circle, ellipse, rrect, line, quad, star, sparkle, fill, stroke, glossy, shine } from "./geometry.mjs"

const flameCrest = (b, glow, glow2) => {
  const [x, y] = [b.top[0], b.top[1] + 0.4]
  return [
    fill(`M${x - 3.2} ${y} C${x - 4.4} ${y - 2.6} ${x - 2.6} ${y - 3.8} ${x - 2.6} ${y - 6.2} C${x - 1} ${y - 4.8} ${x - 0.6} ${y - 3.6} ${x - 0.4} ${y - 2.8} C${x - 0.2} ${y - 5.4} ${x + 1} ${y - 7.2} ${x + 0.8} ${y - 9.2} C${x + 3.2} ${y - 7} ${x + 3.6} ${y - 4.6} ${x + 2.8} ${y - 2.6} C${x + 3.8} ${y - 3.2} ${x + 4.2} ${y - 4.2} ${x + 4.2} ${y - 5.2} C${x + 5.8} ${y - 3.2} ${x + 5.2} ${y - 1.2} ${x + 3.4} ${y} Z`,
      glow, { stroke: "outline", width: 0.7, group: "topper", gradient: { radial: [x, y - 2, 8], stops: [[0, glow2], [0.5, glow], [1, glow]] } }),
    fill(`M${x - 1.6} ${y - 0.2} C${x - 2.2} ${y - 1.8} ${x - 1.4} ${y - 2.6} ${x - 1.2} ${y - 3.8} C${x - 0.2} ${y - 2.8} ${x + 0.2} ${y - 2} ${x + 0.2} ${y - 1.4} C${x + 0.6} ${y - 3} ${x + 1.2} ${y - 4.4} ${x + 1.2} ${y - 5.6} C${x + 2.6} ${y - 4} ${x + 2.8} ${y - 2} ${x + 1.8} ${y - 0.2} Z`, glow2, { group: "topper" })
  ]
}

export const EVOLUTIONS = {
  inferno: {
    label: "Inferno",
    palette: { body: "#D93A22", shade: "#9E2412", light: "#FF9A52", accent: "#FFC93C", cheek: "#FFB347", eye: "#2A0E08", glow: "#FF6A1A", glow2: "#FFE08A" },
    replace: { topper: "none" },
    extra: (b, p) => [
      ...flameCrest(b, p.glow, p.glow2),
      stroke(`M${b.handL[0] + 2.2} 26.2 l1.4 -1.3 l0.6 1.1 l1 -0.9 M${b.handR[0] - 2.2} 26.2 l-1.4 -1.3 l-0.6 1.1 l-1 -0.9`, p.glow2, 0.65, { group: "body", opacity: 0.95 }),
      stroke(`M14 28.8 l1 -1 l0.8 0.8 l1.2 -1.1`, p.glow2, 0.55, { group: "body", opacity: 0.8 })
    ]
  },
  astral: {
    label: "Astral",
    palette: { body: "#7B5CE6", shade: "#5638B8", light: "#C7B6FF", accent: "#FFD86B", cheek: "#FF8AD8", eye: "#160B33", glow: "#A58CFF", glow2: "#FFE9A8", planet: "#F08BD0" },
    replace: { topper: "none", accessories: { bow: "moon" } },
    extra: (b, p) => {
      const out = []
      for (const [[x, y], s] of [[b.earL, -1], [b.earR, 1]]) {
        out.push(glossy(circle(x, y - 1.6, 3.1), p.planet, x - 1, y - 2.6, 4, { behind: true, width: 0.85 }))
        // the ring, tilted toward the outside
        out.push(stroke(`M${x - 4.3} ${y - 1.6 + s * 1.7} Q${x} ${y + 0.6} ${x + 4.3} ${y - 1.6 - s * 1.7}`, p.accent, 0.8, { group: "topper" }))
      }
      out.push(fill(sparkle(10.6, 26.4, 0.95), "#FFF6D0", { group: "body" }), fill(sparkle(21.8, 27.4, 0.8), "#FFF6D0", { group: "body" }))
      out.push(fill(circle(9.4, 22.4, 0.35), "#FFFFFF", { group: "body" }), fill(circle(23.2, 23.2, 0.3), "#FFFFFF", { group: "body" }))
      return out
    }
  },
  cyber: {
    label: "Cyber",
    palette: { body: "#3D4556", shade: "#2B313D", light: "#64708A", accent: "#3AF2FF", cheek: "#FF4FD8", eye: "#9FF7FF", gear: "#14171C", glow: "#3AF2FF", glow2: "#FF4FD8" },
    replace: { accessories: { roundGlasses: "visor", squareGlasses: "visor" } },
    extra: (b, p) => [
      stroke(line(b.top[0], b.top[1] - 0.2, b.top[0], b.top[1] - 3.6), "#8A96AA", 0.8, { group: "topper" }),
      glossy(circle(b.top[0], b.top[1] - 4.2, 1.1), p.glow2, b.top[0] - 0.4, b.top[1] - 4.6, 1.4, { group: "topper", width: 0.45 }),
      stroke(`M${b.handL[0] + 2.4} 28.4 h2.4 v-1.8 h1.8 M${b.handR[0] - 2.4} 28.4 h-2.4 v-1.8 h-1.8`, p.accent, 0.5, { group: "body", opacity: 0.9 }),
      fill(circle(12.8, 26.6, 0.45), p.accent, { group: "body" }), fill(circle(19.2, 26.6, 0.45), p.glow2, { group: "body" })
    ]
  },
  nebula: {
    label: "Nebula",
    palette: { body: "#4B3CC9", shade: "#2E2489", light: "#B9A8FF", accent: "#FF7AD9", cheek: "#FF9AD5", eye: "#0E0A2E", glow: "#8F7BFF", glow2: "#FF7AD9" },
    pattern: "starfield",
    extra: (b, p) => [
      stroke(ellipse(b.top[0], b.top[1] - 1.8, b.hatW + 2.6, 1.4), p.glow2, 0.7, { group: "topper", opacity: 0.85 }),
      fill(star(b.top[0] + b.hatW + 2.2, b.top[1] - 2.2, 1, 0.42), "#FFF2B0", { group: "topper" })
    ]
  },
  moonlit: {
    label: "Moonlit",
    palette: { body: "#E9E6FF", shade: "#BDB6E8", light: "#FFFFFF", accent: "#FFC93C", cheek: "#F6A6B8", eye: "#26264A", glow: "#9AA8FF", glow2: "#FFF2B0" },
    pattern: "starfield",
    extra: (b, p) => [fill(star(b.earL[0] + 1, b.earL[1] - 1, 1.1, 0.45), p.accent, { group: "topper", stroke: "outline", width: 0.3 })]
  },
  neon: {
    label: "Neon",
    palette: { body: "#141418", shade: "#26262E", light: "#3A3A48", accent: "#FF4FA3", cheek: "#FF4FA3", eye: "#F4F4F0", glow: "#FF4FA3", glow2: "#FFE36E" },
    replace: { topper: "none" },
    extra: (b, p) => [
      fill(`M${b.top[0] - 0.4} ${b.top[1] + 0.6} L${b.top[0] + 1.6} ${b.top[1] - 2.6} L${b.top[0] + 0.4} ${b.top[1] - 2.6} L${b.top[0] + 2.2} ${b.top[1] - 6} L${b.top[0] - 1} ${b.top[1] - 1.6} L${b.top[0] + 0.4} ${b.top[1] - 1.6} Z`, p.glow2, { group: "topper", stroke: "outline", width: 0.5 }),
      stroke(`M${b.handL[0] + 2} 27.6 q2 -1.4 4 0 q2 1.4 4 0`, p.glow, 0.6, { group: "body", opacity: 0.9 })
    ]
  },
  abyss: {
    label: "Abyss",
    palette: { body: "#123A7A", shade: "#0B2654", light: "#3FD8F2", accent: "#7CFFE8", cheek: "#F49AB8", eye: "#E8FFFF", glow: "#3FD8F2", glow2: "#B8FFF4" },
    extra: (b, p) => [
      fill(circle(10.8, 25, 0.6), p.glow2, { group: "body" }), fill(circle(21.4, 24.2, 0.5), p.glow2, { group: "body" }),
      fill(circle(19, 28.6, 0.45), p.glow2, { group: "body" }), fill(circle(12.8, 28.4, 0.35), p.glow2, { group: "body" }),
      stroke(line(b.top[0], b.top[1] + 0.6, b.top[0] + 2, b.top[1] - 2.6), "#8A96AA", 0.55, { group: "topper" }),
      glossy(circle(b.top[0] + 2.4, b.top[1] - 3.2, 1), p.glow2, b.top[0] + 2, b.top[1] - 3.6, 1.2, { group: "topper", width: 0.4 })
    ]
  },
  glitch: {
    label: "Glitch",
    palette: { body: "#0D0F12", shade: "#1E2228", light: "#2A2F37", accent: "#FF3D7F", cheek: "#3FD8F2", eye: "#3FE07F", glow: "#3FE07F", glow2: "#FF3D7F" },
    extra: (b, p) => [
      fill(rrect(b.handL[0] - 1.6, 16, 2.4, 1.2, 0.1), p.glow2, { group: "front" }),
      fill(rrect(b.handR[0], 21, 2, 1, 0.1), p.glow, { group: "front" }),
      fill(rrect(b.handR[0] - 1.2, 12.6, 1.4, 1.4, 0.1), p.glow, { group: "topper" }),
      fill(rrect(b.handL[0] + 0.8, 27, 1.4, 0.8, 0.1), "#3FD8F2", { group: "front" })
    ]
  },
  comet: {
    label: "Comet",
    palette: { body: "#F1EBFF", shade: "#C9BCF2", light: "#FFFFFF", accent: "#7FD8FF", cheek: "#FFB0D8", eye: "#2A2148", glow: "#B9A7F2", glow2: "#7FD8FF" },
    extra: (b, p) => [
      fill(`M${b.handL[0] - 1} 16 Q${b.handL[0] - 6} 20 ${b.handL[0] - 7.4} 28 Q${b.handL[0] - 3} 24 ${b.handL[0]} 25 Z`, p.glow2, { behind: true, opacity: 0.6 }),
      fill(`M${b.handL[0]} 18 Q${b.handL[0] - 3.6} 21 ${b.handL[0] - 4.6} 26 Q${b.handL[0] - 1.6} 23.4 ${b.handL[0] + 0.6} 24 Z`, "#FFFFFF", { behind: true, opacity: 0.7 })
    ]
  },
  encore: {
    label: "Encore",
    palette: { body: "#FFB8D9", shade: "#E88AB8", light: "#FFE3F0", accent: "#FFC93C", cheek: "#FF7AB0", eye: "#3A2340", glow: "#FFC93C", glow2: "#FF8FC0" },
    extra: (b, p) => [fill(star(b.handR[0] + 0.4, 18, 1.1, 0.45), p.accent, { group: "front", stroke: "outline", width: 0.3 }), fill(star(b.handL[0] - 0.2, 20, 0.8, 0.34), "#FFFFFF", { group: "front" })]
  },
  prime: {
    label: "Prime",
    palette: { glow: "#FFE36E", glow2: "#FFFFFF" },
    extra: (b, p) => {
      const [x, y] = b.top, out = []
      for (let i = -2; i <= 2; i++) out.push(fill(rrect(x + i * 1.6 - 0.7, y - 2.6 - (i % 2 ? 0 : 1.2), 1.4, 1.4 + (i % 2 ? 0 : 1.2), 0.1), "#FFC93C", { group: "topper", stroke: "outline", width: 0.35 }))
      return out
    }
  }
}

// The visor that replaces glasses on a Cyber pet (face group).
export function visorLayers(b, p) {
  return [
    fill(rrect(16 - b.eyeDX - 3.6, b.eyeY - 2.6, 2 * b.eyeDX + 7.2, 5.2, 2.6), p.accent, { opacity: 0.4, stroke: p.accent, width: 0.8 }),
    stroke(line(16 - b.eyeDX - 2, b.eyeY - 1.5, 16 - b.eyeDX + 2.6, b.eyeY - 1.5), "#FFFFFF", 0.5, { opacity: 0.7 })
  ]
}

// The crescent moon that replaces a bow on an Astral pet (topper group).
export function moonLayers(b, p) {
  const cx = b.top[0] + b.hatW * 0.75, cy = b.top[1] + 0.4
  return [glossy(`M${cx} ${cy - 2.6} A2.6 2.6 0 1 0 ${cx} ${cy + 2.6} A2 2.6 0 1 1 ${cx} ${cy - 2.6} Z`, p.accent, cx - 1.6, cy - 1.6, 3, { width: 0.55 })]
}

export const EVOLUTION_NAMES = Object.keys(EVOLUTIONS)
