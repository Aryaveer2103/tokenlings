// Context clips (§4.4 D): the desktop around the pets. Event-driven; the
// sources (MPRIS, UPower, the clock, Hyprland) live in the brain.
export default {
  // media playing: head-bob on the beat, notes, mini headphones
  mediaBop: {
    loop: true, step: 125, duration: 1000,
    tracks: {
      faceY: [[0, 0], [250, 0.9, "step"], [500, 0, "step"], [750, 0.9, "step"]],
      sy: [[0, 1], [250, 0.97, "step"], [500, 1, "step"], [750, 0.97, "step"]],
      rot: [[0, -3], [500, 3, "step"]]
    },
    set: [[0, { hand: "headphonesOn", eyes: "closed", mouth: "smile" }]],
    fx: [[0, { kind: "note", n: 1, at: "head", spread: [5, 1], v: [6, -8], vspread: [3, 2], life: 1100, spin: 40 }]],
    pose: { hand: "headphonesOn", eyes: "closed", over: "noteBubble" }
  },
  // battery under 20 %: sweating, fanning itself
  batteryLow: {
    loop: true, step: 125, duration: 2000,
    tracks: { propRot: [[0, -25], [250, 15, "step"], [500, -25, "step"], [750, 15, "step"], [1000, -25, "step"], [1250, 15, "step"], [1500, -25, "step"], [1750, 15, "step"]], sy: [[0, 0.97]] },
    set: [[0, { hand: "fan", eyes: "worried", mouth: "wavy" }]],
    fx: [[200, { kind: "sweat", n: 1, at: "head", spread: [4, 1], v: [3, -2], vspread: [2, 1], g: 22, life: 800 }]],
    pose: { hand: "fan", eyes: "worried" }
  },
  pluggedIn: {
    duration: 1100,
    use: [[0, "perk"]],
    set: [[0, { eyes: "star", mouth: "grin" }], [900, { eyes: "open", mouth: "base" }]],
    fx: [[150, { kind: "sparkle", n: 4, at: "head", spread: [6, 3], v: [0, -6], vspread: [5, 3], life: 700, spin: 160 }],
         [150, { kind: "bolt", n: 1, at: "head", spread: [2, 1], v: [0, -4], life: 700 }]],
    pose: { eyes: "star", over: "batteryFull" }
  },
  // night: nightcap, yawns
  nightYawn: {
    duration: 1800,
    use: [[200, "stretch"]],
    set: [[0, { hand: "nightcapOn" }]],
    pose: { hand: "nightcapOn", eyes: "sleepy" }
  },
  nightIdle: {
    duration: 600, endPose: true,
    set: [[0, { hand: "nightcapOn", eyes: "sleepy" }]],
    pose: { hand: "nightcapOn", eyes: "sleepy" }
  },
  // morning: a tiny mug
  morningMug: {
    duration: 3600,
    tracks: { propY: [[0, 0], [800, 0], [1100, -2.4, "outQuad"], [1700, -2.4], [2000, 0], [2600, 0], [2900, -2.4], [3300, 0]], propRot: [[1100, 0], [1300, -18], [1700, -18], [2000, 0]] },
    set: [[0, { hand: "mug", eyes: "sleepy" }], [1300, { eyes: "closed", mouth: "smile" }], [2000, { eyes: "happy" }], [3400, { hand: "", eyes: "open", mouth: "base" }]],
    pose: { hand: "mug", eyes: "happy" }
  },
  glanceLeft: {
    duration: 900,
    tracks: { gazeX: [[0, 0], [60, -1.3, "step"], [800, 0, "step"]], faceX: [[0, 0], [60, -0.8, "step"], [800, 0, "step"]] },
    pose: {}
  },
  glanceRight: {
    duration: 900,
    tracks: { gazeX: [[0, 0], [60, 1.3, "step"], [800, 0, "step"]], faceX: [[0, 0], [60, 0.8, "step"], [800, 0, "step"]] },
    pose: {}
  }
}
