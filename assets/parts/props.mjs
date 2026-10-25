// Props: things a pet uses, sits on or shows over its head. Each is baked once
// per pet (it is drawn in the pet's own colours) and a clip shows it by name.
// A prop with several frames (a laptop whose keys flicker, a thought bubble
// whose dots go round) is several props swapped on a slow step, so an animated
// prop still costs nothing but the swap.
//
// slot   where it lives in the rig
//   seat   on the ground behind the pet; `front` layers sit over the pet's
//          lower edge (a chair's cushion and armrests). Does not hop.
//   desk   in front of the pet, on its lap; moves with hops, not with squash.
//   hand   held: moves with the body; propRot / propX / propY turn and slide
//          it about `pivot`.
//   over   above or beside the head (emotes, bubbles, signs); moves with hops.
// holds  which of the pet's own paws the prop replaces: "R", "L" or "both"
//        (the prop draws those paws itself, gripping it).
// box    [x, y, w, h] in grid units: the canvas the prop is baked into, for
//        props that reach past the pet's 32×32 box.
import { circle, ellipse, rrect, line, quad, poly, star, sparkle, heart, fill, stroke, outlined, glossy, shine } from "./geometry.mjs"
import { ACCESSORIES } from "./wearables.mjs"

const CHAIR = "#3B4252", CHAIR_HI = "#5B6680"
const ALU = "#D3D8E0", ALU_SH = "#9AA1AD"
const SCREEN = "#1B2230"
const PAPER = "#FFF4DA", PAPER_SH = "#E8D3A6"
const WOOD = "#C98B4E", WOOD_SH = "#8F5A2C"
const GOLD = "#FFC93C", RED = "#E5484D", CYAN = "#3FD8F2", MINT = "#3FE07F"

// A paw gripping something, in the pet's shade colour.
function paw(x, y, rx, ry) { return outlined(ellipse(x, y, rx || 1.6, ry || 1.2), "body", { width: 0.65 }) }

// ---- seat
function chairBack() {
  return [
    glossy(rrect(3.2, 13.4, 25.6, 13.6, 4.2), CHAIR, 8, 14, 16, { width: 0.85 }),
    fill(rrect(5, 14.8, 1.6, 10.4, 0.8), CHAIR_HI),
    fill(rrect(25.4, 14.8, 1.6, 10.4, 0.8), CHAIR_HI),
    outlined(rrect(15.1, 27.8, 1.8, 2.6, 0.3), CHAIR, { width: 0.55 }),
    stroke(line(9.4, 30.5, 22.6, 30.5), "outline", 2), stroke(line(9.4, 30.5, 22.6, 30.5), CHAIR, 1.2),
    outlined(circle(9.8, 31.1, 0.9), CHAIR_HI, { width: 0.45 }), outlined(circle(16, 31.2, 0.9), CHAIR_HI, { width: 0.45 }), outlined(circle(22.2, 31.1, 0.9), CHAIR_HI, { width: 0.45 })
  ]
}
function chairFront() {
  return [
    glossy(rrect(5, 26.4, 22, 2.4, 1.2), CHAIR, 10, 26.4, 12, { width: 0.7 }),
    glossy(rrect(1.6, 21.1, 4.8, 1.8, 0.9), CHAIR_HI, 3, 21.2, 3, { width: 0.6 }),
    glossy(rrect(25.6, 21.1, 4.8, 1.8, 0.9), CHAIR_HI, 27, 21.2, 3, { width: 0.6 })
  ]
}
function hammockBack() {
  return [
    stroke(line(-3, 30.8, -1.6, 14), "outline", 1.8), stroke(line(-3, 30.8, -1.6, 14), WOOD, 1.1),
    stroke(line(35, 30.8, 33.6, 14), "outline", 1.8), stroke(line(35, 30.8, 33.6, 14), WOOD, 1.1),
    stroke(quad(-1.6, 15, 4, 22, 6, 25), "#C9B48A", 0.5), stroke(quad(33.6, 15, 28, 22, 26, 25), "#C9B48A", 0.5)
  ]
}
function hammockFront() {
  const d = "M3 24.6 Q16 33.4 29 24.6 L28.2 27.6 Q16 35 3.8 27.6 Z"
  return [
    glossy(d, "accent", 10, 26, 16, { width: 0.75 }),
    stroke("M5.2 26.6 Q16 33 26.8 26.6", "tint:accent", 0.6),
    stroke("M6.6 27.8 Q16 33.6 25.4 27.8", "tone:accent", 0.45, { opacity: 0.7 })
  ]
}

