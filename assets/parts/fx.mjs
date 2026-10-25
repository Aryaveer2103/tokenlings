// Particle art for the FX pool: small glyphs drawn about (0, 0) in grid units,
// baked once per theme. A particle is one of these, moved, turned, scaled and
// faded by the pool; nothing here is redrawn per frame.
import { circle, ellipse, rrect, line, star, sparkle, heart, fill, stroke, glossy } from "./geometry.mjs"
import { note } from "./props.mjs"

const GOLD = "#FFC93C"

export const FX_BOX = [-4, -4, 8, 8]

export const FX = {
  heart: () => [glossy(heart(0, 0, 1.7), "#FF5C8A", -0.8, -1, 2.2, { width: 0.45 })],
  sparkle: () => [fill(sparkle(0, 0, 2.2), GOLD, { stroke: "outline", width: 0.3 })],
  star: () => [fill(star(0, 0, 2.2, 0.95), GOLD, { stroke: "outline", width: 0.35 })],
  confettiA: () => [fill(rrect(-1.1, -0.5, 2.2, 1, 0.2), "#FF5C8A")],
  confettiB: () => [fill(rrect(-1.1, -0.5, 2.2, 1, 0.2), "#3FD8F2")],
  confettiC: () => [fill(rrect(-1.1, -0.5, 2.2, 1, 0.2), GOLD)],
  confettiD: () => [fill(rrect(-1.1, -0.5, 2.2, 1, 0.2), "#7A5CFF")],
  sweat: () => [fill("M0 -1.8 Q1.4 0.2 1.1 0.9 Q0.6 1.8 0 1.8 Q-0.6 1.8 -1.1 0.9 Q-1.4 0.2 0 -1.8 Z", "#8FD3F4", { stroke: "outline", width: 0.35 }), fill(circle(-0.4, 0.4, 0.3), "#FFFFFF")],
  dust: () => [fill(circle(0, 0, 1.6), "#E8E2D6", { stroke: "outline", width: 0.35, opacity: 0.9 }), fill(circle(-0.5, -0.5, 0.5), "#FFFFFF", { opacity: 0.8 })],
  smoke: () => [fill("M-2 0.8 Q-2.6 -0.8 -1 -1.2 Q-0.4 -2.4 1 -1.6 Q2.6 -1.4 2 0.4 Q2.4 1.8 0.6 1.6 Q-0.6 2.2 -2 0.8 Z", "#9AA1AD", { stroke: "outline", width: 0.35 })],
  speed: () => [stroke(line(-3, 0, 3, 0), "ink", 0.55, { opacity: 0.7 })],
  note: () => note(-1, -1, "accent"),
  z: () => [stroke("M-1.2 -1.2 L1.2 -1.2 L-1.2 1.2 L1.2 1.2", "ink", 0.6)],
  steam: () => [fill(circle(0, 0, 1.4), "#FFFFFF", { opacity: 0.8 })],
  firework: () => {
    const out = []
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4
      out.push(stroke(line(Math.cos(a) * 1, Math.sin(a) * 1, Math.cos(a) * 3.4, Math.sin(a) * 3.4), i % 2 ? "#FF5C8A" : GOLD, 0.55))
    }
    return out
  },
  dot: () => [fill(circle(0, 0, 0.8), "ink")],
  leaf: () => [fill("M-1.6 0.6 Q-1.6 -1.6 1.6 -1.2 Q1.2 1.4 -1.6 0.6 Z", "#5FD36A", { stroke: "outline", width: 0.3 })],
  bubble: () => [stroke(circle(0, 0, 1.4), "#8FD3F4", 0.4), fill(circle(-0.5, -0.5, 0.35), "#FFFFFF")],
  pixel: () => [fill(rrect(-0.9, -0.9, 1.8, 1.8, 0.1), "accent")],
  pebble: () => [fill(ellipse(0, 0, 1.3, 1), "#9AA1AD", { stroke: "outline", width: 0.35 })],
  ball: () => [glossy(circle(0, 0, 1.5), "#FF7A59", -0.5, -0.5, 1.8, { width: 0.4 })],
  plane: () => [fill("M-2.6 0.4 L3.6 -1.6 L-0.6 2 Z", "#FFFFFF", { stroke: "outline", width: 0.4 })],
  mic: () => [stroke(line(0, 0, 0.8, 2.6), "#2B2E31", 0.8), glossy(circle(0, -0.6, 1.2), "#B8C2CF", -0.4, -1, 1.4, { width: 0.4 })],
  bolt: () => [fill("M0.6 -2.4 L-1.2 0.3 L0 0.3 L-0.6 2.4 L1.4 -0.6 L0.2 -0.6 Z", GOLD, { stroke: "outline", width: 0.3 })]
}

export const FX_KINDS = Object.keys(FX)
