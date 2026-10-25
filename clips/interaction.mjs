// Interaction clips (§4.4 B): what the pointer does to a pet.
export default {
  hover: {
    duration: 520,
    use: [[0, "perk"]],
    set: [[0, { eyes: "wide" }], [260, { eyes: "open" }]],
    pose: { eyes: "wide" }
  },
  jump: {
    duration: 700,
    use: [[0, "hop"]],
    set: [[0, { eyes: "happy", mouth: "grin" }], [600, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "happy", mouth: "grin" }
  },
  // click that focuses the terminal: a "follow me" jump toward it
  followMe: {
    duration: 1300,
    use: [[0, "hop"], [650, "wave"]],
    tracks: { x: [[0, 0], [90, 0], [450, 2.5, "outQuad"], [1100, 0, "inOutQuad"]] },
    set: [[0, { eyes: "happy" }], [700, { eyes: "open", mouth: "grin" }], [1250, { mouth: "base" }]],
    pose: { eyes: "happy", armR: 110 }
  },
  // the click had nowhere to go: shrug (the tooltip explains)
  shrug: {
    duration: 1300,
    tracks: {
      armL: [[0, 0], [200, 55, "outBack"], [1000, 55], [1250, 0]], armR: [[0, 0], [200, 55, "outBack"], [1000, 55], [1250, 0]],
      sy: [[0, 1], [200, 0.95], [1000, 0.95], [1250, 1]], rot: [[0, 0], [200, -4], [1000, -4], [1250, 0]]
    },
    set: [[0, { mouth: "flat", eyes: "sleepy", over: "question" }], [1150, { mouth: "base", eyes: "open", over: "" }]],
    pose: { over: "question", mouth: "flat" }
  },
  // scroll: head pats with hearts
  pat: {
    duration: 600,
    tracks: { sy: [[0, 1], [120, 0.9, "outQuad"], [600, 1, "outBack"]], sx: [[0, 1], [120, 1.08], [600, 1, "outBack"]], faceY: [[0, 0], [120, 0.8], [600, 0]] },
    set: [[0, { eyes: "happy", mouth: "smile" }], [560, { eyes: "open", mouth: "base" }]],
    fx: [[120, { kind: "heart", n: 1, at: "head", spread: [4, 1], v: [0, -9], vspread: [3, 2], life: 900, scale: 0.9 }]],
    pose: { eyes: "happy", over: "heartBubble" }
  },
  // over-petting: giggly and dizzy
  overPetted: {
    duration: 1800,
    tracks: { rot: [[0, 0], [150, -7], [300, 7], [450, -6], [600, 6], [750, -5], [900, 4], [1200, 0]], sy: [[0, 1], [150, 0.94], [1200, 0.94], [1500, 1]] },
    set: [[0, { eyes: "dizzy", mouth: "grin", over: "dizzy1" }], [300, { over: "dizzy2" }], [600, { over: "dizzy1" }], [900, { over: "dizzy2" }], [1200, { over: "", eyes: "happy" }], [1700, { eyes: "open", mouth: "base" }]],
    fx: [[100, { kind: "heart", n: 4, at: "head", spread: [5, 2], v: [0, -10], vspread: [7, 3], life: 1000 }]],
    pose: { eyes: "dizzy", over: "dizzy1", mouth: "grin" }
  },
  // drag: picked up, dangling, feet kicking (the spring swings the topper)
  pickedUp: {
    loop: true, step: 83, duration: 1000,
    tracks: {
      y: [[0, -4]], shadow: [[0, 0.6]],
      rot: [[0, -9], [500, 9, "inOutQuad"], [1000, -9, "inOutQuad"]],
      sx: [[0, 0.96], [166, 1.02, "step"], [332, 0.96, "step"], [498, 1.02, "step"], [664, 0.96, "step"], [830, 1.02, "step"]],
      sy: [[0, 1.06]], armL: [[0, 120]], armR: [[0, 120]]
    },
    set: [[0, { eyes: "wide", mouth: "o" }]],
    pose: { y: -4, eyes: "wide", mouth: "o", armL: 120, armR: 120 }
  },
  drop: {
    duration: 520,
    tracks: { y: [[0, -4], [140, 0, "inQuad"]] },
    use: [[140, "land"]],
    set: [[0, { eyes: "wide" }], [420, { eyes: "open" }]],
    pose: {}
  },
  // rapid poking: puffed-cheek grump, then forgives
  grump: {
    duration: 2200,
    tracks: { sx: [[0, 1], [150, 1.1, "outBack"], [1500, 1.1], [1800, 1]], sy: [[0, 1], [150, 1.04], [1500, 1.04], [1800, 1]], dir: [[0, 1], [200, -1, "step"], [1500, 1, "step"]] },
    set: [[0, { eyes: "angry", mouth: "pout" }], [1500, { eyes: "happy", mouth: "smile" }], [2100, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "angry", mouth: "pout" }
  },
  // middle-click: do-not-disturb nap (the animation stops once settled)
  dndSleep: {
    duration: 900, endPose: true,
    tracks: { sy: [[0, 1], [700, 0.9, "inOutQuad"]], sx: [[0, 1], [700, 1.06]], faceY: [[0, 0], [700, 1.2]] },
    set: [[0, { eyes: "sleepy", hand: "nightcapOn" }], [400, { eyes: "closed" }], [700, { over: "zzz2" }]],
    pose: { eyes: "closed", hand: "nightcapOn", over: "zzz2", sy: 0.9 }
  },
  wake: {
    duration: 900,
    use: [[0, "flutter"], [480, "hopSmall"]],
    pose: { eyes: "open" }
  }
}