// ---- desk: the laptop on the lap. keys: which paw is down ("L", "R", null)
function laptop(screen, keys, glowLogo) {
  const out = []
  // lid, facing us
  out.push(glossy(rrect(10.2, 25.6, 11.6, 4.2, 0.9), ALU, 13, 25.8, 9))
  out.push(fill(circle(16, 27.7, 0.85), glowLogo ? "accent" : ALU_SH, glowLogo ? { stroke: "#FFFFFF", width: 0.3 } : {}))
  if (screen === "term") {
    // the lid lit from behind: a green rim, the terminal is on the other side
    out.push(stroke(rrect(10.6, 26, 10.8, 3.4, 0.6), MINT, 0.35, { opacity: 0.9 }))
  }
  out.push(fill("M8.6 29.5 L23.4 29.5 L22.6 30.9 L9.4 30.9 Z", ALU_SH, { stroke: "outline", width: 0.6 }))
  out.push(stroke(line(9.6, 29.9, 22.4, 29.9), "#FFFFFF", 0.3, { opacity: 0.7 }))
  const lift = k => (keys === k ? 0.2 : 1.2)
  out.push(paw(11.6, 29.6 - lift("L"), 1.6, 1.1))
  out.push(paw(20.4, 29.6 - lift("R"), 1.6, 1.1))
  return out
}
// The tiny terminal: a screen on the lap with a prompt and a caret.
function terminal(caretOn, keys) {
  const out = [
    glossy(rrect(9.4, 22.6, 13.2, 7.6, 1.2), "#2A303C", 12, 23, 10),
    fill(rrect(10.4, 23.5, 11.2, 5.6, 0.6), SCREEN),
    stroke(line(11.3, 24.9, 13.8, 24.9), MINT, 0.6), stroke(line(14.6, 24.9, 18.8, 24.9), "#C9D1D9", 0.6, { opacity: 0.8 }),
    stroke(line(11.3, 26.4, 12.4, 26.4), MINT, 0.6), stroke(line(13.2, 26.4, 16.6, 26.4), "#C9D1D9", 0.6, { opacity: 0.8 })
  ]
  if (caretOn) out.push(fill(rrect(11.2, 27.2, 1.1, 1.5, 0.15), MINT))
  out.push(fill("M8.6 29.6 L23.4 29.6 L22.6 30.9 L9.4 30.9 Z", "#2A303C", { stroke: "outline", width: 0.6 }))
  out.push(paw(11.2, 29.6 - (keys === "L" ? 0.3 : 1.1), 1.5, 1.05), paw(20.8, 29.6 - (keys === "R" ? 0.3 : 1.1), 1.5, 1.05))
  return out
}

// ---- hand props (drawn at the right paw unless both paws hold it)
function atHand(b, dx, dy) { return [b.handR[0] + (dx || 0), b.handR[1] + (dy || 0)] }

