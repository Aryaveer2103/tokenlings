// Roaming clips (§4.4 F) and drag/fling (§4.4 B): the in-place half of a
// trip. Where the pet goes is the scene's offsets (core/roam.mjs); these only
// say how it looks on the way: hops onto pills, zoomies, skids, sitting on an
// edge, leaps, the parachute, climbing, tumbling through the air.
const sway = (period, deg) => [[0, -deg], [period / 2, deg, "step"]]

export default {
  // hop onto (or off) a pill while walking: the offset carries the pet across
  hopRight: {
    duration: 620,
    tracks: { dir: [[0, 1]] },
    use: [[0, "hop"]],
    set: [[0, { eyes: "happy" }], [520, { eyes: "open" }]],
    pose: { dir: 1 }
  },
  hopLeft: {
    duration: 620,
    tracks: { dir: [[0, -1]] },
    use: [[0, "hop"]],
    set: [[0, { eyes: "happy" }], [520, { eyes: "open" }]],
    pose: { dir: -1 }
  },
  // zoomies: a fast lap with speed lines and dust
  zoomRight: {
    loop: true, step: 83, duration: 332,
    tracks: { dir: [[0, 1]], sy: [[0, 1.05], [166, 0.9, "step"]], sx: [[0, 0.96], [166, 1.06, "step"]], rot: [[0, 12]], armL: [[0, 80], [166, -30, "step"]], armR: [[0, -30], [166, 80, "step"]], y: [[0, 0], [83, -2, "step"], [166, 0, "step"], [249, -2, "step"]] },
    set: [[0, { eyes: "squint", mouth: "tongue" }]],
    fx: [[0, { kind: "speed", n: 1, at: [4, 18], spread: [1, 5], v: [-30, 0], life: 260, mirror: true }],
         [166, { kind: "dust", n: 1, at: "feet", spread: [1, 0.3], v: [-10, -2], life: 380, grow: 0.6, mirror: true }]],
    pose: { dir: 1, rot: 12, eyes: "squint" }
  },
  zoomLeft: {
    loop: true, step: 83, duration: 332,
    tracks: { dir: [[0, -1]], sy: [[0, 1.05], [166, 0.9, "step"]], sx: [[0, 0.96], [166, 1.06, "step"]], rot: [[0, -12]], armL: [[0, 80], [166, -30, "step"]], armR: [[0, -30], [166, 80, "step"]], y: [[0, 0], [83, -2, "step"], [166, 0, "step"], [249, -2, "step"]] },
    set: [[0, { eyes: "squint", mouth: "tongue" }]],
    fx: [[0, { kind: "speed", n: 1, at: [28, 18], spread: [1, 5], v: [-30, 0], life: 260, mirror: true }],
         [166, { kind: "dust", n: 1, at: "feet", spread: [1, 0.3], v: [-10, -2], life: 380, grow: 0.6, mirror: true }]],
    pose: { dir: -1, rot: -12, eyes: "squint" }
  },
  // a skidding stop at the end of a lap (facing the way it was running)
  skidRight: {
    duration: 460,
    tracks: { dir: [[0, 1]], rot: [[0, 12], [120, -14, "outQuad"], [460, 0, "outBack"]], sx: [[0, 1], [120, 1.14, "outQuad"], [460, 1, "outBack"]], sy: [[0, 1], [120, 0.86, "outQuad"], [460, 1, "outBack"]] },
    set: [[0, { eyes: "wide", mouth: "o" }], [400, { eyes: "open", mouth: "grin" }]],
    fx: [[40, { kind: "dust", n: 4, at: "feet", spread: [3, 0.4], v: [10, -4], vspread: [6, 3], life: 520, grow: 0.7, mirror: true }]],
    pose: { dir: 1, eyes: "wide" }
  },
  skidLeft: {
    duration: 460,
    tracks: { dir: [[0, -1]], rot: [[0, -12], [120, 14, "outQuad"], [460, 0, "outBack"]], sx: [[0, 1], [120, 1.14, "outQuad"], [460, 1, "outBack"]], sy: [[0, 1], [120, 0.86, "outQuad"], [460, 1, "outBack"]] },
    set: [[0, { eyes: "wide", mouth: "o" }], [400, { eyes: "open", mouth: "grin" }]],
    fx: [[40, { kind: "dust", n: 4, at: "feet", spread: [3, 0.4], v: [10, -4], vspread: [6, 3], life: 520, grow: 0.7, mirror: true }]],
    pose: { dir: -1, eyes: "wide" }
  },
  // out of breath after the zoomies
  pant: {
    duration: 1500,
    tracks: { sy: [[0, 1], [250, 0.95, "step"], [500, 1.02, "step"], [750, 0.95, "step"], [1000, 1.02, "step"], [1250, 1, "step"]] },
    set: [[0, { eyes: "happy", mouth: "tongue" }], [1400, { eyes: "open", mouth: "base" }]],
    fx: [[200, { kind: "sweat", n: 1, at: [24, 9], v: [3, 2], g: 30, life: 700 }]],
    pose: { eyes: "happy", mouth: "tongue" }
  },
  // sits on the edge below it (the bar's, a pill's), legs over, swinging
  perchSit: {
    duration: 3800,
    tracks: {
      perch: [[0, 0], [140, -0.06, "outQuad"], [460, 1, "outBack"], [3300, 1], [3650, 0, "inOutQuad"]],
      rot: [[460, 0], [700, -3, "step"], [950, 3, "step"], [1200, -3, "step"], [1450, 3, "step"], [2600, -3, "step"], [2850, 3, "step"], [3100, 0, "step"]],
      armL: [[300, 0], [520, -25], [3250, -25], [3550, 0]], armR: [[300, 0], [520, -25], [3250, -25], [3550, 0]],
      gazeY: [[460, 0], [600, 0.6, "step"], [3200, 0, "step"]]
    },
    use: [[1500, "lookAround"]],
    set: [[0, { eyes: "open", mouth: "smile" }], [3300, { mouth: "base" }]],
    pose: { perch: 1, mouth: "smile" }
  },
  // sitting down on a window's edge to watch you (held until the scene moves on)
  sitDown: {
    duration: 460, endPose: true,
    tracks: { perch: [[0, 0], [140, -0.06, "outQuad"], [460, 1, "outBack"]], armL: [[0, 0], [400, -25]], armR: [[0, 0], [400, -25]] },
    pose: { perch: 1 }
  },
  watch: {
    loop: true, step: 250, duration: 3000,
    tracks: {
      perch: [[0, 1]], armL: [[0, -25]], armR: [[0, -25]], gazeY: [[0, 0.7]], faceY: [[0, 0.4]],
      rot: [[0, 0], [1000, -3, "step"], [1250, 3, "step"], [1500, -3, "step"], [1750, 0, "step"]]
    },
    set: [[0, { eyes: "open", mouth: "smile" }]],
    pose: { perch: 1, mouth: "smile" }
  },
  standUp: {
    duration: 420,
    tracks: { perch: [[0, 1], [320, 0, "inOutQuad"]], armL: [[0, -25], [300, 0]], armR: [[0, -25], [300, 0]], sy: [[260, 1], [320, 0.92], [420, 1, "outBack"]] },
    pose: {}
  },
  // a leap (off the bar, onto a window, back up): the offset's arc carries it
  // from 180 to 720 ms; crouch before, squash after
  leapRight: {
    duration: 900,
    tracks: {
      dir: [[0, 1]],
      sy: [[0, 1], [170, 0.8, "outQuad"], [260, 1.14, "outQuad"], [700, 1.04], [740, 0.8, "outQuad"], [900, 1, "outBack"]],
      sx: [[0, 1], [170, 1.14], [260, 0.9], [700, 0.98], [740, 1.16], [900, 1, "outBack"]],
      armL: [[170, 0], [300, 140, "outBack"], [680, 140], [740, 0]], armR: [[170, 0], [300, 140, "outBack"], [680, 140], [740, 0]],
      shadow: [[170, 1], [300, 0.6], [700, 0.6], [740, 1]]
    },
    set: [[0, { eyes: "open" }], [200, { eyes: "wide", mouth: "grin" }], [760, { eyes: "happy" }], [880, { eyes: "open", mouth: "base" }]],
    fx: [[720, { kind: "dust", n: 3, at: "feet", spread: [4, 0.5], v: [0, -3], vspread: [7, 2], life: 520, grow: 0.6 }]],
    pose: { dir: 1, eyes: "wide" }
  },
  leapLeft: {
    duration: 900,
    tracks: {
      dir: [[0, -1]],
      sy: [[0, 1], [170, 0.8, "outQuad"], [260, 1.14, "outQuad"], [700, 1.04], [740, 0.8, "outQuad"], [900, 1, "outBack"]],
      sx: [[0, 1], [170, 1.14], [260, 0.9], [700, 0.98], [740, 1.16], [900, 1, "outBack"]],
      armL: [[170, 0], [300, 140, "outBack"], [680, 140], [740, 0]], armR: [[170, 0], [300, 140, "outBack"], [680, 140], [740, 0]],
      shadow: [[170, 1], [300, 0.6], [700, 0.6], [740, 1]]
    },
    set: [[0, { eyes: "open" }], [200, { eyes: "wide", mouth: "grin" }], [760, { eyes: "happy" }], [880, { eyes: "open", mouth: "base" }]],
    fx: [[720, { kind: "dust", n: 3, at: "feet", spread: [4, 0.5], v: [0, -3], vspread: [7, 2], life: 520, grow: 0.6 }]],
    pose: { dir: -1, eyes: "wide" }
  },
  // its window moved or closed: down it floats
  parachute: {
    loop: true, step: 250, duration: 2000,
    tracks: { rot: sway(1000, 6), sy: [[0, 1.04]], shadow: [[0, 0.5]] },
    set: [[0, { hand: "parachute", eyes: "wide", mouth: "o" }], [1000, { eyes: "happy", mouth: "smile" }]],
    pose: { hand: "parachute", eyes: "wide" }
  },
  // climbing back up to the bar
  climb: {
    loop: true, step: 125, duration: 500,
    tracks: { armL: [[0, 150], [250, 70, "step"]], armR: [[0, 70], [250, 150, "step"]], sy: [[0, 1.06], [250, 1.02, "step"]], rot: [[0, -2], [250, 2, "step"]], shadow: [[0, 0]] },
    set: [[0, { eyes: "squint", mouth: "flat" }]],
    pose: { armL: 150, armR: 70, eyes: "squint" }
  },
  // flung: tumbling through the air
  tumble: {
    loop: true, step: 83, duration: 664,
    tracks: { armL: [[0, 150], [166, 40, "step"], [332, 150, "step"], [498, 40, "step"]], armR: [[0, 40], [166, 150, "step"], [332, 40, "step"], [498, 150, "step"]], sy: [[0, 1.08], [332, 0.96, "step"]] },
    set: [[0, { eyes: "wide", mouth: "o" }]],
    pose: { eyes: "wide", mouth: "o", armL: 150, armR: 150 }
  },
  // flung into the end of the bar
  bonk: {
    duration: 600,
    tracks: { sx: [[0, 1], [60, 0.7, "outQuad"], [600, 1, "outBack"]], sy: [[0, 1], [60, 1.18, "outQuad"], [600, 1, "outBack"]] },
    set: [[0, { eyes: "x", mouth: "o", over: "bang" }], [420, { over: "" }], [560, { eyes: "open", mouth: "base" }]],
    fx: [[30, { kind: "star", n: 3, at: "head", spread: [3, 2], v: [0, -8], vspread: [8, 3], life: 600, spin: 300 }]],
    pose: { eyes: "x", over: "bang" }
  },
  // a hard landing: dizzy for a moment, then shakes it off
  dizzyLand: {
    duration: 2100,
    use: [[0, "land"], [1500, "shakeOff"]],
    tracks: { rot: [[360, 0], [500, -6], [700, 6], [900, -5], [1100, 5], [1300, 0]] },
    set: [[0, { eyes: "dizzy", mouth: "wavy", over: "dizzy1" }], [350, { over: "dizzy2" }], [700, { over: "dizzy1" }], [1050, { over: "dizzy2" }], [1400, { over: "", eyes: "squint" }], [2000, { eyes: "open", mouth: "base" }]],
    fx: [[60, { kind: "star", n: 3, at: "head", spread: [4, 1], v: [0, -5], vspread: [7, 2], life: 900, spin: 240 }]],
    pose: { eyes: "dizzy", over: "dizzy1", mouth: "wavy" }
  },
  // a soft landing from a toss
  landSoft: {
    duration: 520,
    use: [[0, "land"]],
    set: [[0, { eyes: "happy", mouth: "grin" }], [460, { eyes: "open", mouth: "base" }]],
    pose: { eyes: "happy" }
  }
}
