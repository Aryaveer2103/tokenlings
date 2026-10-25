// Toppers, accessories and patterns. Each `draw(b)` takes a body (its anchors,
// see bodies.mjs) and returns layers in the 32×32 grid. A layer with
// `behind: true` is drawn behind the body (ears, buns, capes, bags); the rest
// in front. `group` says which rig group carries it: "topper" (springs about
// the head top), "face" (follows the gaze), "front" (moves with the body).
//
// Finish: outlines follow the theme, hard things are glossy (a lit gradient
// plus a white shine), soft things get a highlight stroke. All of it is baked,
// so the detail costs nothing per frame.
import { circle, ellipse, rrect, line, quad, poly, star, sparkle, fill, stroke, outlined, glossy, shine } from "./geometry.mjs"

const GOLD = "#FFC93C"
const LEAF = "#5FD36A"

function mirror(b, fn) { return [...fn(b.earL, -1), ...fn(b.earR, 1)] }

export const TOPPERS = {
  none: { label: "None", draw: () => [] },
  curl: {
    label: "Curl",
    draw: (b) => {
      const [x, y] = b.top
      const d = `M${x - 0.4} ${y + 0.4} C${x - 1.8} ${y - 3.4} ${x + 2.4} ${y - 5.6} ${x + 3.8} ${y - 3.2} C${x + 4.8} ${y - 1.4} ${x + 2.4} ${y - 0.2} ${x + 1.8} ${y - 1.8}`
      return [stroke(d, "outline", 2.4), stroke(d, "shade", 1.5), stroke(`M${x - 0.6} ${y - 1.6} C${x - 0.6} ${y - 3.4} ${x + 1.6} ${y - 4.6} ${x + 2.8} ${y - 4}`, "light", 0.45, { opacity: 0.8 })]
    }
  },
  buns: {
    label: "Space buns",
    draw: (b) => mirror(b, ([x, y], s) => [
      glossy(circle(x + 0.6 * s, y - 1.8, 2.9), "body", x + 0.6 * s - 1, y - 3, 3.6, { behind: true, width: 0.85 }),
      stroke(`M${x + 0.6 * s - 1.2} ${y - 1.6} Q${x + 0.6 * s} ${y - 3.3} ${x + 0.6 * s + 1.2} ${y - 1.6}`, "shade", 0.6, { behind: true }),
      shine(x + 0.6 * s - 0.9, y - 3, 0.7, 0.45, { behind: true, opacity: 0.6 })
    ])
  },
  sprout: {
    label: "Sprout",
    draw: (b) => {
      const [x, y] = b.top
      return [
        stroke(quad(x, y + 0.4, x + 0.3, y - 1.8, x, y - 3.2), "#3E9F4A", 0.8),
        fill(`M${x} ${y - 3} Q${x - 3.2} ${y - 4.8} ${x - 3.6} ${y - 2.6} Q${x - 1.6} ${y - 1.6} ${x} ${y - 3} Z`, LEAF, { stroke: "outline", width: 0.55 }),
        fill(`M${x} ${y - 3.2} Q${x + 2.8} ${y - 5.8} ${x + 3.6} ${y - 3.6} Q${x + 1.8} ${y - 2.2} ${x} ${y - 3.2} Z`, LEAF, { stroke: "outline", width: 0.55 }),
        stroke(quad(x + 0.6, y - 3.5, x + 1.8, y - 4.4, x + 2.8, y - 3.9), "#B8F5BE", 0.35)
      ]
    }
  },
  antenna: {
    label: "Antenna",
    draw: (b) => {
      const [x, y] = b.top
      return [
        stroke(line(x, y + 0.3, x + 0.6, y - 4), "outline", 1.3), stroke(line(x, y + 0.3, x + 0.6, y - 4), "shade", 0.6),
        glossy(circle(x + 0.6, y - 4.8, 1.45), "accent", x, y - 5.5, 2),
        shine(x + 0.15, y - 5.3, 0.45, 0.32)
      ]
    }
  },
  earsCat: {
    label: "Cat ears",
    draw: (b) => mirror(b, ([x, y], s) => [
      outlined(poly([[x - 2.3 * s, y + 1.7], [x + 0.2 * s, y - 4.3], [x + 2.5 * s, y + 0.6]]), "body", { behind: true, width: 0.85 }),
      fill(poly([[x - 0.9 * s, y + 0.6], [x + 0.2 * s, y - 2.4], [x + 1.25 * s, y + 0.2]]), "cheek", { behind: true, opacity: 0.85 })
    ])
  },
  earsBunny: {
    label: "Bunny ears",
    draw: (b) => mirror(b, ([x, y], s) => [
      outlined(`M${x - 1.6} ${y + 1} Q${x - 2.3 + 0.8 * s} ${y - 7.6} ${x + 0.4 * s} ${y - 8.2} Q${x + 2.1 + 0.6 * s} ${y - 7.2} ${x + 1.6} ${y + 1} Z`, "body", { behind: true, width: 0.85 }),
      fill(`M${x - 0.5} ${y} Q${x - 0.8 + 0.6 * s} ${y - 5.8} ${x + 0.4 * s} ${y - 6.4} Q${x + 1 + 0.4 * s} ${y - 5.6} ${x + 0.5} ${y} Z`, "cheek", { behind: true, opacity: 0.8 })
    ])
  },
  earsBear: {
    label: "Bear ears",
    draw: (b) => mirror(b, ([x, y], s) => [
      glossy(circle(x - 0.2 * s, y - 0.6, 2.6), "body", x - 1, y - 1.6, 3.4, { behind: true, width: 0.85 }),
      fill(circle(x - 0.2 * s, y - 0.6, 1.3), "shade", { behind: true })
    ])
  },
  cowlick: {
    label: "Cowlick",
    draw: (b) => {
      const [x, y] = b.top
      const a = quad(x - 0.6, y + 0.3, x - 1.8, y - 2, x - 0.4, y - 3.4), c = quad(x + 0.2, y + 0.3, x + 0.6, y - 2.2, x + 2.3, y - 2.9)
      return [stroke(a, "outline", 2), stroke(c, "outline", 2), stroke(a, "shade", 1.15), stroke(c, "shade", 1.15)]
    }
  },
  ponytail: {
    label: "Ponytail",
    draw: (b) => {
      const [x, y] = b.earR
      return [
        outlined(`M${x - 1} ${y - 0.6} Q${x + 3.8} ${y - 2.8} ${x + 4.4} ${y + 2.6} Q${x + 4.6} ${y + 6} ${x + 2.4} ${y + 7} Q${x + 3} ${y + 3} ${x} ${y + 1.6} Z`, "shade", { behind: true, width: 0.85 }),
        glossy(rrect(x - 1, y - 1.5, 1.8, 2.2, 0.6), "accent", x - 0.6, y - 1.4, 2)
      ]
    }
  },
  crescentClip: {
    label: "Crescent clip",
    draw: (b) => {
      const [x, y] = b.earR
      const cx = x - 1.3, cy = y - 0.9
      return [
        glossy(`M${cx} ${cy - 2.3} A2.3 2.3 0 1 0 ${cx} ${cy + 2.3} A1.7 2.3 0 1 1 ${cx} ${cy - 2.3} Z`, "accent", cx - 1.4, cy - 1.4, 3, { width: 0.6 }),
        fill(sparkle(cx + 1.6, cy - 1.8, 0.75), GOLD)
      ]
    }
  },
  waveFringe: {
    label: "Wave fringe",
    draw: (b) => {
      const [x, y] = b.top
      const w = b.hatW + 1.2, yy = y + 2.6
      const crest = `M${x - w} ${yy + 1.2} Q${x - w / 2} ${yy - 2.2} ${x} ${yy + 0.6} Q${x + w / 2} ${yy + 3} ${x + w} ${yy - 0.8}`
      return [stroke(crest, "outline", 2.5), stroke(crest, "light", 1.6), stroke(crest, "#FFFFFF", 0.5, { opacity: 0.85 }),
              fill(circle(x + w + 0.6, yy - 2.2, 0.55), "light", { stroke: "outline", width: 0.35 }),
              fill(circle(x + w - 0.6, yy - 3.4, 0.35), "light", { stroke: "outline", width: 0.3 })]
    }
  },
  noteAntennae: {
    label: "Note antennae",
    draw: (b) => {
      const [x, y] = b.top
      return [
        stroke(quad(x - 1.4, y + 0.6, x - 2.4, y - 2, x - 2.2, y - 4.2), "outline", 1.3),
        stroke(quad(x + 1.4, y + 0.6, x + 2.6, y - 2.2, x + 2.8, y - 4.6), "outline", 1.3),
        stroke(quad(x - 1.4, y + 0.6, x - 2.4, y - 2, x - 2.2, y - 4.2), "shade", 0.6),
        stroke(quad(x + 1.4, y + 0.6, x + 2.6, y - 2.2, x + 2.8, y - 4.6), "shade", 0.6),
        glossy(ellipse(x - 3, y - 4.3, 1.25, 0.95), "accent", x - 3.4, y - 4.8, 1.6, { width: 0.5 }),
        glossy(ellipse(x + 2, y - 4.7, 1.25, 0.95), "accent", x + 1.6, y - 5.2, 1.6, { width: 0.5 }),
        stroke(`M${x + 3.1} ${y - 4.7} L${x + 3.1} ${y - 7.2} Q${x + 4.4} ${y - 6.6} ${x + 4.6} ${y - 5.6}`, "accent", 0.6)
      ]
    }
  }
}