const PROPS = {
  chair: { slot: "seat", box: [0, 12, 32, 21], back: chairBack, front: chairFront },
  hammock: { slot: "seat", box: [-5, 12, 42, 23], back: hammockBack, front: hammockFront },

  laptop: { slot: "desk", holds: "both", draw: () => laptop("dark", null, false) },
  laptopKeysL: { slot: "desk", holds: "both", draw: () => laptop("dark", "L", true) },
  laptopKeysR: { slot: "desk", holds: "both", draw: () => laptop("dark", "R", true) },
  terminalOn: { slot: "desk", holds: "both", draw: () => terminal(true, "L") },
  terminalOff: { slot: "desk", holds: "both", draw: () => terminal(false, "R") },

  magnifier: {
    slot: "hand", holds: "R", pivot: "handR", box: [8, 8, 30, 26],
    draw: (b) => {
      const [x, y] = atHand(b, 0.4, -0.6)
      return [
        stroke(line(x, y, x + 2.4, y - 3.4), "outline", 1.9), stroke(line(x, y, x + 2.4, y - 3.4), WOOD, 1.1),
        fill(circle(x + 3.6, y - 5.4, 2.4), CYAN, { opacity: 0.35 }),
        stroke(circle(x + 3.6, y - 5.4, 2.4), "outline", 1.5), stroke(circle(x + 3.6, y - 5.4, 2.4), GOLD, 0.8),
        stroke(quad(x + 2.3, y - 6.2, x + 2.6, y - 7.1, x + 3.5, y - 7.3), "#FFFFFF", 0.5),
        paw(x, y + 0.2)
      ]
    }
  },
  scroll: {
    slot: "hand", holds: "both", box: [2, 14, 28, 18],
    draw: (b) => [
      fill(rrect(10, 21.4, 12, 6.8, 0.4), PAPER, { stroke: "outline", width: 0.6 }),
      stroke(line(11.4, 23, 20.6, 23), PAPER_SH, 0.5), stroke(line(11.4, 24.4, 19, 24.4), PAPER_SH, 0.5), stroke(line(11.4, 25.8, 20, 25.8), PAPER_SH, 0.5),
      glossy(rrect(8.6, 20.6, 2.2, 8.4, 1.1), WOOD, 9, 21, 3), glossy(rrect(21.2, 20.6, 2.2, 8.4, 1.1), WOOD, 21.6, 21, 3),
      paw(9.8, 24.6, 1.5, 1.2), paw(22.2, 24.6, 1.5, 1.2)
    ]
  },
  // Mochi's signature: a scroll so long it unrolls off along the bar.
  giantScroll: {
    slot: "hand", holds: "both", box: [2, 12, 60, 20],
    draw: (b) => {
      const out = [fill("M20 22 L58 22 Q60 22 60 24 L60 28 Q60 30 58 30 L20 30 Z", PAPER, { stroke: "outline", width: 0.6 })]
      for (let x = 24; x < 57; x += 4.4) out.push(stroke(line(x, 24.2, x + 3, 24.2), PAPER_SH, 0.5), stroke(line(x, 26, x + 2.2, 26), PAPER_SH, 0.5), stroke(line(x + 0.6, 27.8, x + 3.2, 27.8), PAPER_SH, 0.5))
      out.push(glossy(ellipse(59.4, 26, 1.4, 4.4), PAPER_SH, 59, 23.5, 3))
      out.push(glossy(rrect(8.4, 19.6, 13.2, 7.6, 3.8), PAPER, 12, 20, 8))
      out.push(glossy(rrect(7.8, 19.2, 2.2, 8.4, 1.1), WOOD, 8.2, 19.6, 3), glossy(rrect(20.2, 19.2, 2.2, 8.4, 1.1), WOOD, 20.6, 19.6, 3))
      out.push(paw(9, 23.6, 1.5, 1.2), paw(21.2, 23.6, 1.5, 1.2))
      return out
    }
  },
  binoculars: {
    slot: "hand", holds: "both", box: [4, 12, 24, 16],
    draw: (b) => [
      glossy(rrect(10.2, b.eyeY - 1.6, 4.6, 4.2, 1.6), "#2B2E31", 11, b.eyeY - 1.4, 4),
      glossy(rrect(17.2, b.eyeY - 1.6, 4.6, 4.2, 1.6), "#2B2E31", 18, b.eyeY - 1.4, 4),
      fill(rrect(14.6, b.eyeY - 0.4, 2.8, 1.6, 0.5), "#2B2E31", { stroke: "outline", width: 0.5 }),
      fill(circle(12.5, b.eyeY + 0.5, 1.2), CYAN, { opacity: 0.8 }), fill(circle(19.5, b.eyeY + 0.5, 1.2), CYAN, { opacity: 0.8 }),
      shine(12, b.eyeY, 0.45, 0.3), shine(19, b.eyeY, 0.45, 0.3),
      paw(10, b.eyeY + 2.8, 1.4, 1.1), paw(22, b.eyeY + 2.8, 1.4, 1.1)
    ]
  },
  wrench: {
    slot: "hand", holds: "R", pivot: "handR", box: [8, 8, 30, 26],
    draw: (b) => {
      const [x, y] = atHand(b, 0.2, -0.4)
      const d = `M${x - 0.5} ${y + 0.4} L${x + 3} ${y - 4} L${x + 2.4} ${y - 5.4} Q${x + 3} ${y - 7} ${x + 4.6} ${y - 6.8} L${x + 3.8} ${y - 5.6} L${x + 4.4} ${y - 4.8} L${x + 5.6} ${y - 5.4} Q${x + 5.8} ${y - 3.8} ${x + 4.2} ${y - 3.2} L${x + 0.6} ${y + 1.2} Z`
      return [glossy(d, "#B8C2CF", x + 2, y - 5, 5), paw(x, y + 0.3)]
    }
  },
  box: {
    slot: "hand", holds: "both", box: [4, 14, 24, 18],
    draw: () => [
      glossy(rrect(11.6, 20.6, 8.8, 6.6, 0.8), "#D9A066", 13, 21, 7),
      stroke(line(16, 20.6, 16, 27.2), "#A86B33", 0.7), stroke(line(11.6, 22.8, 20.4, 22.8), "#A86B33", 0.5),
      paw(11.4, 25, 1.5, 1.2), paw(20.6, 25, 1.5, 1.2)
    ]
  },
  mug: {
    slot: "hand", holds: "R", pivot: "handR", box: [10, 12, 26, 20],
    draw: (b) => {
      const [x, y] = atHand(b, -1.2, -1.4)
      return [
        stroke(`M${x + 2} ${y - 1.6} q1.6 0 1.6 1.4 q0 1.4 -1.6 1.4`, "outline", 1.3), stroke(`M${x + 2} ${y - 1.6} q1.6 0 1.6 1.4 q0 1.4 -1.6 1.4`, "#FFFFFF", 0.6),
        glossy(rrect(x - 1.8, y - 2.6, 3.8, 4.4, 0.8), "#FFFFFF", x - 1, y - 2.2, 4),
        fill(rrect(x - 1.3, y - 1.2, 2.8, 1.3, 0.4), "accent"),
        stroke(`M${x - 0.6} ${y - 3.4} q-0.6 -0.8 0 -1.6 q0.6 -0.8 0 -1.6 M${x + 0.9} ${y - 3.4} q-0.6 -0.8 0 -1.6`, "ink", 0.45, { opacity: 0.6 }),
        paw(x - 0.6, y + 1.4, 1.5, 1.1)
      ]
    }
  },
  // Held up beside the head, facing you, so the face stays visible.
  signQ: {
    slot: "hand", holds: "R", pivot: "handR", box: [12, -4, 26, 36],
    draw: (b) => {
      const [hx, hy] = b.handR
      const px = hx + 1.6
      return [
        stroke(line(px, 11, px, hy + 0.6), "outline", 1.8), stroke(line(px, 11, px, hy + 0.6), WOOD, 1.1),
        glossy(rrect(px - 6, 0.4, 12, 10.6, 1.4), PAPER, px - 3, 1, 10),
        stroke(`M${px - 2.2} 3.8 Q${px - 2.2} 1.8 ${px} 1.8 Q${px + 2.2} 1.8 ${px + 2.2} 3.8 Q${px + 2.2} 5.2 ${px + 0.2} 5.8 L${px + 0.2} 7.2`, RED, 1.3),
        fill(circle(px + 0.2, 8.9, 0.8), RED),
        paw(px - 0.6, hy - 2.6, 1.4, 1.15)
      ]
    }
  },
  mic: {
    slot: "hand", holds: "R", pivot: "handR", box: [8, 6, 28, 26],
    draw: (b) => {
      const [x, y] = atHand(b, 0, -0.8)
      return [
        stroke(line(x, y, x + 1.4, y - 3.8), "outline", 1.9), stroke(line(x, y, x + 1.4, y - 3.8), "#2B2E31", 1.1),
        glossy(circle(x + 1.8, y - 5, 1.7), "#B8C2CF", x + 1.2, y - 5.6, 2),
        stroke(line(x + 0.4, y - 5.4, x + 3.2, y - 4.6), "#7F8896", 0.35), stroke(line(x + 0.6, y - 4.4, x + 3, y - 5.8), "#7F8896", 0.35),
        paw(x, y + 0.2)
      ]
    }
  },
  confettiCannon: {
    slot: "hand", holds: "both", box: [4, 4, 30, 28],
    draw: (b) => [
      glossy(`M11 26 L22.6 12.4 L26 15.6 L14.6 28.4 Z`, "#7A5CFF", 18, 16, 8),
      stroke(line(12.8, 25.6, 23.6, 13.6), "#FFFFFF", 0.4, { opacity: 0.6 }),
      fill(ellipse(24.3, 14, 2.2, 1.2), "#2B2E31", { stroke: "outline", width: 0.5 }),
      fill(rrect(15, 21, 2.6, 1, 0.4), GOLD), fill(rrect(18, 17.6, 2.6, 1, 0.4), GOLD),
      paw(12.6, 26.4, 1.5, 1.2), paw(17, 21.6, 1.5, 1.2)
    ]
  },
  broom: {
    slot: "hand", holds: "both", pivot: "handR", box: [0, 6, 32, 26],
    draw: (b) => [
      stroke(line(21, 9, 9, 29), "outline", 1.8), stroke(line(21, 9, 9, 29), WOOD, 1.1),
      glossy("M6.6 27.4 L11.8 30.6 L9.8 32 Q6 32 4.2 30.4 Z", "#E8C35A", 7, 28, 4),
      stroke(line(6.4, 29.6, 8.6, 31.4), "#B8912F", 0.4), stroke(line(7.6, 28.6, 10, 30.6), "#B8912F", 0.4),
      paw(17.4, 15.4, 1.5, 1.15), paw(13.8, 21.2, 1.5, 1.15)
    ]
  },
  pompoms: {
    slot: "hand", holds: "both", box: [-4, 10, 40, 22],
    draw: (b) => {
      const pom = (x, y, c) => {
        const out = []
        for (let i = 0; i < 7; i++) {
          const a = i * Math.PI * 2 / 7
          out.push(fill(ellipse(x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6, 1.3, 1.3), c, { stroke: "outline", width: 0.35 }))
        }
        return [...out, fill(circle(x, y, 1.4), c)]
      }
      return [...pom(b.handL[0] - 1.4, b.handL[1] - 3.4, "accent"), ...pom(b.handR[0] + 1.4, b.handR[1] - 3.4, "#FFFFFF")]
    }
  },
  ball: {
    slot: "hand", holds: "R", pivot: "handR", box: [12, 10, 26, 22],
    draw: (b) => {
      const [x, y] = atHand(b, 1.2, -2.6)
      return [glossy(circle(x, y, 2.3), "#FF7A59", x - 0.8, y - 0.8, 3), stroke(`M${x - 2.2} ${y} Q${x} ${y - 0.9} ${x + 2.2} ${y}`, "#FFFFFF", 0.5), stroke(`M${x} ${y - 2.2} Q${x + 0.9} ${y} ${x} ${y + 2.2}`, "#FFFFFF", 0.5), paw(x - 1.4, y + 2.2)]
    }
  },
  blanket: {
    slot: "desk", holds: "both", box: [-4, 18, 40, 15],
    draw: () => [
      glossy("M-2 24.6 Q16 19.4 34 24.6 L34 31.6 L-2 31.6 Z", "#9DB8F2", 6, 22, 24),
      stroke("M-1 25.6 Q16 20.6 33 25.6", "#C7D6FA", 0.9),
      stroke(line(-1.6, 27.8, 33.6, 27.8), "#7F9BDB", 0.8, { opacity: 0.6 }), stroke(line(-1.6, 29.8, 33.6, 29.8), "#7F9BDB", 0.8, { opacity: 0.6 })
    ]
  },
  pillow: {
    slot: "seat", box: [0, 20, 32, 13], back: () => [glossy(rrect(5, 25.4, 22, 5.6, 2.6), "#F6F3FF", 10, 25.6, 14), stroke(line(9, 28.2, 23, 28.2), "#D8D2EE", 0.6)], front: () => []
  },
  // Jinx's shades, down over the eyes for the strut.
  shadesDown: {
    slot: "hand", holds: "", box: [4, 12, 24, 14],
    draw: (b) => {
      const sy = b.eyeY - 0.4
      const lens = (cx) => `M${cx - 2.6} ${sy - 1.2} L${cx + 2.6} ${sy - 1.2} Q${cx + 2.5} ${sy + 1.9} ${cx} ${sy + 1.9} Q${cx - 2.5} ${sy + 1.9} ${cx - 2.6} ${sy - 1.2} Z`
      const mirror = { radial: [12, sy - 1, 7], stops: [[0, "#FFE36E"], [0.5, "#FF4FA3"], [1, "#6A3CFF"]] }
      return [
        fill(lens(16 - b.eyeDX), "#FF4FA3", { stroke: "#F4F4F0", width: 0.6, gradient: mirror }),
        fill(lens(16 + b.eyeDX), "#FF4FA3", { stroke: "#F4F4F0", width: 0.6, gradient: mirror }),
        stroke(line(16 - b.eyeDX + 2.6, sy - 0.9, 16 + b.eyeDX - 2.6, sy - 0.9), "#F4F4F0", 0.6),
        stroke(line(16 - b.eyeDX - 1, sy - 0.6, 16 - b.eyeDX + 0.3, sy + 1), "#FFFFFF", 0.5)
      ]
    }
  },
  tools: {
    slot: "hand", holds: "both", box: [2, 12, 28, 20],
    draw: () => [
      glossy(rrect(10.2, 21.4, 11.6, 6, 0.8), RED, 12, 21.6, 9),
      stroke("M13 21.4 L13 19.8 Q13 19 13.8 19 L18.2 19 Q19 19 19 19.8 L19 21.4", "outline", 1.4), stroke("M13 21.4 L13 19.8 Q13 19 13.8 19 L18.2 19 Q19 19 19 19.8 L19 21.4", "#B8C2CF", 0.7),
      stroke(line(10.2, 23.6, 21.8, 23.6), "#B23A3E", 0.5),
      paw(10.2, 25, 1.5, 1.2), paw(21.8, 25, 1.5, 1.2)
    ]
  },
  dish: {
    slot: "over", box: [16, -6, 20, 20],
    draw: () => [
      stroke(line(24, 12, 27, 8), "outline", 1.3), stroke(line(24, 12, 27, 8), "#B8C2CF", 0.6),
      glossy("M23 4 A5 5 0 0 0 31 10 Z", "#D3D8E0", 25, 5, 5),
      fill(circle(27.2, 7.2, 0.6), RED)
    ]
  },

  yoyo: {
    slot: "hand", holds: "R", pivot: "handR", box: [12, 10, 26, 24],
    draw: (b) => {
      const [x, y] = atHand(b, 0.6, 0)
      return [stroke(line(x, y, x, y + 4.6), "ink", 0.35), glossy(circle(x, y + 5.6, 1.3), RED, x - 0.4, y + 5.2, 1.6, { width: 0.5 }), stroke(line(x - 1.2, y + 5.6, x + 1.2, y + 5.6), "#FFFFFF", 0.35), paw(x, y)]
    }
  },
  handheld: {
    slot: "hand", holds: "both", box: [4, 14, 24, 18],
    draw: () => [
      glossy(rrect(10.6, 21, 10.8, 6.4, 1.6), "#7A5CFF", 13, 21.4, 8),
      fill(rrect(13.6, 21.8, 4.8, 3.6, 0.4), "#B8F5BE", { stroke: "outline", width: 0.4 }),
      fill(rrect(14.4, 23, 1, 1, 0.1), "#2B2E31"), fill(rrect(16.6, 22.6, 1, 1, 0.1), "#2B2E31"),
      fill(circle(12.2, 24.2, 0.55), "#2B2E31"), fill(circle(19.8, 23.6, 0.5), RED), fill(circle(20.4, 24.8, 0.5), GOLD),
      paw(10.6, 25.4, 1.4, 1.1), paw(21.4, 25.4, 1.4, 1.1)
    ]
  },
  doodlePad: {
    slot: "hand", holds: "both", box: [4, 14, 24, 18],
    draw: () => [
      fill(rrect(10, 20.4, 10.4, 7.6, 0.5), "#FFFFFF", { stroke: "outline", width: 0.6 }),
      stroke("M11.6 25.4 Q13 22.4 14.4 25 Q15.8 27 17.2 23.4", "accent", 0.55),
      fill(circle(17.8, 23, 0.7), RED),
      stroke(line(20.8, 26.4, 23.8, 21.6), "outline", 1.3), stroke(line(20.8, 26.4, 23.8, 21.6), GOLD, 0.7),
      paw(10.4, 26.2, 1.4, 1.1), paw(21.2, 26, 1.4, 1.1)
    ]
  },
  cloth: {
    slot: "hand", holds: "R", pivot: "handR", box: [8, 8, 28, 26],
    draw: (b) => {
      const [x, y] = atHand(b, -1, -3)
      return [fill(`M${x - 2} ${y - 1} Q${x} ${y - 2.2} ${x + 2} ${y - 0.8} L${x + 1.4} ${y + 1.8} Q${x} ${y + 1} ${x - 1.6} ${y + 1.6} Z`, "#8FD3F4", { stroke: "outline", width: 0.45 }), paw(x, y + 0.6)]
    }
  },
  plane: {
    slot: "hand", holds: "R", pivot: "handR", box: [10, 6, 28, 24],
    draw: (b) => {
      const [x, y] = atHand(b, 0.4, -2.6)
      return [fill(`M${x - 2.6} ${y + 0.4} L${x + 3.6} ${y - 1.6} L${x - 0.6} ${y + 2} Z`, "#FFFFFF", { stroke: "outline", width: 0.45 }), stroke(line(x - 0.6, y + 2, x + 0.2, y + 0.4), "#C9D1D9", 0.4), paw(x - 1, y + 2.2)]
    }
  },
  fan: {
    slot: "hand", holds: "R", pivot: "handR", box: [10, 6, 28, 26],
    draw: (b) => {
      const [x, y] = atHand(b, 0.2, -0.6)
      return [stroke(line(x, y, x + 0.8, y - 2.4), "outline", 1.3), stroke(line(x, y, x + 0.8, y - 2.4), WOOD, 0.6),
              glossy(`M${x + 0.8} ${y - 2.4} L${x - 2} ${y - 6.6} Q${x + 1.4} ${y - 8} ${x + 4.6} ${y - 5.8} Z`, "#FF8FC0", x + 0.6, y - 6, 4), paw(x, y + 0.2)]
    }
  },
  headphonesOn: { slot: "hand", holds: "", box: [-2, 2, 36, 30], draw: (b) => ACCESSORIES.headphones.draw(b) },
  nightcapOn: { slot: "hand", holds: "", box: [0, -4, 36, 30], draw: (b) => ACCESSORIES.nightcap.draw(b) },
  clock: {
    slot: "over", box: [16, -6, 20, 20],
    draw: () => [glossy(circle(26.5, 4.6, 3.6), "#FFFFFF", 25.4, 3.4, 4), stroke(line(26.5, 4.6, 26.5, 2.2), "outline", 0.6), stroke(line(26.5, 4.6, 28.2, 5.4), "outline", 0.6), fill(circle(26.5, 4.6, 0.4), RED)]
  },
  juggle: {
    slot: "over", box: [4, -6, 24, 22],
    draw: (b) => [glossy(circle(12, 6, 1.4), RED, 11.6, 5.6, 1.6, { width: 0.45 }), glossy(circle(16, 2.6, 1.4), "#3FD8F2", 15.6, 2.2, 1.6, { width: 0.45 }), glossy(circle(20, 6, 1.4), GOLD, 19.6, 5.6, 1.6, { width: 0.45 })]
  },

  // tug-of-war: the left pet's rope runs across to its friend (40 apart)
  rope: {
    slot: "hand", holds: "both", box: [4, 14, 66, 18],
    draw: (b) => {
      const [x, y] = atHand(b, 0, -1.2)
      return [stroke(`M${b.handL[0] + 1} ${y + 0.4} L${x + 44} ${y}`, "outline", 1.6), stroke(`M${b.handL[0] + 1} ${y + 0.4} L${x + 44} ${y}`, "#C9A66B", 0.9),
              fill(rrect(x + 20, y - 0.9, 1.6, 1.8, 0.4), RED), paw(b.handL[0] + 1.6, y + 0.4), paw(x, y)]
    }
  },
  ropeEnd: {
    slot: "hand", holds: "both", box: [-4, 14, 24, 18],
    draw: (b) => {
      const y = b.handR[1] - 1.2
      return [stroke(`M-4 ${y} L${b.handR[0]} ${y}`, "outline", 1.6), stroke(`M-4 ${y} L${b.handR[0]} ${y}`, "#C9A66B", 0.9), paw(b.handL[0] + 1, y), paw(b.handR[0] - 1, y)]
    }
  },
  // drifting down when its window moved away: a striped canopy, paws on the lines
  parachute: {
    slot: "hand", holds: "both", box: [-6, -15, 44, 47],
    draw: (b) => {
      const canopy = "M-3 -2 Q16 -19 35 -2 Q31.2 -4.2 27.4 -2 Q23.6 -4.4 19.8 -2 Q16 -4.6 12.2 -2 Q8.4 -4.4 4.6 -2 Q0.8 -4.2 -3 -2 Z"
      const lx = 6.6, rx = 25.4, py = 13.2
      const lines = [[-3, -2, lx, py], [8.4, -3.2, lx, py], [23.6, -3.2, rx, py], [35, -2, rx, py], [16, -3.4, lx + 0.6, py], [16, -3.4, rx - 0.6, py]]
      const out = lines.map(([x1, y1, x2, y2]) => stroke(line(x1, y1, x2, y2), "#9AA1AD", 0.35))
      out.push(glossy(canopy, RED, 9, -10, 14, { width: 0.7 }))
      out.push(fill("M12.2 -2 Q12.6 -11 16 -13.4 Q19.4 -11 19.8 -2 Q16 -4.6 12.2 -2 Z", PAPER))
      out.push(fill("M-0.4 -4.4 Q2 -9.6 6.4 -12 Q5 -7.4 4.6 -2 Q1.6 -3.8 -0.4 -4.4 Z", PAPER), fill("M32.4 -4.4 Q30 -9.6 25.6 -12 Q27 -7.4 27.4 -2 Q30.4 -3.8 32.4 -4.4 Z", PAPER))
      out.push(stroke(canopy, "outline", 0.7))
      out.push(paw(lx, py + 0.4, 1.5, 1.2), paw(rx, py + 0.4, 1.5, 1.2))
      return out
    }
  },
  baton: {
    slot: "hand", holds: "R", pivot: "handR", box: [12, 10, 26, 22],
    draw: (b) => {
      const [x, y] = atHand(b, 0.4, -1)
      return [glossy(rrect(x - 0.9, y - 4.6, 1.8, 6, 0.9), GOLD, x - 0.4, y - 4, 3), stroke(line(x - 0.9, y - 2.6, x + 0.9, y - 2.6), RED, 0.6), paw(x, y + 0.6)]
    }
  },

  // ---- over the head: emotes and bubbles (frames swapped on a slow step)
  bang: { slot: "over", box: [18, -6, 16, 22], draw: () => [glossy(rrect(25.2, 0.6, 2.6, 8, 1.3), GOLD, 25.6, 1, 4), glossy(circle(26.5, 11.4, 1.4), GOLD, 26, 10.8, 2)] },
  question: {
    slot: "over", box: [18, -6, 16, 22],
    draw: () => [
      stroke("M23.8 4.2 Q23.8 1.2 26.6 1.2 Q29.4 1.2 29.4 4 Q29.4 6 27 6.8 L27 8.6", "outline", 2.4),
      stroke("M23.8 4.2 Q23.8 1.2 26.6 1.2 Q29.4 1.2 29.4 4 Q29.4 6 27 6.8 L27 8.6", CYAN, 1.4),
      glossy(circle(27, 11, 1.1), CYAN, 26.6, 10.6, 1.4)
    ]
  },
  thought1: { slot: "over", box: [14, -6, 22, 24], draw: () => thought(0) },
  thought2: { slot: "over", box: [14, -6, 22, 24], draw: () => thought(1) },
  thought3: { slot: "over", box: [14, -6, 22, 24], draw: () => thought(2) },
  zzz1: { slot: "over", box: [16, -6, 20, 22], draw: () => zzz(0) },
  zzz2: { slot: "over", box: [16, -6, 20, 22], draw: () => zzz(1) },
  zzz3: { slot: "over", box: [16, -6, 20, 22], draw: () => zzz(2) },
  dizzy1: { slot: "over", box: [4, -2, 24, 16], draw: (b) => dizzy(b, 0) },
  dizzy2: { slot: "over", box: [4, -2, 24, 16], draw: (b) => dizzy(b, 1) },
  radar1: { slot: "over", box: [6, -6, 22, 18], draw: (b) => radar(b, 1) },
  radar2: { slot: "over", box: [6, -6, 22, 18], draw: (b) => radar(b, 2) },
  radar3: { slot: "over", box: [6, -6, 22, 18], draw: (b) => radar(b, 3) },
  batteryEmpty: { slot: "over", box: [18, -4, 16, 18], draw: () => battery(0) },
  batteryFull: { slot: "over", box: [18, -4, 16, 18], draw: () => battery(1) },
  heartBubble: { slot: "over", box: [18, -6, 16, 18], draw: () => [glossy(heart(26.5, 5, 2.4), "#FF5C8A", 25.5, 3.6, 3, { width: 0.6 })] },
  noteBubble: { slot: "over", box: [18, -6, 16, 18], draw: () => note(26, 6, "accent") },
  steam: { slot: "over", box: [6, -6, 22, 18], draw: (b) => [stroke(`M12 ${b.top[1] - 1} q-1 -1.4 0 -2.8 q1 -1.4 0 -2.8 M16 ${b.top[1] - 1.6} q-1 -1.4 0 -2.8 q1 -1.4 0 -2.8 M20 ${b.top[1] - 1} q-1 -1.4 0 -2.8 q1 -1.4 0 -2.8`, "#FFFFFF", 0.9, { opacity: 0.85 })] },
  idea: {
    slot: "over", box: [18, -6, 16, 20],
    draw: () => [glossy(circle(26.5, 4, 2.6), "#FFE36E", 25.6, 3, 3), fill(rrect(25.3, 6.4, 2.4, 1.8, 0.5), "#B8C2CF", { stroke: "outline", width: 0.5 }), stroke(line(30, 1, 31.2, 0), GOLD, 0.6), stroke(line(23, 1, 21.8, 0), GOLD, 0.6)]
  },
  sparkleCrown: {
    slot: "over", box: [4, -6, 24, 14],
    draw: (b) => {
      const [x, y] = b.top
      return [fill(star(x - 4, y - 3, 1.2, 0.5), GOLD), fill(star(x + 4.4, y - 2.4, 0.9, 0.4), GOLD), fill(star(x + 0.4, y - 5, 1.4, 0.6), "#FFF2B0", { stroke: "outline", width: 0.3 })]
    }
  }
}

