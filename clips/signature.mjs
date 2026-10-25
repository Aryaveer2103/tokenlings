// Signature moves (double-click) and the other moves in each form's set.
// Affectionate parodies of each base form's personality (see forms/forms.mjs).
export default {
  // Ember: considered bow-and-spin — checks first, bows, spins, bows again.
  bowAndSpin: {
    duration: 3600,
    use: [[0, "lookAround"], [1500, "bow"], [2500, "spin"], [2950, "hopSmall"]],
    set: [[2500, { eyes: "happy", mouth: "smile" }], [3450, { eyes: "open", mouth: "base" }]],
    fx: [[2950, { kind: "sparkle", n: 3, at: "head", spread: [5, 2], v: [0, -6], vspread: [5, 3], life: 700, spin: 160 }]],
    pose: { eyes: "happy" }
  },
  // Slate: moonwalk into a launch pose with a confetti cannon.
  moonwalkLaunch: {
    duration: 4000,
    tracks: {
      dir: [[0, -1], [2000, 1, "step"]],
      x: [[0, 0], [1800, 6, "linear"], [2000, 6], [3700, 0, "inOutQuad"]],
      sy: [[0, 1], [225, 0.95, "step"], [450, 1, "step"], [675, 0.95, "step"], [900, 1, "step"], [1125, 0.95, "step"], [1350, 1, "step"], [1575, 0.95, "step"], [1800, 1, "step"]],
      rot: [[0, 0], [225, -3, "step"], [450, 0, "step"], [675, -3, "step"], [900, 0, "step"], [1125, -3, "step"], [1350, 0, "step"], [1575, -3, "step"], [1800, 0, "step"], [2100, -8, "outBack"], [3300, -8], [3700, 0]],
      propRot: [[2300, 0], [2500, -6], [2600, 8, "outQuad"], [2900, 0]]
    },
    set: [[0, { eyes: "squint", mouth: "smirk" }], [2000, { hand: "confettiCannon", eyes: "open" }], [2600, { eyes: "star", mouth: "grin" }], [3600, { hand: "", eyes: "open", mouth: "base" }]],
    fx: [[2600, { kinds: ["confettiA", "confettiB", "confettiC", "confettiD"], n: 12, at: [26, 10], spread: [1, 1], v: [12, -28], vspread: [10, 8], g: 60, life: 1400, spin: 360 }]],
    pose: { hand: "confettiCannon", eyes: "star" }
  },
  // Prism: a big yawn, lies down, a lazy roll, gets up eventually.
  yawnRoll: {
    duration: 4600,
    use: [[0, "stretch"]],
    tracks: {
      rot: [[1300, 0], [1800, -85, "inOutQuad"], [2600, -445, "inOutQuad"], [3400, -445], [3900, -360, "inOutQuad"], [3901, 0, "step"]],
      x: [[1300, 0], [1800, -1], [2600, 4, "inOutQuad"], [3400, 4], [4400, 0, "inOutQuad"]],
      y: [[1300, 0], [1800, 2], [3400, 2], [3900, 0]]
    },
    set: [[1300, { eyes: "closed", mouth: "cat" }], [2700, { over: "zzz2" }], [3400, { over: "", eyes: "sleepy" }], [4400, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "closed", over: "zzz2", rot: -85 }
  },
  // Mochi: unrolls an enormous scroll and reads all of it.
  scrollUnfurl: {
    duration: 5600,
    tracks: {
      gazeX: [[0, 0], [900, -0.4, "step"], [1600, 0.4, "step"], [2300, 0.9, "step"], [3000, 1.3, "step"], [3700, 1.3, "step"], [4600, 0, "step"]],
      faceY: [[0, 0.4]], faceX: [[0, 0], [2300, 0.5, "step"], [4600, 0, "step"]],
      sy: [[0, 1], [4600, 1], [4800, 1.06], [5200, 1]]
    },
    set: [[0, { hand: "scroll", eyes: "open" }], [700, { hand: "giantScroll", eyes: "wide", mouth: "o" }], [1200, { eyes: "open", mouth: "base" }],
          [4500, { eyes: "happy", mouth: "smile" }], [5300, { hand: "", eyes: "open", mouth: "base" }]],
    pose: { hand: "giantScroll" }
  },
  // Jinx: shades down, mic in hand, a swaggering strut, the drop (PG).
  micDropStrut: {
    duration: 4200,
    tracks: {
      x: [[0, 0], [400, 0], [2400, 5, "linear"], [4000, 0, "inOutQuad"]],
      rot: [[400, 0], [650, -7, "step"], [900, 7, "step"], [1150, -7, "step"], [1400, 7, "step"], [1650, -7, "step"], [1900, 7, "step"], [2150, -7, "step"], [2400, 0, "step"]],
      sy: [[400, 1], [650, 0.95, "step"], [900, 1, "step"], [1150, 0.95, "step"], [1400, 1, "step"], [1650, 0.95, "step"], [1900, 1, "step"], [2150, 0.95, "step"], [2400, 1, "step"]],
      armR: [[2400, 0], [2600, 120, "outBack"], [2900, 120], [3000, 40, "inQuad"], [3400, 0]],
      dir: [[0, 1], [2400, -1, "step"], [3000, 1, "step"]]
    },
    set: [[0, { hand: "shadesDown", mouth: "smirk" }], [400, { hand: "mic" }], [2950, { hand: "shadesDown", mouth: "grin" }], [3900, { hand: "", mouth: "base" }]],
    fx: [[2950, { kind: "mic", n: 1, at: "hand", v: [0, -4], g: 80, life: 600, spin: 200 }], [3500, { kind: "dust", n: 3, at: "feet", spread: [3, 0.5], v: [0, -4], vspread: [6, 2], life: 500 }]],
    pose: { hand: "shadesDown", mouth: "smirk" }
  },
  // Tide: one move does it — a single kick, the pebble lands just so.
  trickShot: {
    duration: 2600,
    use: [[0, "flip"]],
    tracks: { gazeX: [[900, 0], [1000, 1.3, "step"], [2300, 0, "step"]] },
    set: [[0, { mouth: "flat" }], [1900, { eyes: "happy", mouth: "smile" }], [2500, { eyes: "open", mouth: "base" }]],
    fx: [[420, { kind: "pebble", n: 1, at: "feet", v: [18, -30], g: 70, life: 1500, spin: 500 }],
         [1900, { kind: "sparkle", n: 3, at: [30, 26], spread: [2, 1], v: [0, -6], vspread: [4, 2], life: 600, spin: 160 }]],
    pose: { eyes: "happy" }
  },
  // Shell: glitch-teleport — flickers out, reappears a little way off, back.
  glitchTeleport: {
    duration: 2400,
    tracks: {
      alpha: [[0, 1], [300, 0.4, "step"], [380, 1, "step"], [460, 0.2, "step"], [540, 0, "step"], [900, 0.3, "step"], [980, 1, "step"], [1500, 0.4, "step"], [1580, 0, "step"], [1900, 0.4, "step"], [1980, 1, "step"]],
      x: [[0, 0], [300, 0.8, "step"], [380, -0.6, "step"], [540, 7, "step"], [1580, 0, "step"]],
      sx: [[0, 1], [300, 1.2, "step"], [380, 0.85, "step"], [460, 1, "step"], [900, 1.2, "step"], [980, 1, "step"]]
    },
    set: [[0, { eyes: "squint" }], [980, { eyes: "happy" }], [1400, { eyes: "squint" }], [2100, { eyes: "open" }]],
    fx: [[460, { kind: "pixel", n: 5, at: "head", spread: [6, 6], v: [0, 0], vspread: [8, 8], life: 500 }], [900, { kind: "pixel", n: 4, at: [39, 18], spread: [5, 5], v: [0, 0], vspread: [6, 6], life: 500 }], [1900, { kind: "pixel", n: 4, at: "head", spread: [5, 5], v: [0, 0], vspread: [6, 6], life: 500 }]],
    pose: { eyes: "squint" }
  },
  // Drift: zero-g somersault.
  zeroGSomersault: {
    duration: 3200,
    tracks: {
      y: [[0, 0], [700, -7, "inOutQuad"], [2400, -7], [3100, 0, "inOutQuad"]],
      rot: [[600, 0], [2400, 360, "inOutQuad"], [2401, 0, "step"]],
      shadow: [[0, 1], [700, 0.5], [2400, 0.5], [3100, 1]],
      armL: [[0, 0], [700, 90], [2400, 90], [3000, 0]], armR: [[0, 0], [700, 90], [2400, 90], [3000, 0]]
    },
    set: [[0, { eyes: "happy", mouth: "o" }], [2600, { mouth: "smile" }], [3100, { eyes: "open", mouth: "base" }]],
    fx: [[900, { kind: "sparkle", n: 3, at: "head", spread: [8, 4], v: [0, 0], vspread: [4, 4], life: 900, spin: 90 }]],
    pose: { eyes: "happy", y: -6 }
  },
  // Lyra: twirl.
  twirl: {
    duration: 2000,
    use: [[0, "spin"], [440, "spin"], [880, "spin"], [1320, "hopSmall"]],
    tracks: { armL: [[0, 0], [200, 100], [1300, 100], [1600, 0]], armR: [[0, 0], [200, 100], [1300, 100], [1600, 0]] },
    set: [[0, { eyes: "happy", mouth: "o" }], [1900, { eyes: "open", mouth: "base" }]],
    fx: [[300, { kind: "note", n: 3, at: "head", spread: [6, 2], v: [0, -8], vspread: [8, 3], life: 1100, spin: 60 }]],
    pose: { eyes: "happy", armL: 100, armR: 100 }
  },
  // Bit: hop-spin.
  hopSpin: {
    duration: 1100,
    use: [[0, "hop"], [180, "spin"]],
    set: [[0, { eyes: "happy" }], [1000, { eyes: "open" }]],
    pose: { eyes: "happy" }
  },
  // Shell's set: hands a toolbox to a friend.
  toolHandoff: {
    duration: 2400,
    tracks: { x: [[0, 0], [600, 3, "inOutQuad"], [1600, 3], [2200, 0, "inOutQuad"]], propX: [[600, 0], [900, 2.5, "outBack"], [1500, 2.5], [1600, 0]] },
    set: [[0, { hand: "tools", mouth: "smile" }], [1600, { hand: "", eyes: "happy" }], [2300, { eyes: "open", mouth: "base" }]],
    pose: { hand: "tools" }
  }
}