export const ACCESSORIES = {
  headphones: {
    label: "Headphones", group: "front",
    draw: (b) => {
      const [x, y] = b.top
      const [lx, ly] = b.earL, [rx, ry] = b.earR
      const band = `M${lx - 1.1} ${ly + 2.2} C${lx - 1.4} ${y - 3.2} ${rx + 1.4} ${y - 3.2} ${rx + 1.1} ${ry + 2.2}`
      return [
        stroke(band, "outline", 2.1), stroke(band, "gear", 1.3),
        glossy(rrect(lx - 2.8, ly + 0.5, 3.3, 4.6, 1.3), "gear", lx - 2, ly + 1, 3.5),
        glossy(rrect(rx - 0.5, ry + 0.5, 3.3, 4.6, 1.3), "gear", rx + 0.3, ry + 1, 3.5),
        fill(rrect(lx - 1.9, ly + 1.6, 1, 2.6, 0.5), "accent"),
        fill(rrect(rx + 1.4, ry + 1.6, 1, 2.6, 0.5), "accent")
      ]
    }
  },
  roundGlasses: {
    label: "Round glasses", group: "face",
    draw: (b) => [
      fill(circle(16 - b.eyeDX, b.eyeY, 2.6), "#FFFFFF", { opacity: 0.16 }),
      fill(circle(16 + b.eyeDX, b.eyeY, 2.6), "#FFFFFF", { opacity: 0.16 }),
      stroke(circle(16 - b.eyeDX, b.eyeY, 2.6), "gear", 0.85),
      stroke(circle(16 + b.eyeDX, b.eyeY, 2.6), "gear", 0.85),
      stroke(quad(16 - b.eyeDX + 2.5, b.eyeY - 0.3, 16, b.eyeY - 1.1, 16 + b.eyeDX - 2.5, b.eyeY - 0.3), "gear", 0.75),
      stroke(line(16 + b.eyeDX + 0.4, b.eyeY - 1.7, 16 + b.eyeDX + 1.6, b.eyeY - 0.5), "#FFFFFF", 0.5, { opacity: 0.9 }),
      stroke(line(16 - b.eyeDX + 0.4, b.eyeY - 1.7, 16 - b.eyeDX + 1.6, b.eyeY - 0.5), "#FFFFFF", 0.5, { opacity: 0.9 })
    ]
  },
  squareGlasses: {
    label: "Square glasses", group: "face",
    draw: (b) => [
      fill(rrect(16 - b.eyeDX - 2.4, b.eyeY - 1.9, 4.8, 3.8, 0.7), "#FFFFFF", { opacity: 0.16 }),
      fill(rrect(16 + b.eyeDX - 2.4, b.eyeY - 1.9, 4.8, 3.8, 0.7), "#FFFFFF", { opacity: 0.16 }),
      stroke(rrect(16 - b.eyeDX - 2.4, b.eyeY - 1.9, 4.8, 3.8, 0.7), "gear", 0.85),
      stroke(rrect(16 + b.eyeDX - 2.4, b.eyeY - 1.9, 4.8, 3.8, 0.7), "gear", 0.85),
      stroke(line(16 - b.eyeDX + 2.4, b.eyeY - 0.7, 16 + b.eyeDX - 2.4, b.eyeY - 0.7), "gear", 0.75),
      stroke(line(16 + b.eyeDX + 0.2, b.eyeY - 1.4, 16 + b.eyeDX + 1.4, b.eyeY - 0.2), "#FFFFFF", 0.5, { opacity: 0.9 })
    ]
  },
  monocle: {
    label: "Monocle", group: "face",
    draw: (b) => [
      fill(circle(16 + b.eyeDX, b.eyeY, 2.5), "#FFFFFF", { opacity: 0.18 }),
      stroke(circle(16 + b.eyeDX, b.eyeY, 2.5), GOLD, 0.8),
      stroke(`M${16 + b.eyeDX + 1.7} ${b.eyeY + 1.9} Q${16 + b.eyeDX + 2.8} ${b.eyeY + 4.2} ${16 + b.eyeDX + 1.2} ${b.neckY}`, GOLD, 0.4),
      stroke(line(16 + b.eyeDX + 0.5, b.eyeY - 1.6, 16 + b.eyeDX + 1.6, b.eyeY - 0.6), "#FFFFFF", 0.5)
    ]
  },
  scarf: {
    label: "Scarf", group: "front",
    draw: (b) => [
      glossy(rrect(16 - b.neckHalf + 1, b.neckY - 1.4, 2 * b.neckHalf - 2, 2.8, 1.4), "accent", 12, b.neckY - 1.6, 9),
      glossy(rrect(16 + b.neckHalf * 0.35, b.neckY - 0.5, 2.5, 4.8, 0.9), "accent", 16 + b.neckHalf * 0.35, b.neckY, 4),
      stroke(line(16 + b.neckHalf * 0.35 + 0.5, b.neckY + 3.4, 16 + b.neckHalf * 0.35 + 2, b.neckY + 3.4), "tone:accent", 0.45)
    ]
  },
  bow: {
    label: "Bow", group: "topper",
    draw: (b) => {
      const cx = b.top[0] + b.hatW * 0.75, cy = b.top[1] + 0.6
      return [
        glossy(`M${cx} ${cy} L${cx - 2.9} ${cy - 1.9} Q${cx - 3.4} ${cy} ${cx - 2.6} ${cy + 1.8} Z`, "accent", cx - 2.4, cy - 1.2, 3, { width: 0.6 }),
        glossy(`M${cx} ${cy} L${cx + 2.9} ${cy - 1.9} Q${cx + 3.4} ${cy} ${cx + 2.6} ${cy + 1.8} Z`, "accent", cx + 1.4, cy - 1.2, 3, { width: 0.6 }),
        glossy(circle(cx, cy, 0.9), "accent", cx - 0.3, cy - 0.4, 1.2, { width: 0.55 })
      ]
    }
  },
  beanie: {
    label: "Beanie", group: "topper",
    draw: (b) => {
      const [x, y] = b.top, w = b.hatW + 0.9
      return [
        glossy(`M${x - w} ${y + 2.6} Q${x - w} ${y - 3.6} ${x} ${y - 3.6} Q${x + w} ${y - 3.6} ${x + w} ${y + 2.6} Z`, "accent", x - 2, y - 2.6, 7),
        stroke(line(x - 2, y - 2.6, x - 2.3, y + 1.4), "tone:accent", 0.45), stroke(line(x + 2, y - 2.6, x + 2.3, y + 1.4), "tone:accent", 0.45),
        outlined(rrect(x - w - 0.4, y + 1.3, 2 * w + 0.8, 2.2, 0.9), "tone:accent"),
        glossy(circle(x, y - 4, 1.35), "#FFFFFF", x - 0.5, y - 4.5, 1.6)
      ]
    }
  },
  cap: {
    label: "Cap", group: "topper",
    draw: (b) => {
      const [x, y] = b.top, w = b.hatW + 0.5
      return [
        glossy(`M${x - w} ${y + 2.2} Q${x - w} ${y - 3} ${x} ${y - 3} Q${x + w} ${y - 3} ${x + w} ${y + 2.2} Z`, "accent", x - 2, y - 2, 7),
        glossy(`M${x + w - 1} ${y + 1.3} Q${x + w + 4.2} ${y + 1.1} ${x + w + 4.4} ${y + 2.6} L${x + w - 1} ${y + 2.6} Z`, "tone:accent", x + w + 1, y + 1.4, 3),
        fill(circle(x, y - 3, 0.6), "tone:accent")
      ]
    }
  },
  crown: {
    label: "Crown", group: "topper", unlockLevel: 5,
    draw: (b) => {
      const [x, y] = b.top, w = Math.min(b.hatW, 4.6)
      return [
        glossy(poly([[x - w, y + 1], [x - w, y - 2.8], [x - w / 2, y - 0.9], [x, y - 3.7], [x + w / 2, y - 0.9], [x + w, y - 2.8], [x + w, y + 1]]), GOLD, x - 1.5, y - 2, 5),
        glossy(circle(x, y - 0.4, 0.7), "#E8415A", x - 0.2, y - 0.6, 0.9, { width: 0.4 }),
        fill(circle(x - w, y - 2.9, 0.45), "#FFFFFF"), fill(circle(x + w, y - 2.9, 0.45), "#FFFFFF"), fill(circle(x, y - 3.8, 0.45), "#FFFFFF")
      ]
    }
  },
  halo: {
    label: "Halo", group: "topper", unlockLevel: 8,
    draw: (b) => {
      const [x, y] = b.top
      return [stroke(ellipse(x, y - 3.2, b.hatW * 0.95, 1.2), "#FFF2B0", 1.6, { opacity: 0.5 }), stroke(ellipse(x, y - 3.2, b.hatW * 0.95, 1.2), GOLD, 0.8)]
    }
  },
  bandana: {
    label: "Bandana", group: "front",
    draw: (b) => [
      glossy(rrect(16 - b.neckHalf + 1.3, b.neckY - 1.1, 2 * b.neckHalf - 2.6, 2, 0.9), "accent", 12, b.neckY - 1, 8),
      glossy(poly([[16 - 3.6, b.neckY + 0.6], [16 + 3.6, b.neckY + 0.6], [16, b.neckY + 4]]), "accent", 15, b.neckY + 1, 4),
      fill(circle(14.8, b.neckY + 1.4, 0.32), "white"), fill(circle(17, b.neckY + 1.8, 0.32), "white"), fill(circle(16, b.neckY + 2.8, 0.28), "white")
    ]
  },
  cape: {
    label: "Cape", group: "front",
    draw: (b) => [
      glossy(`M${16 - b.neckHalf + 1} ${b.neckY - 2} L${b.handL[0] - 2.6} 30.4 Q16 31.4 ${b.handR[0] + 2.6} 30.4 L${16 + b.neckHalf - 1} ${b.neckY - 2} Z`, "accent", 12, b.neckY, 12, { behind: true }),
      glossy(circle(16 - 3, b.neckY - 1, 0.8), GOLD, 12.8, b.neckY - 1.3, 1, { width: 0.4 }),
      glossy(circle(16 + 3, b.neckY - 1, 0.8), GOLD, 18.8, b.neckY - 1.3, 1, { width: 0.4 })
    ]
  },
  backpack: {
    label: "Backpack", group: "front",
    draw: (b) => [
      glossy(rrect(b.handR[0] - 2.6, b.neckY - 6.6, 5.8, 8.4, 1.8), "accent", b.handR[0] - 1, b.neckY - 6, 6, { behind: true }),
      fill(rrect(b.handR[0] - 1.6, b.neckY - 2.6, 3.8, 2.6, 0.8), "tone:accent", { behind: true, stroke: "outline", width: 0.5 }),
      stroke(quad(16 - 4.4, b.neckY - 1.4, 16 - 4.6, b.neckY + 0.6, 16 - 3.8, b.neckY + 2.6), "outline", 1.6),
      stroke(quad(16 + 4.4, b.neckY - 1.4, 16 + 4.6, b.neckY + 0.6, 16 + 3.8, b.neckY + 2.6), "outline", 1.6),
      stroke(quad(16 - 4.4, b.neckY - 1.4, 16 - 4.6, b.neckY + 0.6, 16 - 3.8, b.neckY + 2.6), "accent", 0.9),
      stroke(quad(16 + 4.4, b.neckY - 1.4, 16 + 4.6, b.neckY + 0.6, 16 + 3.8, b.neckY + 2.6), "accent", 0.9)
    ]
  },
  bellCollar: {
    label: "Bell collar", group: "front",
    draw: (b) => [
      fill(rrect(16 - b.neckHalf + 1.3, b.neckY - 0.7, 2 * b.neckHalf - 2.6, 1.4, 0.7), "#E5484D", { stroke: "outline", width: 0.5 }),
      glossy(circle(16, b.neckY + 1.7, 1.45), GOLD, 15.4, b.neckY + 1.1, 1.8),
      stroke(line(16, b.neckY + 2, 16, b.neckY + 2.9), "outline", 0.4)
    ]
  },
  flower: {
    label: "Flower", group: "topper",
    draw: (b) => {
      const [x, y] = b.earL
      const cx = x + 1, cy = y - 0.6, petals = []
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / 5
        petals.push(glossy(circle(cx + 1.25 * Math.cos(a), cy + 1.25 * Math.sin(a), 0.95), "#FF8FC0", cx - 0.8, cy - 1.4, 3, { width: 0.4 }))
      }
      return [...petals, glossy(circle(cx, cy, 0.75), "#FFD54A", cx - 0.2, cy - 0.3, 1, { width: 0.35 })]
    }
  },
  nightcap: {
    label: "Nightcap", group: "topper",
    draw: (b) => {
      const [x, y] = b.top, w = b.hatW + 0.7
      return [
        glossy(`M${x - w} ${y + 2} Q${x - 1} ${y - 4.8} ${x + w + 3.8} ${y - 1.4} Q${x + 2} ${y - 1} ${x + w} ${y + 2} Z`, "accent", x - 2, y - 2, 7),
        fill(star(x - 1.5, y - 1, 0.7, 0.3), "#FFF2B0"), fill(star(x + 2, y - 1.6, 0.55, 0.25), "#FFF2B0"),
        outlined(rrect(x - w - 0.4, y + 1, 2 * w + 0.8, 2, 0.9), "#FFFFFF"),
        glossy(circle(x + w + 4, y - 1.2, 1.15), "#FFFFFF", x + w + 3.6, y - 1.6, 1.4)
      ]
    }
  },
  // Hero pieces of the base forms (usable by anyone).
  sleepMask: {
    label: "Sleep mask", group: "topper",
    draw: (b) => {
      const [x, y] = b.top, w = b.hatW + 1.4, my = y + 2.8
      return [
        stroke(`M${x - w - 0.6} ${my + 0.6} Q${x} ${my - 1.6} ${x + w + 0.6} ${my + 0.6}`, "outline", 1.3),
        stroke(`M${x - w - 0.6} ${my + 0.6} Q${x} ${my - 1.6} ${x + w + 0.6} ${my + 0.6}`, "#9AA8FF", 0.6),
        glossy(`M${x - 4.8} ${my} Q${x - 4.8} ${my - 2.2} ${x - 2.4} ${my - 2.2} Q${x - 0.8} ${my - 2.2} ${x} ${my - 1.4} Q${x + 0.8} ${my - 2.2} ${x + 2.4} ${my - 2.2} Q${x + 4.8} ${my - 2.2} ${x + 4.8} ${my} Q${x + 4.8} ${my + 1.8} ${x + 2.4} ${my + 1.8} Q${x + 0.8} ${my + 1.8} ${x} ${my + 1} Q${x - 0.8} ${my + 1.8} ${x - 2.4} ${my + 1.8} Q${x - 4.8} ${my + 1.8} ${x - 4.8} ${my} Z`, "light", x - 2.5, my - 1.6, 6),
        stroke(quad(x - 3.6, my + 0.2, x - 2.4, my + 0.9, x - 1.2, my + 0.2), "accent", 0.6),
        stroke(quad(x + 1.2, my + 0.2, x + 2.4, my + 0.9, x + 3.6, my + 0.2), "accent", 0.6),
        fill(star(x + 3.6, my - 1.9, 0.8, 0.35), GOLD)
      ]
    }
  },
  shades: {
    label: "Shades", group: "topper",
    draw: (b) => {
      const [x, y] = b.top, sy = y + 2.4
      const lens = (cx) => `M${cx - 2.5} ${sy - 1} L${cx + 2.5} ${sy - 1} Q${cx + 2.4} ${sy + 1.8} ${cx} ${sy + 1.8} Q${cx - 2.4} ${sy + 1.8} ${cx - 2.5} ${sy - 1} Z`
      const mirror = { radial: [x - 2, sy - 1, 6], stops: [[0, "#FFE36E"], [0.5, "#FF4FA3"], [1, "#6A3CFF"]] }
      return [
        fill(lens(x - 2.8), "#FF4FA3", { stroke: "#F4F4F0", width: 0.6, gradient: mirror }),
        fill(lens(x + 2.8), "#FF4FA3", { stroke: "#F4F4F0", width: 0.6, gradient: mirror }),
        stroke(line(x - 0.3, sy - 0.8, x + 0.3, sy - 0.8), "#F4F4F0", 0.6),
        stroke(line(x - 3.6, sy - 0.3, x - 2.4, sy + 1), "#FFFFFF", 0.45, { opacity: 0.9 }),
        stroke(line(x + 2, sy - 0.3, x + 3.2, sy + 1), "#FFFFFF", 0.45, { opacity: 0.9 })
      ]
    }
  },
  orbitRing: {
    label: "Orbit ring", group: "front",
    draw: (b) => {
      const cy = (b.top[1] + 30.6) / 2 + 2.6, rx = 13.2, ry = 2.6
      return [
        stroke(`M${16 - rx} ${cy} A${rx} ${ry} 0 0 1 ${16 + rx} ${cy}`, "outline", 1.8, { behind: true }),
        stroke(`M${16 - rx} ${cy} A${rx} ${ry} 0 0 1 ${16 + rx} ${cy}`, "accent", 1, { behind: true }),
        stroke(`M${16 + rx} ${cy} A${rx} ${ry} 0 0 1 ${16 - rx} ${cy}`, "outline", 1.8),
        stroke(`M${16 + rx} ${cy} A${rx} ${ry} 0 0 1 ${16 - rx} ${cy}`, "accent", 1),
        stroke(`M${16 + rx * 0.2} ${cy + ry * 0.98} A${rx} ${ry} 0 0 1 ${16 - rx * 0.6} ${cy + ry * 0.8}`, "#FFFFFF", 0.4, { opacity: 0.8 }),
        glossy(circle(16 + rx * 0.82, cy + ry * 0.55, 0.95), "light", 16 + rx * 0.8, cy, 1.2, { width: 0.45 })
      ]
    }
  }
}