function thought(phase) {
  const out = [
    glossy("M19.6 9.4 Q18 9.4 18 7.6 Q18 5.6 20.2 5.6 Q20.6 2.6 23.8 2.6 Q26 1 28.4 2.6 Q31.6 2.6 31.6 5.6 Q33.2 7.6 31 9.4 Z", "#FFFFFF", 22, 3.6, 10),
    fill(circle(18.6, 11.6, 0.95), "#FFFFFF", { stroke: "outline", width: 0.5 }),
    fill(circle(17.4, 13.6, 0.6), "#FFFFFF", { stroke: "outline", width: 0.45 })
  ]
  const dots = [[22, 6.4], [24.9, 5.6], [27.8, 6.4]]
  dots.forEach(([x, y], i) => out.push(fill(circle(x, y - (i === phase ? 0.6 : 0), i === phase ? 0.85 : 0.6), "#3B4252", { opacity: i === phase ? 1 : 0.5 })))
  return out
}
function zzz(phase) {
  const z = (x, y, s, o) => stroke(`M${x} ${y} l${s} 0 l${-s} ${s} l${s} 0`, "ink", 0.55 + s * 0.08, { opacity: o })
  return [z(20, 9 - phase * 0.4, 1.6, 0.5 + phase * 0.15), z(23.4, 5.4 - phase * 0.4, 2.2, phase >= 1 ? 0.9 : 0.35), z(27.2, 1 - phase * 0.4, 2.8, phase >= 2 ? 1 : 0.25)]
}
function dizzy(b, phase) {
  const [x, y] = b.top, out = [stroke(ellipse(x, y - 1.4, 6.6, 1.6), "ink", 0.35, { opacity: 0.4 })]
  for (let i = 0; i < 3; i++) {
    const a = (i / 3 + phase / 6) * Math.PI * 2
    out.push(fill(star(x + Math.cos(a) * 6.4, y - 1.4 + Math.sin(a) * 1.5, 1.1, 0.45), GOLD, { stroke: "outline", width: 0.3 }))
  }
  return out
}
function radar(b, rings) {
  const [x, y] = b.top, out = []
  for (let i = 1; i <= rings; i++) out.push(stroke(`M${x - 2.2 * i} ${y - 3 - 1.2 * i} Q${x} ${y - 4.4 - 2.4 * i} ${x + 2.2 * i} ${y - 3 - 1.2 * i}`, CYAN, 0.7, { opacity: 1.1 - i * 0.25 }))
  return out
}
function battery(full) {
  return [
    fill(rrect(21.6, 2, 9.6, 5.4, 1), "#2B2E31", { stroke: "outline", width: 0.6 }),
    fill(rrect(31.2, 3.6, 1, 2.2, 0.3), "#2B2E31"),
    full ? fill(rrect(22.6, 3, 7.6, 3.4, 0.5), MINT) : fill(rrect(22.6, 3, 1.6, 3.4, 0.5), RED),
    ...(full ? [stroke("M26.8 3.1 L25.6 4.9 L27 4.9 L25.8 6.4", "#FFFFFF", 0.5)] : [])
  ]
}
export function note(x, y, color) {
  return [
    glossy(ellipse(x, y + 2.6, 1.5, 1.1), color, x - 0.6, y + 2, 1.8, { width: 0.5 }),
    stroke(`M${x + 1.3} ${y + 2.4} L${x + 1.3} ${y - 2.4} Q${x + 3} ${y - 1.6} ${x + 3.2} ${y}`, "outline", 1.3),
    stroke(`M${x + 1.3} ${y + 2.4} L${x + 1.3} ${y - 2.4} Q${x + 3} ${y - 1.6} ${x + 3.2} ${y}`, color, 0.6)
  ]
}

export { PROPS }
export const PROP_NAMES = Object.keys(PROPS)
