// Ambient clips (§4.4 C) and the base forms' idle habits. Sparse: the brain
// plays at most one of these at a time across all pets (two in Show-off).
export default {
  // ---- micro
  glance: {
    duration: 1100,
    tracks: { gazeX: [[0, 0], [60, 1.2, "step"], [900, 0, "step"]], faceX: [[0, 0], [60, 0.6, "step"], [900, 0, "step"]] },
    pose: {}
  },
  earTwitch: {
    duration: 500,
    tracks: { topRot: [[0, 0], [60, 16, "outQuad"], [140, -6], [260, 0]] },
    pose: {}
  },
  headTilt: {
    duration: 1300,
    tracks: { rot: [[0, 0], [180, 7, "outBack"], [1000, 7], [1250, 0]], faceX: [[0, 0], [180, 0.6], [1000, 0.6], [1250, 0]] },
    set: [[180, { mouth: "o" }], [1000, { mouth: "base" }]],
    pose: { rot: 7 }
  },
  scratch: {
    duration: 1300,
    tracks: { armR: [[0, 0], [200, 135, "outBack"], [350, 120], [500, 135], [650, 120], [800, 135], [1100, 0]], rot: [[0, 0], [200, 4], [900, 4], [1100, 0]] },
    set: [[200, { eyes: "squint" }], [1000, { eyes: "open" }]],
    pose: { armR: 130, eyes: "squint" }
  },
  sneeze: {
    duration: 1400,
    tracks: { sy: [[0, 1], [500, 1.1, "inQuad"], [600, 0.84, "outQuad"], [1000, 1, "outBack"]], rot: [[500, 0], [600, 6], [1000, 0]], faceY: [[0, 0], [500, -0.8], [600, 1], [1000, 0]] },
    set: [[0, { eyes: "squint", mouth: "o" }], [600, { eyes: "closed", mouth: "open" }], [1000, { eyes: "open", mouth: "base" }]],
    fx: [[600, { kind: "dust", n: 3, at: "mouth", spread: [1, 0.5], v: [12, 0], vspread: [6, 4], life: 500, grow: 0.8, mirror: true }]],
    pose: { eyes: "squint" }
  },
  hiccup: {
    duration: 1400,
    use: [[0, "hopSmall"], [700, "hopSmall"]],
    set: [[0, { eyes: "wide", mouth: "o" }], [1300, { eyes: "open", mouth: "base" }]],
    fx: [[60, { kind: "bubble", n: 1, at: "mouth", v: [3, -6], life: 700 }], [760, { kind: "bubble", n: 1, at: "mouth", v: [3, -6], life: 700 }]],
    pose: { eyes: "wide" }
  },
  yawn: {
    duration: 1500,
    use: [[0, "stretch"]],
    pose: { eyes: "closed", mouth: "yawn" }
  },

  // ---- bored
  kickPebble: {
    duration: 1500,
    tracks: { rot: [[0, 0], [300, -6, "inQuad"], [420, 8, "outQuad"], [800, 0]], x: [[0, 0], [300, -0.6], [420, 0.8], [800, 0]], gazeX: [[0, 0], [400, 1.2, "step"], [1400, 0, "step"]] },
    set: [[0, { eyes: "open", mouth: "smirk" }], [1400, { mouth: "base" }]],
    fx: [[420, { kind: "pebble", n: 1, at: "feet", v: [24, -16], g: 70, life: 1000, spin: 400, mirror: true }]],
    pose: { mouth: "smirk" }
  },
  juggle: {
    duration: 2400,
    tracks: { armL: [[0, 0], [150, 60], [300, 40, "step"], [600, 60, "step"], [900, 40, "step"], [1200, 60, "step"], [1500, 40, "step"], [1800, 60, "step"], [2100, 0]], armR: [[0, 0], [150, 40], [300, 60, "step"], [600, 40, "step"], [900, 60, "step"], [1200, 40, "step"], [1500, 60, "step"], [1800, 40, "step"], [2100, 0]], gazeY: [[0, -0.8]] },
    set: [[0, { eyes: "up", mouth: "tongue", over: "juggle" }], [2100, { over: "", eyes: "happy" }], [2350, { eyes: "open", mouth: "base" }]],
    pose: { over: "juggle", eyes: "up" }
  },
  yoyo: {
    duration: 2400,
    tracks: { propY: [[0, 0], [300, 4, "outQuad"], [600, 0, "inQuad"], [900, 4, "outQuad"], [1200, 0, "inQuad"], [1500, 4, "outQuad"], [1800, 0, "inQuad"]], gazeY: [[0, 0.8]] },
    set: [[0, { hand: "yoyo", mouth: "smirk" }], [2200, { hand: "", mouth: "base" }]],
    pose: { hand: "yoyo" }
  },
  readScroll: {
    duration: 5200,
    tracks: { gazeX: [[0, -0.8], [800, 0.8, "step"], [1600, -0.8, "step"], [2400, 0.8, "step"], [3200, -0.8, "step"], [4000, 0.8, "step"], [4800, 0, "step"]], gazeY: [[0, 0], [2400, 0.5, "step"]], faceY: [[0, 0.6]] },
    set: [[0, { hand: "scroll", eyes: "open" }], [2600, { mouth: "o" }], [3000, { mouth: "base" }], [5000, { hand: "" }]],
    pose: { hand: "scroll" }
  },
  doodle: {
    duration: 3000,
    tracks: { gazeY: [[0, 0.8]], faceY: [[0, 0.5]], rot: [[0, 0], [500, 2, "step"], [1000, -1, "step"], [1500, 2, "step"], [2000, 0, "step"]] },
    set: [[0, { hand: "doodlePad", mouth: "tongue" }], [2400, { eyes: "happy", mouth: "smile" }], [2900, { hand: "", eyes: "open", mouth: "base" }]],
    pose: { hand: "doodlePad" }
  },
  handheld: {
    duration: 3600,
    tracks: { gazeY: [[0, 0.8]], faceY: [[0, 0.5]], rot: [[0, 0], [400, -4, "step"], [800, 4, "step"], [1200, -3, "step"], [1600, 0, "step"], [2400, 5, "step"], [2600, 0, "step"]] },
    set: [[0, { hand: "handheld", eyes: "open", mouth: "tongue" }], [2400, { eyes: "wide", mouth: "o" }], [2800, { eyes: "happy", mouth: "grin" }], [3400, { hand: "", eyes: "open", mouth: "base" }]],
    pose: { hand: "handheld" }
  },
  balance: {
    duration: 2600,
    tracks: { rot: [[0, 0], [300, 9], [700, 4], [1100, 11], [1500, 5], [1900, 10], [2300, 0]], armL: [[0, 0], [300, 85], [2200, 85], [2500, 0]], armR: [[0, 0], [300, 85], [2200, 85], [2500, 0]], x: [[0, 0], [300, 0.4], [2300, 0]] },
    set: [[0, { mouth: "tongue", eyes: "squint" }], [2300, { mouth: "smile", eyes: "happy" }], [2550, { mouth: "base", eyes: "open" }]],
    pose: { armL: 85, armR: 85, rot: 8 }
  },
  stareClock: {
    duration: 3000,
    tracks: { gazeX: [[0, 1]], gazeY: [[0, -1]], faceX: [[0, 0.5]], faceY: [[0, -0.4]] },
    set: [[0, { over: "clock", eyes: "sleepy", mouth: "flat" }], [2800, { over: "", eyes: "open", mouth: "base" }]],
    pose: { over: "clock", eyes: "sleepy" }
  },
  polish: {
    duration: 2400,
    tracks: { propX: [[0, 0], [200, -1.4, "step"], [400, 0.6, "step"], [600, -1.4, "step"], [800, 0.6, "step"], [1000, -1.4, "step"], [1200, 0.6, "step"], [1400, 0, "step"]], gazeX: [[0, -0.6]], gazeY: [[0, -0.6]] },
    set: [[0, { hand: "cloth", mouth: "tongue" }], [1500, { eyes: "happy", mouth: "smile" }], [2300, { hand: "", eyes: "open", mouth: "base" }]],
    fx: [[1500, { kind: "sparkle", n: 2, at: "head", spread: [4, 1], v: [0, -4], vspread: [3, 2], life: 600, spin: 180, scale: 0.8 }]],
    pose: { hand: "cloth" }
  },
  chaseTail: {
    duration: 2400,
    tracks: { x: [[0, 0], [400, 2], [800, 0], [1200, -2], [1600, 0], [2000, 2], [2400, 0]] },
    use: [[0, "spin"], [500, "spin"], [1000, "spin"], [1500, "spin"]],
    set: [[0, { eyes: "squint", mouth: "grin" }], [2000, { eyes: "dizzy" }], [2350, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "dizzy" }
  },
  blowBubbles: {
    duration: 2600,
    tracks: { sy: [[0, 1], [300, 1.04], [500, 0.98], [900, 1.04], [1100, 0.98], [1500, 1.04], [1700, 1]] },
    set: [[0, { mouth: "o", eyes: "happy" }], [2400, { mouth: "base", eyes: "open" }]],
    fx: [[500, { kind: "bubble", n: 2, at: "mouth", spread: [1, 1], v: [6, -6], vspread: [3, 3], life: 1600, grow: 0.6 }],
         [1100, { kind: "bubble", n: 2, at: "mouth", spread: [1, 1], v: [6, -7], vspread: [3, 3], life: 1600, grow: 0.6 }],
         [1700, { kind: "bubble", n: 1, at: "mouth", spread: [1, 1], v: [5, -5], vspread: [3, 3], life: 1600, grow: 0.6 }]],
    pose: { mouth: "o" }
  },
  // a paper plane that glides off along the bar
  paperPlane: {
    duration: 2000,
    tracks: { armR: [[0, 0], [300, -30], [500, 130, "outQuad"], [900, 130], [1200, 0]], rot: [[0, 0], [300, -4], [500, 5], [900, 0]], gazeX: [[0, 0], [500, 1.3, "step"], [1800, 0, "step"]] },
    set: [[0, { hand: "plane", mouth: "smirk" }], [500, { hand: "", eyes: "happy" }], [1800, { eyes: "open", mouth: "base" }]],
    fx: [[500, { kind: "plane", n: 1, at: "hand", v: [30, -3], g: 2, life: 1800, mirror: true }]],
    pose: { hand: "plane" }
  },
  waveCamera: {
    duration: 1300,
    use: [[0, "wave"]],
    tracks: { gazeY: [[0, 0.7]], faceY: [[0, 0.5]] },
    set: [[0, { eyes: "happy", mouth: "grin" }], [1150, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "happy", armR: 120 }
  },

  // ---- rest
  nodOff: {
    duration: 3600,
    tracks: { faceY: [[0, 0], [1200, 1.6, "inQuad"], [1400, 0, "outBack"], [2600, 1.8, "inQuad"], [2750, 0, "outBack"]], sy: [[0, 1], [1200, 0.94], [1400, 1.02], [2600, 0.94], [2750, 1.02], [3200, 1]] },
    set: [[0, { eyes: "sleepy" }], [800, { eyes: "closed" }], [1400, { eyes: "wide" }], [1700, { eyes: "sleepy" }], [2200, { eyes: "closed" }], [2750, { eyes: "wide" }], [3200, { eyes: "open" }]],
    pose: { eyes: "sleepy" }
  },
  dreamBubble: {
    duration: 4000,
    tracks: { sy: [[0, 1], [400, 0.92]], faceY: [[0, 0], [400, 1]] },
    set: [[0, { eyes: "closed", over: "thought1" }], [700, { over: "heartBubble" }], [1800, { over: "noteBubble" }], [2900, { over: "thought3" }], [3700, { over: "", eyes: "open" }]],
    pose: { eyes: "closed", over: "heartBubble" },
    endPose: false
  },
  rollOver: {
    duration: 2400,
    tracks: { rot: [[0, 0], [500, -24, "inOutQuad"], [1200, -24], [1700, 18, "inOutQuad"], [2000, 18], [2400, 0]], y: [[0, 0], [500, 1], [1700, 1], [2400, 0]] },
    set: [[0, { eyes: "closed" }], [2300, { eyes: "open" }]],
    pose: { eyes: "closed", rot: -20 }
  },
  sleepTalk: {
    duration: 2600,
    set: [[0, { eyes: "closed", mouth: "o", over: "thought1" }], [500, { over: "thought2", mouth: "base" }], [1000, { over: "thought3", mouth: "o" }], [1500, { over: "", mouth: "base" }], [2400, { eyes: "open" }]],
    pose: { eyes: "closed", over: "thought2" }
  },

  // ---- habits of the base forms
  // Ember: checks before jumping, small bows, tidies up after friends
  checkFirst: {
    duration: 2500,
    use: [[0, "lookAround"], [1700, "hopSmall"]],
    set: [[1600, { mouth: "smile" }], [2400, { mouth: "base" }]],
    pose: {}
  },
  smallBow: { duration: 1000, use: [[0, "bow"]], pose: { eyes: "closed" } },
  tidyUp: {
    duration: 3400,
    tracks: { x: [[0, 0], [800, -3], [1600, 2], [2400, -1], [3000, 0]], propRot: [[0, 0], [200, -14, "step"], [400, 10, "step"], [600, -14, "step"], [800, 10, "step"], [1000, -14, "step"], [1200, 10, "step"], [1400, -14, "step"], [1600, 10, "step"], [1800, -14, "step"], [2000, 10, "step"], [2200, 0, "step"]], dir: [[0, -1], [800, 1, "step"], [1600, -1, "step"], [2400, 1, "step"]] },
    set: [[0, { hand: "broom", mouth: "smile" }], [3200, { hand: "", mouth: "base" }]],
    fx: [[300, { kind: "dust", n: 2, at: "feet", spread: [3, 0.5], v: [-6, -3], vspread: [3, 2], life: 600, grow: 0.6, mirror: true }],
         [1300, { kind: "dust", n: 2, at: "feet", spread: [3, 0.5], v: [6, -3], vspread: [3, 2], life: 600, grow: 0.6, mirror: true }],
         [2900, { kind: "sparkle", n: 2, at: "feet", spread: [5, 1], v: [0, -6], vspread: [4, 2], life: 600, spin: 180, scale: 0.7 }]],
    pose: { hand: "broom" }
  },
  // Slate: speed-runs, launch pose
  speedRun: {
    duration: 1800,
    tracks: { x: [[0, 0], [200, -1, "inQuad"], [600, 6, "outQuad"], [700, 6], [1100, -5, "inOutQuad"], [1200, -5], [1600, 0, "inOutQuad"]], dir: [[0, 1], [700, -1, "step"], [1200, 1, "step"]], rot: [[0, 0], [200, 6], [600, 6], [700, -6, "step"], [1100, -6], [1200, 6, "step"], [1600, 0]] },
    set: [[0, { eyes: "squint", mouth: "grin" }], [1600, { eyes: "open", mouth: "base" }]],
    fx: [[250, { kind: "speed", n: 2, at: "feet", spread: [1, 3], v: [-10, 0], life: 400, mirror: true }], [750, { kind: "speed", n: 2, at: "feet", spread: [1, 3], v: [10, 0], life: 400, mirror: true }], [1250, { kind: "dust", n: 2, at: "feet", spread: [2, 0.5], v: [-8, -3], life: 500, mirror: true }]],
    pose: { eyes: "squint" }
  },
  launchPose: {
    duration: 2000,
    tracks: { rot: [[0, 0], [300, -8, "outBack"], [1600, -8], [1900, 0]], propRot: [[0, 0], [600, -6], [700, 8, "outQuad"], [1000, 0]] },
    set: [[0, { hand: "confettiCannon", eyes: "open", mouth: "smirk" }], [700, { eyes: "star", mouth: "grin" }], [1800, { hand: "", eyes: "open", mouth: "base" }]],
    fx: [[700, { kinds: ["confettiA", "confettiB", "confettiC", "confettiD"], n: 10, at: [26, 10], spread: [1, 1], v: [14, -26], vspread: [10, 8], g: 60, life: 1300, spin: 360, mirror: true }]],
    pose: { hand: "confettiCannon", eyes: "star" }
  },
  // Prism: naps mid-task, sloth stretch, hammock idle
  hammockNap: {
    loop: true, step: 250, duration: 4000,
    tracks: { lift: [[0, -2]], rot: [[0, -3], [2000, 3, "inOutQuad"], [4000, -3, "inOutQuad"]], sy: [[0, 0.92]], sx: [[0, 1.06]], faceY: [[0, 1]] },
    set: [[0, { seat: "hammock", eyes: "closed", mouth: "cat", over: "zzz1" }], [1300, { over: "zzz2" }], [2600, { over: "zzz3" }]],
    pose: { seat: "hammock", eyes: "closed", over: "zzz2", lift: -2 }
  },
  slothStretch: {
    duration: 4200,
    tracks: {
      sy: [[0, 1], [1600, 1.16, "inOutQuad"], [2600, 1.16], [3800, 1, "inOutQuad"]], sx: [[0, 1], [1600, 0.92], [2600, 0.92], [3800, 1]],
      armL: [[0, 0], [1600, 160, "inOutQuad"], [2600, 160], [3800, 0, "inOutQuad"]], armR: [[0, 0], [1700, 150, "inOutQuad"], [2600, 150], [3800, 0, "inOutQuad"]],
      rot: [[0, 0], [2000, -5], [2600, 3], [3800, 0]]
    },
    set: [[0, { eyes: "sleepy" }], [1200, { eyes: "closed", mouth: "yawn" }], [3000, { mouth: "base" }], [3700, { eyes: "sleepy" }], [4100, { eyes: "open" }]],
    pose: { eyes: "closed", mouth: "yawn", armL: 150, armR: 150 }
  },
  // Jinx: raspberry, shades flip
  raspberry: {
    duration: 1500,
    tracks: { sy: [[0, 1], [200, 1.05, "outBack"], [1100, 1.05], [1400, 1]], rot: [[0, 0], [200, -5], [400, 5], [600, -5], [800, 5], [1100, 0]] },
    set: [[0, { eyes: "squint", mouth: "raspberry" }], [1300, { eyes: "open", mouth: "smirk" }], [1480, { mouth: "base" }]],
    fx: [[300, { kind: "dot", n: 3, at: "mouth", spread: [0.5, 0.5], v: [10, -2], vspread: [5, 4], life: 400, scale: 0.6, mirror: true }]],
    pose: { eyes: "squint", mouth: "raspberry" }
  },
  shadesFlip: {
    duration: 2200,
    tracks: { rot: [[0, 0], [400, -6, "outBack"], [1800, -6], [2100, 0]], topRot: [[0, 0], [300, -12], [400, 0]] },
    set: [[0, { mouth: "smirk" }], [350, { hand: "shadesDown" }], [1900, { hand: "" }], [2150, { mouth: "base" }]],
    fx: [[400, { kind: "sparkle", n: 1, at: "eyes", spread: [3, 0.5], v: [3, -3], life: 500, spin: 200, scale: 0.8 }]],
    pose: { hand: "shadesDown", mouth: "smirk" }
  },
  // Tide: minimal moves that still land
  minimalTrick: {
    duration: 1600,
    tracks: { rot: [[0, 0], [250, -5, "inQuad"], [350, 6, "outQuad"], [600, 0]], gazeX: [[0, 0], [350, 1.2, "step"], [1300, 0, "step"]] },
    set: [[0, { mouth: "flat" }], [1100, { eyes: "happy", mouth: "smile" }], [1500, { eyes: "open", mouth: "base" }]],
    fx: [[350, { kind: "pebble", n: 1, at: "feet", v: [16, -26], g: 80, life: 900, spin: 300, mirror: true }],
         [1150, { kind: "sparkle", n: 1, at: "head", spread: [1, 1], v: [0, -4], life: 500, spin: 120, scale: 0.7 }]],
    pose: { eyes: "happy" }
  },
  // Shell: tinkers, glitch-blinks
  tinker: {
    duration: 2800,
    tracks: { gazeY: [[0, 0.8]], faceY: [[0, 0.5]], sy: [[0, 1], [300, 0.97, "step"], [600, 1, "step"], [900, 0.97, "step"], [1200, 1, "step"], [1500, 0.97, "step"], [1800, 1, "step"]] },
    set: [[0, { hand: "tools", mouth: "tongue" }], [2200, { eyes: "happy", mouth: "smile" }], [2700, { hand: "", eyes: "open", mouth: "base" }]],
    fx: [[600, { kind: "sparkle", n: 1, at: "hand", v: [-3, -6], vspread: [3, 2], life: 400, spin: 200, scale: 0.6 }], [1500, { kind: "sparkle", n: 1, at: "hand", v: [3, -6], vspread: [3, 2], life: 400, spin: 200, scale: 0.6 }]],
    pose: { hand: "tools" }
  },
  glitchBlink: {
    duration: 900,
    tracks: { alpha: [[0, 1], [80, 0.35, "step"], [160, 1, "step"], [240, 0.5, "step"], [320, 1, "step"]], x: [[0, 0], [80, 0.8, "step"], [160, -0.6, "step"], [240, 0.4, "step"], [320, 0, "step"]] },
    fx: [[80, { kind: "pixel", n: 3, at: "head", spread: [6, 4], v: [0, 0], vspread: [6, 6], life: 400 }]],
    pose: {}
  },
  // Drift: floats, dreams
  floatDrift: {
    duration: 4000,
    tracks: { y: [[0, 0], [1000, -3, "inOutQuad"], [2000, -1, "inOutQuad"], [3000, -3.5, "inOutQuad"], [4000, 0, "inOutQuad"]], x: [[0, 0], [2000, 2, "inOutQuad"], [4000, 0, "inOutQuad"]], shadow: [[0, 1], [1000, 0.8], [2000, 0.9], [3000, 0.75], [4000, 1]], rot: [[0, 0], [2000, 5], [4000, 0]] },
    set: [[0, { eyes: "sleepy", mouth: "smile" }], [3800, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "sleepy", y: -2 }
  },
  // Lyra: hums, dances
  hum: {
    duration: 3000,
    use: [[0, "sway"], [1500, "sway"]],
    set: [[0, { eyes: "closed", mouth: "o" }], [2900, { eyes: "open", mouth: "base" }]],
    fx: [[200, { kind: "note", n: 1, at: "head", spread: [3, 1], v: [6, -7], vspread: [3, 2], life: 1200, spin: 30 }], [1200, { kind: "note", n: 1, at: "head", spread: [3, 1], v: [-6, -7], vspread: [3, 2], life: 1200, spin: 30 }], [2200, { kind: "note", n: 1, at: "head", spread: [3, 1], v: [6, -7], vspread: [3, 2], life: 1200, spin: 30 }]],
    pose: { eyes: "closed", over: "noteBubble" }
  },
  dance: {
    duration: 2800,
    tracks: {
      rot: [[0, 0], [175, -8, "step"], [350, 8, "step"], [525, -8, "step"], [700, 8, "step"], [875, -8, "step"], [1050, 8, "step"], [1225, -8, "step"], [1400, 0, "step"]],
      armL: [[0, 0], [175, 120, "step"], [350, 20, "step"], [525, 120, "step"], [700, 20, "step"], [875, 120, "step"], [1050, 20, "step"], [1400, 0, "step"]],
      armR: [[0, 0], [175, 20, "step"], [350, 120, "step"], [525, 20, "step"], [700, 120, "step"], [875, 20, "step"], [1050, 120, "step"], [1400, 0, "step"]]
    },
    use: [[1400, "hop"], [2050, "spin"]],
    set: [[0, { eyes: "happy", mouth: "grin" }], [2700, { eyes: "open", mouth: "base" }]],
    fx: [[300, { kind: "note", n: 2, at: "head", spread: [5, 1], v: [0, -8], vspread: [6, 2], life: 1100, spin: 40 }]],
    pose: { eyes: "happy", armL: 120 }
  }
}
