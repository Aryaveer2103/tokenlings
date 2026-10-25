// Second takes on actions, so the same event never plays the same way every
// time. Mostly the main clip's moves recombined.
const SEATED = { seat: "chair", lift: -3 }

export default {
  sessionStartB: {
    agent: true, duration: 1900,
    use: [[0, "flutter"], [520, "shakeOff"], [1160, "hop"]],
    set: [[1160, { eyes: "happy" }], [1800, { eyes: "open" }]],
    fx: [[700, { kind: "sparkle", n: 3, at: "head", spread: [4, 2], v: [0, -5], vspread: [6, 3], life: 600, spin: 160 }]],
    pose: { eyes: "happy" }
  },
  sessionEndB: {
    agent: true, duration: 3000, endPose: true,
    use: [[0, "bow"]],
    tracks: { sy: [[1000, 1], [1400, 1.06], [1800, 1], [2400, 0.88]], sx: [[1000, 1], [2400, 1.08]], faceY: [[1800, 0], [2400, 1.4]] },
    set: [[1000, { eyes: "closed", mouth: "yawn" }], [1800, { mouth: "base" }], [2500, { over: "zzz2" }]],
    pose: { eyes: "closed", over: "zzz2", sy: 0.88 }
  },
  promptB: {
    agent: true, duration: 700,
    use: [[0, "hopSmall"]],
    tracks: { topRot: [[0, 0], [80, 18], [200, 0]], faceY: [[400, 0], [480, 0.8], [700, 0]], gazeY: [[0, 0.8], [650, 0, "step"]] },
    set: [[0, { eyes: "wide", mouth: "o" }], [500, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "wide" }
  },
  thinkingB: {
    agent: true, loop: true, step: 125, duration: 2000,
    tracks: { armR: [[0, 55], [250, 70, "step"], [500, 55, "step"], [750, 70, "step"], [1000, 55, "step"]], gazeX: [[0, 0.9]], gazeY: [[0, -0.9]], faceX: [[0, 0.4]], rot: [[0, 3]] },
    set: [[0, { eyes: "up", mouth: "flat", over: "thought1" }], [500, { over: "thought2" }], [1000, { over: "thought3" }], [1500, { over: "thought2" }]],
    pose: { eyes: "up", armR: 60, over: "thought2" }
  },
  toolEditB: {
    agent: true, loop: true, step: 125, duration: 2000,
    tracks: { lift: [[0, -3]], gazeY: [[0, 0.8], [1250, -0.4, "step"], [1625, 0.8, "step"]], faceY: [[0, 0.5], [1250, 0, "step"], [1625, 0.5, "step"]] },
    set: [[0, { seat: "chair", desk: "laptopKeysL", mouth: "flat" }], [125, { desk: "laptopKeysR" }], [250, { desk: "laptopKeysL" }], [375, { desk: "laptopKeysR" }], [500, { desk: "laptop" }],
          [750, { desk: "laptopKeysL" }], [875, { desk: "laptopKeysR" }], [1000, { desk: "laptopKeysL" }], [1125, { desk: "laptop" }], [1250, { mouth: "o" }], [1625, { mouth: "flat" }]],
    pose: Object.assign({ desk: "laptopKeysL" }, SEATED)
  },
  toolShellB: {
    agent: true, loop: true, step: 125, duration: 2000,
    tracks: { lift: [[0, -3]], gazeY: [[0, 0.8]], faceY: [[0, 0.5], [1000, 1.1, "step"], [1250, 0.5, "step"]] },
    set: [[0, { seat: "chair", desk: "terminalOn", mouth: "tongue" }], [250, { desk: "terminalOff" }], [500, { desk: "terminalOn" }], [750, { desk: "terminalOff" }], [1000, { desk: "terminalOn", mouth: "smile" }], [1500, { desk: "terminalOff", mouth: "tongue" }]],
    pose: Object.assign({ desk: "terminalOn", mouth: "tongue" }, SEATED)
  },
  toolMcpB: {
    agent: true, loop: true, step: 125, duration: 1500,
    tracks: { gazeY: [[0, 0.8]], faceY: [[0, 0.5]], sy: [[0, 1], [375, 0.97, "step"], [750, 1, "step"], [1125, 0.97, "step"]] },
    set: [[0, { hand: "tools", mouth: "tongue" }]],
    fx: [[750, { kind: "sparkle", n: 1, at: "hand", v: [-3, -6], vspread: [3, 2], life: 400, spin: 200, scale: 0.6 }]],
    pose: { hand: "tools", mouth: "tongue" }
  },
  busyB: {
    agent: true, loop: true, step: 125, duration: 1328,
    tracks: { lift: [[0, -3]], gazeY: [[0, 0.8]], gazeX: [[0, -0.4], [664, 0.4, "step"]], faceY: [[0, 0.5]] },
    set: [[0, { seat: "chair", desk: "terminalOn", mouth: "tongue" }], [166, { desk: "laptopKeysL" }], [249, { desk: "laptopKeysR" }], [332, { desk: "laptopKeysL" }], [415, { desk: "laptopKeysR" }],
          [498, { desk: "terminalOff" }], [664, { desk: "laptopKeysL", over: "idea" }], [830, { desk: "laptopKeysR", over: "" }], [996, { desk: "terminalOn" }], [1162, { desk: "laptopKeysR" }]],
    pose: Object.assign({ desk: "terminalOn", mouth: "tongue" }, SEATED)
  },
  subagentSendB: {
    agent: true, duration: 1100,
    use: [[0, "waveBoth"]],
    set: [[0, { eyes: "happy", mouth: "grin" }], [1000, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "happy" }
  },
  subagentReturnB: {
    agent: true, duration: 900,
    use: [[0, "nod"], [400, "hopSmall"]],
    set: [[0, { eyes: "happy", hand: "box" }], [800, { eyes: "open", hand: "" }]],
    pose: { hand: "box" }
  },
  failureB: {
    agent: true, duration: 2000,
    use: [[1300, "shakeOff"]],
    tracks: { sx: [[0, 1], [100, 1.12, "outQuad"], [1100, 1.12], [1300, 1]], sy: [[0, 1], [100, 0.9], [1100, 0.9], [1300, 1]] },
    set: [[0, { eyes: "squint", mouth: "pout" }], [400, { eyes: "x" }], [1200, { eyes: "angry", mouth: "flat" }], [1900, { eyes: "open", mouth: "base" }]],
    fx: [[60, { kind: "smoke", n: 3, at: "head", spread: [3, 1], v: [0, -7], vspread: [5, 2], life: 900, grow: 0.8 }], [300, { kind: "star", n: 2, at: "head", spread: [5, 1], v: [0, -4], vspread: [6, 2], life: 600, spin: 300, scale: 0.7 }]],
    pose: { eyes: "x", mouth: "pout" }
  },
  needsYouB: {
    agent: true, loop: true, step: 125, duration: 2400,
    use: [[0, "hop"], [700, "waveBoth"]],
    tracks: { gazeY: [[0, 0.6]], faceY: [[0, 0.4]] },
    set: [[0, { over: "bang", eyes: "wide", mouth: "open" }], [1600, { eyes: "open", mouth: "o" }]],
    pose: { over: "bang", eyes: "wide", armL: 110, armR: 110 }
  },
  compactingB: {
    agent: true, duration: 1500,
    tracks: { sx: [[0, 1], [150, 1.1], [450, 0.6, "inQuad"], [1050, 0.6], [1250, 1.12, "outQuad"], [1500, 1, "outBack"]], sy: [[0, 1], [150, 0.92], [450, 1.25, "inQuad"], [1050, 1.25], [1250, 0.92], [1500, 1, "outBack"]] },
    set: [[400, { eyes: "squint", mouth: "steam" }], [1100, { eyes: "wide", mouth: "o" }], [1400, { eyes: "open", mouth: "base" }]],
    fx: [[1100, { kind: "steam", n: 3, at: "head", spread: [3, 1], v: [0, -9], vspread: [6, 2], life: 700, grow: 1.2 }]],
    pose: { eyes: "squint", sx: 0.65, sy: 1.2 }
  },
  doneShortB: {
    agent: true, duration: 1000,
    use: [[100, "perk"]],
    set: [[0, { eyes: "wink", mouth: "smile" }], [880, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "wink", mouth: "smile" }
  },
  doneMediumB: {
    agent: true, duration: 1500,
    use: [[0, "hop"], [180, "spin"], [700, "land"]],
    set: [[0, { eyes: "happy", mouth: "grin" }], [1300, { eyes: "open", mouth: "base" }]],
    fx: [[300, { kinds: ["confettiA", "confettiB", "confettiC", "confettiD"], n: 10, at: "head", spread: [3, 1], v: [0, -24], vspread: [18, 8], g: 60, life: 1300, spin: 360 }]],
    pose: { eyes: "happy", mouth: "grin" }
  },
  doneLongB: {
    agent: true, duration: 3000,
    use: [[0, "hop"], [620, "hop"], [1240, "flip"]],
    tracks: { armL: [[2140, 0], [2300, 150, "outBack"], [2800, 150], [3000, 0]], armR: [[2140, 0], [2300, 150, "outBack"], [2800, 150], [3000, 0]] },
    set: [[0, { eyes: "star", mouth: "grin" }], [2900, { eyes: "open", mouth: "base" }]],
    fx: [[1500, { kind: "firework", n: 4, at: "head", spread: [9, 3], v: [0, -16], vspread: [8, 4], life: 900, grow: 1.4 }]],
    pose: { eyes: "star", armL: 150, armR: 150 }
  },
  doneStreakB: {
    agent: true, duration: 2400,
    use: [[0, "dance"]],
    set: [[0, { over: "sparkleCrown" }], [2300, { over: "" }]],
    pose: { over: "sparkleCrown", eyes: "happy" }
  },
  usageExhaustedB: {
    agent: true, duration: 1200, endPose: true,
    tracks: { sy: [[0, 1], [900, 0.62, "inQuad"]], sx: [[0, 1], [900, 1.25, "inQuad"]], faceY: [[0, 0], [900, 1.6]] },
    set: [[200, { eyes: "sleepy", mouth: "wavy" }], [700, { over: "batteryEmpty", eyes: "x" }]],
    pose: { sy: 0.62, sx: 1.25, over: "batteryEmpty", eyes: "x" }
  },
  usageResetB: {
    agent: true, duration: 1800,
    use: [[0, "stretch"]],
    set: [[0, { over: "batteryFull" }], [1600, { over: "" }]],
    fx: [[900, { kind: "bolt", n: 2, at: "head", spread: [5, 1], v: [0, -6], vspread: [4, 2], life: 600 }]],
    pose: { over: "batteryFull" }
  },
  thinkingLongB: {
    agent: true, loop: true, step: 125, duration: 4000,
    tracks: { gazeX: [[0, -0.8], [1000, 0.8, "step"], [2000, -0.8, "step"], [3000, 0.8, "step"]], gazeY: [[0, 0.3]], faceY: [[0, 0.6]], rot: [[0, -2], [2000, 2, "step"]] },
    set: [[0, { hand: "scroll", eyes: "open", over: "thought1" }], [1000, { over: "thought2" }], [2000, { over: "thought3" }], [3000, { over: "idea" }]],
    pose: { hand: "scroll", over: "thought2" }
  },
  mediaBopB: {
    loop: true, step: 125, duration: 1000,
    tracks: { rot: [[0, -5], [250, 5, "step"], [500, -5, "step"], [750, 5, "step"]], armL: [[0, 30], [500, 90, "step"]], armR: [[0, 90], [500, 30, "step"]] },
    set: [[0, { eyes: "happy", mouth: "o" }]],
    fx: [[500, { kind: "note", n: 1, at: "head", spread: [5, 1], v: [-6, -8], vspread: [3, 2], life: 1100, spin: 40 }]],
    pose: { eyes: "happy", over: "noteBubble" }
  },
  morningMugB: {
    duration: 3400,
    use: [[0, "stretch"]],
    tracks: { propY: [[1400, 0], [1700, -2.4, "outQuad"], [2500, -2.4], [2800, 0]] },
    set: [[1300, { hand: "mug" }], [1800, { eyes: "closed", mouth: "smile" }], [2700, { eyes: "happy" }], [3300, { hand: "", eyes: "open", mouth: "base" }]],
    pose: { hand: "mug", eyes: "happy" }
  },
  hoverB: {
    duration: 600,
    tracks: { topRot: [[0, 0], [70, 18], [200, 0]] },
    set: [[0, { eyes: "happy", mouth: "smile" }], [500, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "happy" }
  },
  jumpB: {
    duration: 1100,
    use: [[0, "hopSpin"]],
    set: [[0, { mouth: "grin" }], [1000, { mouth: "base" }]],
    pose: { eyes: "happy" }
  },
  patB: {
    duration: 700,
    tracks: { sx: [[0, 1], [150, 1.14, "outQuad"], [700, 1, "outBack"]], sy: [[0, 1], [150, 0.86], [700, 1, "outBack"]], rot: [[0, 0], [150, 4], [400, -3], [700, 0]] },
    set: [[0, { eyes: "closed", mouth: "cat" }], [650, { eyes: "open", mouth: "base" }]],
    fx: [[150, { kind: "heart", n: 2, at: "head", spread: [5, 1], v: [0, -9], vspread: [5, 2], life: 900, scale: 0.8 }]],
    pose: { eyes: "closed", over: "heartBubble" }
  },
  grumpB: {
    duration: 2400,
    tracks: { dir: [[0, -1], [1700, 1, "step"]], rot: [[0, 0], [200, -6], [1600, -6], [1800, 0]], sx: [[0, 1], [150, 1.1], [1600, 1.1], [1800, 1]] },
    set: [[0, { eyes: "closed", mouth: "pout" }], [1200, { eyes: "squint" }], [1800, { eyes: "happy", mouth: "smile" }], [2300, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "closed", mouth: "pout" }
  }
}