export const PATTERNS = {
  none: { label: "None", draw: () => [] },
  bellyPatch: {
    label: "Belly patch",
    draw: (b) => {
      const t = b.torso
      return [fill(ellipse(t.x + t.w / 2, t.y + t.h / 2, t.w / 2 + 0.4, t.h / 2 + 0.3), "light",
                   { gradient: { radial: [t.x + t.w * 0.35, t.y, t.w * 0.9], stops: [[0, "tint:light"], [0.6, "light"], [1, "light"]] } })]
    }
  },
  spots: {
    label: "Spots",
    draw: (b) => {
      const t = b.torso
      return [
        fill(circle(t.x + t.w * 0.18, t.y + t.h * 0.3, 1), "shade"),
        fill(circle(t.x + t.w * 0.62, t.y + t.h * 0.22, 0.8), "shade"),
        fill(circle(t.x + t.w * 0.84, t.y + t.h * 0.66, 1.1), "shade"),
        fill(circle(t.x + t.w * 0.4, t.y + t.h * 0.72, 0.7), "shade")
      ]
    }
  },
  stripes: {
    label: "Stripes",
    draw: (b) => {
      const t = b.torso, out = []
      for (let i = 0; i < 3; i++) {
        const y = t.y + t.h * (0.2 + 0.3 * i)
        out.push(stroke(quad(t.x + 0.6, y, t.x + t.w / 2, y + 0.9, t.x + t.w - 0.6, y), "shade", 0.85))
      }
      return out
    }
  },
  // The body itself fills with a top-to-bottom gradient (light → body → accent).
  gradient: { label: "Gradient", bodyGradient: ["body", "accent"], draw: () => [] },
  freckles: {
    label: "Freckles", group: "face",
    draw: (b) => {
      const out = []
      for (const s of [-1, 1]) {
        const cx = 16 + s * b.cheekDX, cy = b.cheekY - 0.2
        out.push(fill(circle(cx - 0.7, cy, 0.28), "shade"), fill(circle(cx + 0.2, cy - 0.5, 0.28), "shade"), fill(circle(cx + 0.6, cy + 0.4, 0.28), "shade"))
      }
      return out
    }
  },
  // A screen's scanlines across the body (a terminal-ish nod).
  scanlines: {
    label: "Scanlines",
    draw: (b) => {
      const out = [], x0 = b.handL[0] + 2.2, x1 = b.handR[0] - 2.2
      for (let y = b.top[1] + 3; y < 29.4; y += 1.5) out.push(stroke(line(x0, y, x1, y), "light", 0.35, { opacity: 0.35 }))
      return out
    }
  },
  starfield: {
    label: "Starfield",
    draw: (b) => {
      const t = b.torso, out = []
      const pts = [[0.15, 0.2, 0.7], [0.55, 0.1, 0.5], [0.85, 0.5, 0.6], [0.35, 0.75, 0.45], [0.7, 0.85, 0.4]]
      for (const [px, py, s] of pts) out.push(fill(sparkle(t.x + t.w * px, t.y - 4 + (t.h + 4) * py, s), "#FFF6D0"))
      return out
    }
  }
}
