// Social clips (§4.4 E): the pieces scenes are made of (core/social.mjs puts
// them in order and moves the pets along the bar). Facing is part of each
// clip ("…Left" faces left), so a scene only has to pick a side.
const bob = (period, depth) => {
  const out = [[0, 1]]
  for (let t = period / 2; t <= period; t += period / 2) out.push([t, out.length % 2 ? depth : 1, "step"])
  return out
}

export default {
  walkRight: {
    loop: true, step: 125, duration: 500,
    tracks: { dir: [[0, 1]], sy: bob(500, 0.95), rot: [[0, -3], [250, 3, "step"]], armL: [[0, 25], [250, -10, "step"]], armR: [[0, -10], [250, 25, "step"]] },
    pose: { dir: 1 }
  },
  walkLeft: {
    loop: true, step: 125, duration: 500,
    tracks: { dir: [[0, -1]], sy: bob(500, 0.95), rot: [[0, 3], [250, -3, "step"]], armL: [[0, 25], [250, -10, "step"]], armR: [[0, -10], [250, 25, "step"]] },
    pose: { dir: -1 }
  },
  runRight: {
    loop: true, step: 83, duration: 332,
    tracks: { dir: [[0, 1]], sy: [[0, 1.04], [166, 0.92, "step"]], rot: [[0, 8]], armL: [[0, 60], [166, -20, "step"]], armR: [[0, -20], [166, 60, "step"]], y: [[0, 0], [83, -1.5, "step"], [166, 0, "step"], [249, -1.5, "step"]] },
    set: [[0, { eyes: "squint", mouth: "grin" }]],
    fx: [[0, { kind: "dust", n: 1, at: "feet", spread: [1, 0.3], v: [-8, -2], life: 400, grow: 0.5, mirror: true }]],
    pose: { dir: 1, rot: 8 }
  },
  runLeft: {
    loop: true, step: 83, duration: 332,
    tracks: { dir: [[0, -1]], sy: [[0, 1.04], [166, 0.92, "step"]], rot: [[0, -8]], armL: [[0, 60], [166, -20, "step"]], armR: [[0, -20], [166, 60, "step"]], y: [[0, 0], [83, -1.5, "step"], [166, 0, "step"], [249, -1.5, "step"]] },
    set: [[0, { eyes: "squint", mouth: "grin" }]],
    fx: [[0, { kind: "dust", n: 1, at: "feet", spread: [1, 0.3], v: [-8, -2], life: 400, grow: 0.5, mirror: true }]],
    pose: { dir: -1, rot: -8 }
  },
  // high-five / fist-bump: the left pet faces right, the right one faces left
  highFiveLeft: {
    duration: 1300,
    tracks: { dir: [[0, 1]], armR: [[0, 0], [250, 150, "outBack"], [420, 120, "outQuad"], [900, 120], [1200, 0]], y: [[300, 0], [420, -2, "outQuad"], [600, 0, "inQuad"]], sy: [[380, 1], [430, 0.9], [650, 1, "outBack"]] },
    set: [[0, { eyes: "open", mouth: "grin" }], [420, { eyes: "happy" }], [1200, { eyes: "open", mouth: "base" }]],
    fx: [[420, { kind: "sparkle", n: 3, at: [30, 12], spread: [2, 2], v: [0, -6], vspread: [6, 4], life: 600, spin: 200 }]],
    pose: { dir: 1, armR: 140, eyes: "happy" }
  },
  highFiveRight: {
    duration: 1300,
    tracks: { dir: [[0, -1]], armR: [[0, 0], [250, 150, "outBack"], [420, 120, "outQuad"], [900, 120], [1200, 0]], y: [[300, 0], [420, -2, "outQuad"], [600, 0, "inQuad"]], sy: [[380, 1], [430, 0.9], [650, 1, "outBack"]] },
    set: [[0, { eyes: "open", mouth: "grin" }], [420, { eyes: "happy" }], [1200, { eyes: "open", mouth: "base" }]],
    pose: { dir: -1, armR: 140, eyes: "happy" }
  },
  cheer: {
    duration: 2800,
    use: [[0, "hopSmall"], [700, "hopSmall"], [1400, "hopSmall"], [2100, "hopSmall"]],
    tracks: { armL: [[0, 40], [350, 140, "step"], [700, 40, "step"], [1050, 140, "step"], [1400, 40, "step"], [1750, 140, "step"], [2100, 40, "step"], [2450, 140, "step"], [2800, 0, "step"]] },
    set: [[0, { hand: "pompoms", eyes: "happy", mouth: "grin" }], [2700, { hand: "", eyes: "open", mouth: "base" }]],
    pose: { hand: "pompoms", eyes: "happy" }
  },
  // attention routing: turn to the pet that needs you and point at it
  pointRight: {
    loop: true, step: 250, duration: 2000,
    tracks: { dir: [[0, 1]], armR: [[0, 95], [1000, 105, "step"]], gazeX: [[0, 1.2]], rot: [[0, 4]] },
    set: [[0, { eyes: "wide", mouth: "o" }]],
    pose: { dir: 1, armR: 100, eyes: "wide" }
  },
  pointLeft: {
    loop: true, step: 250, duration: 2000,
    tracks: { dir: [[0, -1]], armR: [[0, 95], [1000, 105, "step"]], gazeX: [[0, -1.2]], rot: [[0, -4]] },
    set: [[0, { eyes: "wide", mouth: "o" }]],
    pose: { dir: -1, armR: 100, eyes: "wide" }
  },
  startled: {
    duration: 900,
    use: [[0, "hopSmall"]],
    set: [[0, { eyes: "wide", mouth: "o", over: "bang" }], [700, { over: "" }], [800, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "wide", over: "bang" }
  },
  tapRight: {
    duration: 600,
    tracks: { dir: [[0, 1]], armR: [[0, 0], [150, 70, "outQuad"], [300, 20], [450, 70], [600, 0]], rot: [[0, 0], [150, 6], [450, 6], [600, 0]] },
    set: [[0, { eyes: "squint", mouth: "smirk" }]],
    pose: { dir: 1, armR: 70 }
  },
  tapLeft: {
    duration: 600,
    tracks: { dir: [[0, -1]], armR: [[0, 0], [150, 70, "outQuad"], [300, 20], [450, 70], [600, 0]], rot: [[0, 0], [150, -6], [450, -6], [600, 0]] },
    set: [[0, { eyes: "squint", mouth: "smirk" }]],
    pose: { dir: -1, armR: 70 }
  },
  // leapfrog: the leaper's own hop, high; the scene slides it over the friend
  leap: {
    duration: 900,
    tracks: {
      y: [[0, 0], [120, 0], [450, -16, "outQuad"], [780, 0, "inQuad"]],
      sy: [[0, 1], [120, 0.8, "outQuad"], [250, 1.12], [700, 1], [780, 0.84], [900, 1, "outBack"]],
      sx: [[0, 1], [120, 1.14], [250, 0.92], [700, 1], [780, 1.12], [900, 1, "outBack"]],
      armL: [[120, 0], [450, 140], [780, 0]], armR: [[120, 0], [450, 140], [780, 0]], shadow: [[120, 1], [450, 0.4], [780, 1]]
    },
    set: [[0, { eyes: "happy", mouth: "grin" }], [880, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "happy" }
  },
  duck: {
    duration: 900,
    tracks: { sy: [[0, 1], [200, 0.78, "outQuad"], [700, 0.78], [900, 1, "outBack"]], sx: [[0, 1], [200, 1.1], [700, 1.1], [900, 1]] },
    set: [[0, { eyes: "closed", mouth: "grin" }], [800, { eyes: "open", mouth: "base" }]],
    pose: { sy: 0.8, eyes: "closed" }
  },
  // catch: the pets stand 48 apart; the ball's arc lands on the other one
  throwRight: {
    duration: 900,
    tracks: { dir: [[0, 1]], armR: [[0, 0], [200, -40], [380, 150, "outQuad"], [700, 60], [900, 0]], rot: [[0, 0], [200, -5], [380, 6], [700, 0]] },
    set: [[0, { hand: "ball", eyes: "open", mouth: "tongue" }], [380, { hand: "", mouth: "grin" }], [850, { mouth: "base" }]],
    fx: [[380, { kind: "ball", n: 1, at: [26, 14], v: [44, -33], g: 70, life: 1000, spin: 500 }]],
    pose: { dir: 1, hand: "ball" }
  },
  throwLeft: {
    duration: 900,
    tracks: { dir: [[0, -1]], armR: [[0, 0], [200, -40], [380, 150, "outQuad"], [700, 60], [900, 0]], rot: [[0, 0], [200, 5], [380, -6], [700, 0]] },
    set: [[0, { hand: "ball", eyes: "open", mouth: "tongue" }], [380, { hand: "", mouth: "grin" }], [850, { mouth: "base" }]],
    fx: [[380, { kind: "ball", n: 1, at: [6, 14], v: [-44, -33], g: 70, life: 1000, spin: -500 }]],
    pose: { dir: -1, hand: "ball" }
  },
  catchBall: {
    duration: 1100,
    tracks: { armL: [[0, 0], [300, 120, "outQuad"], [900, 120], [1100, 0]], armR: [[0, 0], [300, 120, "outQuad"], [900, 120], [1100, 0]], gazeY: [[0, -0.9], [900, 0, "step"]], sy: [[880, 1], [920, 0.9], [1100, 1, "outBack"]] },
    set: [[0, { eyes: "wide", mouth: "o" }], [920, { eyes: "happy", mouth: "grin" }]],
    pose: { armL: 120, armR: 120, eyes: "wide" }
  },
  // tug-of-war: the left pet holds the rope across to the right one
  tugLeft: {
    loop: true, step: 125, duration: 1000,
    tracks: { dir: [[0, 1]], rot: [[0, -10], [500, -14, "step"]], sy: [[0, 0.94]], x: [[0, 0], [500, -0.8, "step"]] },
    set: [[0, { hand: "rope", eyes: "squint", mouth: "pout" }]],
    pose: { dir: 1, hand: "rope", rot: -12 }
  },
  tugRight: {
    loop: true, step: 125, duration: 1000,
    tracks: { dir: [[0, -1]], rot: [[0, 10], [500, 14, "step"]], sy: [[0, 0.94]], x: [[0, 0], [500, -0.8, "step"]] },
    set: [[0, { hand: "ropeEnd", eyes: "angry", mouth: "pout" }]],
    pose: { dir: -1, hand: "ropeEnd", rot: 12 }
  },
  tumble: {
    duration: 1400,
    tracks: { rot: [[0, 0], [300, -30, "outQuad"], [700, 0, "outBack"]], sy: [[0, 1], [300, 0.86], [700, 1]] },
    use: [[700, "shakeOff"]],
    set: [[0, { eyes: "dizzy", mouth: "o" }], [1300, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "dizzy" }
  },
  // whisper gossip
  whisperRight: {
    duration: 2400,
    tracks: { dir: [[0, 1]], rot: [[0, 0], [300, 9], [2000, 9], [2300, 0]], armR: [[0, 0], [300, 70], [2000, 70], [2300, 0]] },
    set: [[0, { eyes: "squint", mouth: "o" }], [600, { mouth: "smirk" }], [1000, { mouth: "o" }], [1500, { mouth: "smirk" }], [2200, { eyes: "open", mouth: "base" }]],
    fx: [[500, { kind: "dot", n: 3, at: [26, 18], spread: [1, 1], v: [6, -2], vspread: [2, 2], life: 600, scale: 0.6 }]],
    pose: { dir: 1, rot: 9, mouth: "o" }
  },
  listenLeft: {
    duration: 2400,
    tracks: { dir: [[0, -1]], rot: [[0, 0], [300, -5], [2000, -5], [2300, 0]] },
    set: [[0, { eyes: "open" }], [900, { eyes: "wide", mouth: "o" }], [1600, { eyes: "happy", mouth: "grin" }], [2300, { eyes: "open", mouth: "base" }]],
    pose: { dir: -1, eyes: "wide" }
  },
  giggle: {
    duration: 1200,
    tracks: { sy: [[0, 1], [150, 0.94, "step"], [300, 1, "step"], [450, 0.94, "step"], [600, 1, "step"], [750, 0.94, "step"], [900, 1, "step"]] },
    set: [[0, { eyes: "happy", mouth: "grin" }], [1100, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "happy", mouth: "grin" }
  },
  // group nap pile: leaning on each other, one on top
  napLeanRight: {
    duration: 800, endPose: true,
    tracks: { rot: [[0, 0], [800, 12, "inOutQuad"]], sy: [[0, 1], [800, 0.92]] },
    set: [[0, { eyes: "closed" }], [700, { over: "zzz2" }]],
    pose: { rot: 12, eyes: "closed", over: "zzz2" }
  },
  napLeanLeft: {
    duration: 800, endPose: true,
    tracks: { rot: [[0, 0], [800, -12, "inOutQuad"]], sy: [[0, 1], [800, 0.92]] },
    set: [[0, { eyes: "closed" }]],
    pose: { rot: -12, eyes: "closed" }
  },
  napOnTop: {
    duration: 900, endPose: true,
    tracks: { y: [[0, 0], [400, -14, "outQuad"], [800, -9, "inQuad"]], rot: [[0, 0], [800, -78, "inOutQuad"]], sy: [[700, 1], [800, 0.9]] },
    set: [[0, { eyes: "happy" }], [700, { eyes: "closed", over: "zzz1" }]],
    pose: { y: -9, rot: -78, eyes: "closed" }
  },
  // conga: one step-and-kick, the scene slides the line
  conga: {
    loop: true, step: 125, duration: 1000,
    tracks: { rot: [[0, -6], [250, 6, "step"], [500, -6, "step"], [750, 6, "step"]], sy: [[0, 1], [250, 0.94, "step"], [500, 1, "step"], [750, 0.94, "step"]], armR: [[0, 60]], armL: [[0, 40]], dir: [[0, 1]] },
    set: [[0, { eyes: "happy", mouth: "grin" }]],
    fx: [[0, { kind: "note", n: 1, at: "head", spread: [3, 1], v: [0, -7], vspread: [3, 2], life: 900, spin: 40 }]],
    pose: { eyes: "happy", armR: 60 }
  },
  // carry a sleeping friend home: the carrier lifts, the friend lies on top
  carry: {
    loop: true, step: 125, duration: 500,
    tracks: { armL: [[0, 150]], armR: [[0, 150]], sy: bob(500, 0.94), lift: [[0, 0]] },
    set: [[0, { eyes: "squint", mouth: "tongue" }]],
    pose: { armL: 150, armR: 150 }
  },
  carried: {
    loop: true, step: 125, duration: 500,
    tracks: { y: [[0, -15], [250, -14, "step"]], rot: [[0, -80]] },
    set: [[0, { eyes: "closed", over: "zzz2" }]],
    pose: { y: -15, rot: -80, eyes: "closed" }
  },
  // baton hand-off between a session that ends and one that starts
  batonGive: {
    duration: 1400,
    tracks: { armR: [[0, 0], [300, 85, "outQuad"], [900, 85], [1200, 0]], rot: [[0, 0], [300, 6], [900, 6], [1200, 0]] },
    set: [[0, { hand: "baton", eyes: "happy" }], [900, { hand: "" }], [1300, { eyes: "open" }]],
    pose: { hand: "baton" }
  },
  batonTake: {
    duration: 1600,
    tracks: { armR: [[600, 0], [900, 85, "outQuad"], [1200, 140, "outBack"], [1500, 0]] },
    set: [[0, { eyes: "wide" }], [900, { hand: "baton", eyes: "happy", mouth: "grin" }], [1500, { hand: "", eyes: "open", mouth: "base" }]],
    pose: { hand: "baton", eyes: "happy" }
  },
  // Jinx's prank: tiptoe over, a tap, a raspberry, scarper
  sneakRight: {
    loop: true, step: 125, duration: 750,
    tracks: { dir: [[0, 1]], sy: [[0, 0.9], [375, 0.86, "step"]], sx: [[0, 1.06]], y: [[0, 0], [375, -0.8, "step"]] },
    set: [[0, { eyes: "squint", mouth: "smirk" }]],
    pose: { dir: 1, sy: 0.88, eyes: "squint" }
  },
  sneakLeft: {
    loop: true, step: 125, duration: 750,
    tracks: { dir: [[0, -1]], sy: [[0, 0.9], [375, 0.86, "step"]], sx: [[0, 1.06]], y: [[0, 0], [375, -0.8, "step"]] },
    set: [[0, { eyes: "squint", mouth: "smirk" }]],
    pose: { dir: -1, sy: 0.88, eyes: "squint" }
  },
  // the subagent's hatchling (a shadow clone): off it runs, back it comes
  hatchOut: {
    duration: 1400, endPose: true,
    tracks: { x: [[0, 0], [200, 0], [1200, 22, "inQuad"]], alpha: [[0, 0], [150, 1], [1000, 1], [1400, 0]], dir: [[0, 1]], sy: [[0, 0.8], [200, 1.1, "outBack"], [400, 1]] },
    set: [[0, { eyes: "happy", mouth: "grin" }]],
    fx: [[300, { kind: "dust", n: 2, at: "feet", spread: [1, 0.3], v: [-8, -2], life: 400, grow: 0.5 }]],
    pose: { alpha: 0 }
  },
  hatchBack: {
    duration: 1600, endPose: true,
    tracks: { x: [[0, 22], [1100, 0, "outQuad"]], alpha: [[0, 0], [200, 1], [1300, 1], [1600, 0]], dir: [[0, -1]] },
    set: [[0, { hand: "box", eyes: "happy" }]],
    pose: { alpha: 0 }
  }
}
