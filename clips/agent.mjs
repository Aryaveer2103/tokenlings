// Agent-driven clips (§4.4 A). These preempt everything else.
//
// Sustained loops (thinking, tools, needs-you) are `step`ped: sampled on an
// absolute 125 ms grid (8 changes/s at most, 83 ms = 12 for the busy montage),
// with holds between key poses so most steps change nothing at all. Every pet
// on the same grid changes on the same frames.
const SEATED = { seat: "chair", lift: -3 }

export default {
  // ---- session
  sessionStart: {
    agent: true, duration: 2400,
    use: [[0, "flutter"], [520, "stretch"], [1820, "hopSmall"]],
    fx: [[1500, { kind: "sparkle", n: 4, at: "head", spread: [5, 2], v: [0, -6], vspread: [6, 3], life: 700, spin: 120 }]],
    pose: { eyes: "open", mouth: "smile" }
  },
  sessionEnd: {
    agent: true, duration: 3400, endPose: true,
    use: [[0, "wave"]],
    tracks: {
      sy: [[0, 1], [1100, 1], [1500, 1.06], [1900, 1], [2600, 0.88, "inOutQuad"]],
      sx: [[0, 1], [2600, 1.08]],
      faceY: [[0, 0], [2000, 0], [2600, 1.4]]
    },
    set: [[1100, { mouth: "yawn", eyes: "closed" }], [1900, { mouth: "base" }], [2700, { over: "zzz1" }], [3100, { over: "zzz2" }]],
    pose: { eyes: "closed", over: "zzz2", sy: 0.88 }
  },

  // ---- turns
  prompt: {
    agent: true, duration: 560,
    use: [[0, "perk"], [200, "nod"]],
    tracks: { gazeY: [[0, 0], [60, 0.8, "step"], [500, 0, "step"]] },
    pose: { eyes: "wide" }
  },
  thinking: {
    agent: true, loop: true, step: 125, duration: 2400,
    tracks: {
      gazeX: [[0, -0.9]], gazeY: [[0, -0.9]], faceX: [[0, -0.4]], faceY: [[0, -0.3]],
      rot: [[0, -2], [1200, 2, "inOutQuad"], [2400, -2, "inOutQuad"]]
    },
    set: [[0, { eyes: "up", over: "thought1" }], [400, { over: "thought2" }], [800, { over: "thought3" }], [1200, { over: "thought1" }], [1600, { over: "thought2" }], [2000, { over: "thought3" }]],
    pose: { eyes: "up", over: "thought2" }
  },
  // > 20 s: paces, taps its chin
  thinkingLong: {
    agent: true, loop: true, step: 125, duration: 4800,
    tracks: {
      x: [[0, 0], [1000, 3.5, "inOutQuad"], [1400, 3.5], [2400, 0, "inOutQuad"], [3400, -3.5, "inOutQuad"], [3800, -3.5], [4800, 0, "inOutQuad"]],
      dir: [[0, 1], [1400, -1, "step"], [3800, 1, "step"]],
      sy: [[0, 1], [250, 0.97], [500, 1], [750, 0.97], [1000, 1], [1650, 0.97], [1900, 1], [2150, 0.97], [2400, 1], [2650, 0.97], [2900, 1], [3150, 0.97], [3400, 1], [4050, 0.97], [4300, 1], [4550, 0.97], [4800, 1]],
      armR: [[0, 60], [1000, 60], [1100, 75, "step"], [1200, 60, "step"], [1300, 75, "step"], [1400, 60, "step"], [3400, 60], [3500, 75, "step"], [3600, 60, "step"], [3700, 75, "step"], [3800, 60, "step"]],
      gazeY: [[0, -0.7]], gazeX: [[0, -0.5]]
    },
    set: [[0, { eyes: "up", over: "thought1" }], [600, { over: "thought2" }], [1200, { over: "thought3" }], [1800, { over: "thought1" }], [2400, { over: "thought2" }], [3000, { over: "thought3" }], [3600, { over: "thought1" }], [4200, { over: "idea" }]],
    pose: { eyes: "up", over: "thought2", armR: 60 }
  },

  // ---- tools (seated at the laptop; each tool its own prop)
  toolEdit: {
    agent: true, loop: true, step: 125, duration: 1000,
    tracks: {
      lift: [[0, -3]], gazeY: [[0, 0.8]], gazeX: [[0, 0]], faceY: [[0, 0.5]],
      sy: [[0, 0.985], [125, 1, "step"], [250, 0.985, "step"], [375, 1, "step"], [500, 0.985, "step"], [625, 1, "step"], [750, 0.985, "step"], [875, 1, "step"]]
    },
    set: [[0, { seat: "chair", desk: "laptopKeysL", mouth: "base" }], [125, { desk: "laptopKeysR" }], [250, { desk: "laptopKeysL" }], [375, { desk: "laptopKeysR" }],
          [500, { desk: "laptopKeysL" }], [625, { desk: "laptopKeysR" }], [750, { desk: "laptop" }]],
    pose: Object.assign({ desk: "laptopKeysL" }, SEATED)
  },
  toolShell: {
    agent: true, loop: true, step: 125, duration: 1000,
    tracks: { lift: [[0, -3]], gazeY: [[0, 0.8]], faceY: [[0, 0.5]], rot: [[0, 0], [500, 1.5, "step"]] },
    set: [[0, { seat: "chair", desk: "terminalOn", mouth: "tongue" }], [250, { desk: "terminalOff" }], [500, { desk: "terminalOn" }], [750, { desk: "terminalOff" }]],
    pose: Object.assign({ desk: "terminalOn", mouth: "tongue" }, SEATED)
  },
  toolRead: {
    agent: true, loop: true, step: 125, duration: 2000,
    tracks: {
      propX: [[0, -2.5], [1000, 1.5, "inOutQuad"], [2000, -2.5, "inOutQuad"]],
      propY: [[0, 0], [500, -1], [1000, 0], [1500, -1], [2000, 0]],
      gazeX: [[0, -0.6], [1000, 1, "inOutQuad"], [2000, -0.6, "inOutQuad"]], gazeY: [[0, 0.2]],
      rot: [[0, -2], [1000, 2], [2000, -2]]
    },
    set: [[0, { hand: "magnifier", eyes: "open" }]],
    pose: { hand: "magnifier" }
  },
  toolReadScroll: {
    agent: true, loop: true, step: 125, duration: 2400,
    tracks: {
      gazeX: [[0, -0.8], [600, 0.8, "step"], [1200, -0.8, "step"], [1800, 0.8, "step"]],
      gazeY: [[0, -0.2], [1200, 0.5, "step"]], faceY: [[0, 0.6]]
    },
    set: [[0, { hand: "scroll" }]],
    pose: { hand: "scroll" }
  },
  toolWeb: {
    agent: true, loop: true, step: 125, duration: 2400,
    tracks: { rot: [[0, -4], [1200, 4, "inOutQuad"], [2400, -4, "inOutQuad"]], dir: [[0, 1], [1200, -1, "step"]], y: [[0, -0.5]] },
    set: [[0, { hand: "binoculars", eyes: "open" }]],
    pose: { hand: "binoculars" }
  },
  toolWebRadar: {
    agent: true, loop: true, step: 125, duration: 1500,
    tracks: { gazeY: [[0, -0.8]], faceY: [[0, -0.4]] },
    set: [[0, { over: "radar1", eyes: "up" }], [250, { over: "radar2" }], [500, { over: "radar3" }], [750, { over: "" }], [1000, { over: "radar1" }], [1250, { over: "radar2" }]],
    pose: { over: "radar3", eyes: "up" }
  },
  toolMcp: {
    agent: true, loop: true, step: 125, duration: 1000,
    tracks: { propRot: [[0, -18], [250, 18, "step"], [500, -18, "step"], [750, 18, "step"]], gazeX: [[0, 0.8]], gazeY: [[0, 0.4]], faceX: [[0, 0.4]] },
    set: [[0, { hand: "wrench", mouth: "tongue" }]],
    fx: [[500, { kind: "sparkle", n: 1, at: "hand", spread: [1, 1], v: [4, -6], vspread: [3, 2], life: 380, spin: 200, scale: 0.7 }]],
    pose: { hand: "wrench", mouth: "tongue" }
  },
  // rapid tool bursts merge into one continuous montage: faster keys, flashes of ideas
  busy: {
    agent: true, loop: true, step: 125, duration: 1660,
    tracks: { lift: [[0, -3]], gazeY: [[0, 0.8]], faceY: [[0, 0.5]], sy: [[0, 0.985], [166, 1, "step"], [332, 0.985, "step"], [498, 1, "step"], [664, 0.985, "step"], [830, 1, "step"]] },
    set: [[0, { seat: "chair", desk: "laptopKeysL", mouth: "tongue" }], [83, { desk: "laptopKeysR" }], [166, { desk: "laptopKeysL" }], [249, { desk: "laptopKeysR" }],
          [332, { desk: "laptopKeysL" }], [415, { desk: "laptopKeysR" }], [498, { desk: "terminalOn" }], [664, { desk: "terminalOff" }], [830, { desk: "laptopKeysL", over: "idea" }],
          [996, { desk: "laptopKeysR", over: "" }], [1162, { desk: "laptopKeysL" }], [1328, { desk: "laptopKeysR" }]],
    pose: Object.assign({ desk: "laptopKeysR", mouth: "tongue" }, SEATED)
  },
  subagentSend: {
    agent: true, duration: 1300,
    use: [[0, "hopSmall"]],
    tracks: { armR: [[400, 0], [600, 80, "outBack"], [1000, 80], [1300, 0]], gazeX: [[400, 0], [500, 1.2, "step"], [1200, 0, "step"]] },
    set: [[400, { mouth: "grin" }], [1200, { mouth: "base" }]],
    fx: [[600, { kind: "dust", n: 3, at: "feet", spread: [2, 0.5], v: [10, -2], vspread: [3, 2], life: 500 }]],
    pose: { armR: 80, mouth: "grin" }
  },
  subagentReturn: {
    agent: true, duration: 1100,
    use: [[500, "hopSmall"]],
    set: [[0, { hand: "box", eyes: "happy" }], [900, { hand: "", eyes: "open" }]],
    pose: { hand: "box", eyes: "happy" }
  },
  failure: {
    agent: true, duration: 2200,
    tracks: { sy: [[0, 1], [80, 0.82, "outQuad"], [400, 0.95, "outBack"], [1500, 0.95], [1700, 1]] },
    use: [[1500, "shakeOff"]],
    set: [[60, { eyes: "x", mouth: "wavy", over: "dizzy1" }], [400, { over: "dizzy2" }], [700, { over: "dizzy1" }], [1000, { over: "dizzy2" }], [1300, { over: "", eyes: "squint" }], [1900, { eyes: "open", mouth: "base" }]],
    fx: [[40, { kind: "smoke", n: 4, at: "head", spread: [3, 1], v: [0, -6], vspread: [5, 2], life: 900, grow: 0.8 }]],
    pose: { eyes: "x", over: "dizzy1", mouth: "wavy" }
  },

  // ---- needs you: the escalation ladder
  needsYou: {
    agent: true, loop: true, step: 125, duration: 2600,
    use: [[0, "hopSmall"], [420, "wave"], [1500, "hopSmall"]],
    tracks: { gazeY: [[0, 0.6]], faceY: [[0, 0.4]] },
    set: [[0, { over: "bang", eyes: "wide", mouth: "o" }], [1400, { eyes: "open" }]],
    pose: { over: "bang", eyes: "wide", armR: 110 }
  },
  needsYouSign: {
    agent: true, loop: true, step: 125, duration: 3000,
    tracks: { rot: [[0, -3], [1500, 3, "inOutQuad"], [3000, -3, "inOutQuad"]], gazeY: [[0, 0.7]], faceY: [[0, 0.5]], propRot: [[0, -4], [1500, 4, "inOutQuad"], [3000, -4, "inOutQuad"]] },
    set: [[0, { hand: "signQ", eyes: "open", mouth: "o" }]],
    pose: { hand: "signQ", mouth: "o" }
  },
  needsYouWait: {
    agent: true, loop: true, step: 125, duration: 3000,
    tracks: {
      sy: [[0, 0.93]], sx: [[0, 1.04]], gazeY: [[0, 0.6]],
      rot: [[0, 0], [250, 1.5, "step"], [500, 0, "step"], [750, 1.5, "step"], [1000, 0, "step"], [1250, 1.5, "step"], [1500, 0, "step"]]
    },
    set: [[0, { hand: "signQ", eyes: "sleepy", mouth: "flat" }], [2000, { mouth: "steam" }], [2400, { mouth: "flat" }]],
    fx: [[2050, { kind: "steam", n: 2, at: "mouth", spread: [0.5, 0.2], v: [5, -3], vspread: [2, 1], life: 700, grow: 1 }]],
    pose: { hand: "signQ", eyes: "sleepy", sy: 0.93 }
  },
  // after 10 min: dozes holding the sign; the animation stops (battery)
  needsYouDoze: {
    agent: true, duration: 1200, endPose: true,
    tracks: { sy: [[0, 1], [1000, 0.9, "inOutQuad"]], faceY: [[0, 0], [1000, 1.2]], rot: [[0, 0], [1000, 4]] },
    set: [[0, { hand: "signQ", eyes: "closed", mouth: "base" }], [800, { over: "zzz2" }]],
    pose: { hand: "signQ", eyes: "closed", over: "zzz2" }
  },

  compacting: {
    agent: true, duration: 1600,
    tracks: {
      sy: [[0, 1], [140, 1.08, "outQuad"], [420, 0.52, "inQuad"], [1100, 0.52], [1300, 1.12, "outQuad"], [1600, 1, "outBack"]],
      sx: [[0, 1], [140, 0.94], [420, 1.32, "inQuad"], [1100, 1.32], [1300, 0.94], [1600, 1, "outBack"]]
    },
    set: [[400, { eyes: "squint", mouth: "steam", over: "steam" }], [1150, { eyes: "wide", mouth: "o", over: "" }], [1500, { eyes: "open", mouth: "base" }]],
    fx: [[500, { kind: "steam", n: 4, at: "head", spread: [4, 1], v: [0, -8], vspread: [6, 2], life: 800, grow: 1.2 }]],
    pose: { eyes: "squint", over: "steam", sy: 0.6, sx: 1.25 }
  },

  // ---- done, scaled by how long the task took
  doneShort: {
    agent: true, duration: 1000,
    use: [[200, "nod"]],
    set: [[0, { eyes: "happy", mouth: "smile" }], [850, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "happy", mouth: "smile" }
  },
  doneMedium: {
    agent: true, duration: 1800,
    use: [[0, "hop"], [700, "hopSmall"]],
    set: [[0, { eyes: "happy", mouth: "grin" }], [1500, { eyes: "open", mouth: "base" }]],
    fx: [[260, { kinds: ["confettiA", "confettiB", "confettiC", "confettiD"], n: 10, at: "head", spread: [3, 1], v: [0, -26], vspread: [16, 8], g: 60, life: 1300, spin: 360 }]],
    pose: { eyes: "happy", mouth: "grin", armL: 70, armR: 70 }
  },
  doneLong: {
    agent: true, duration: 3200,
    use: [[0, "flip"], [900, "land"]],
    tracks: { armL: [[1300, 0], [1500, 150, "outBack"], [2700, 150], [3100, 0]], armR: [[1300, 0], [1500, 150, "outBack"], [2700, 150], [3100, 0]], sy: [[1300, 1], [1500, 1.08], [2700, 1.08], [3100, 1]] },
    set: [[0, { eyes: "happy", mouth: "grin" }], [1400, { eyes: "star" }], [2900, { eyes: "open", mouth: "base" }]],
    fx: [[1500, { kind: "firework", n: 3, at: "head", spread: [8, 3], v: [0, -14], vspread: [8, 4], life: 900, grow: 1.4 }],
         [1800, { kind: "firework", n: 2, at: "head", spread: [9, 2], v: [0, -18], vspread: [6, 3], life: 900, grow: 1.4 }],
         [1500, { kinds: ["confettiA", "confettiB", "confettiC", "confettiD"], n: 8, at: "head", spread: [3, 1], v: [0, -24], vspread: [18, 8], g: 60, life: 1400, spin: 360 }]],
    pose: { eyes: "star", mouth: "grin", armL: 150, armR: 150 }
  },
  doneStreak: {
    agent: true, duration: 2200,
    use: [[0, "hop"], [800, "spin"]],
    set: [[0, { eyes: "star", mouth: "grin", over: "sparkleCrown" }], [2000, { eyes: "open", mouth: "base", over: "" }]],
    fx: [[300, { kind: "star", n: 5, at: "head", spread: [6, 2], v: [0, -10], vspread: [8, 4], life: 900, spin: 200 }]],
    pose: { eyes: "star", over: "sparkleCrown" }
  },

  // ---- usage (only with a supported data source)
  usageExhausted: {
    agent: true, duration: 1400, endPose: true,
    tracks: { rot: [[0, 0], [200, -10], [700, 78, "inQuad"], [900, 72, "outBack"]], y: [[0, 0], [700, 2], [900, 2]], sy: [[700, 1], [800, 0.9], [900, 1]] },
    set: [[300, { eyes: "x", mouth: "wavy" }], [900, { over: "batteryEmpty" }]],
    pose: { eyes: "x", over: "batteryEmpty", rot: 72 }
  },
  usageReset: {
    agent: true, duration: 1600,
    use: [[200, "hop"]],
    set: [[0, { over: "batteryFull", eyes: "wide" }], [500, { eyes: "happy", mouth: "grin" }], [1400, { over: "", eyes: "open", mouth: "base" }]],
    fx: [[500, { kind: "sparkle", n: 5, at: "head", spread: [6, 3], v: [0, -8], vspread: [8, 4], life: 700, spin: 150 }]],
    pose: { over: "batteryFull", eyes: "happy" }
  },

  // resting states the brain settles into
  asleep: {
    agent: true, loop: true, step: 500, duration: 3000,
    tracks: { sy: [[0, 0.9], [1500, 0.87, "step"]], sx: [[0, 1.06], [1500, 1.08, "step"]], faceY: [[0, 1.2]] },
    set: [[0, { eyes: "closed", over: "zzz1" }], [1000, { over: "zzz2" }], [2000, { over: "zzz3" }]],
    pose: { eyes: "closed", over: "zzz2", sy: 0.9 }
  },
  asleepStill: {
    agent: true, duration: 600, endPose: true,
    tracks: { sy: [[0, 1], [600, 0.9]], sx: [[0, 1], [600, 1.06]], faceY: [[0, 0], [600, 1.2]] },
    set: [[0, { eyes: "closed" }], [400, { over: "zzz2" }]],
    pose: { eyes: "closed", over: "zzz2", sy: 0.9 }
  }
}
