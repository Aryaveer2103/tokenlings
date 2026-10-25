// Moves: short building blocks other clips `use`. Every one starts and ends
// on the neutral pose, so they chain without popping. Units: grid (1/32 of
// the pet) and degrees; y up is negative.
//
// The principles, explicitly: anticipation (a squash before every jump),
// squash on landing with an overshooting settle (outBack), arcs (rise with
// outQuad, fall with inQuad), follow-through (the topper spring lags every
// vertical move on its own), ease in/out everywhere else.

export default {
  hop: {
    duration: 620,
    tracks: {
      sy: [[0, 1], [90, 0.84, "outQuad"], [200, 1.1, "outQuad"], [390, 1], [450, 0.86, "outQuad"], [580, 1, "outBack"]],
      sx: [[0, 1], [90, 1.12, "outQuad"], [200, 0.92, "outQuad"], [390, 1], [450, 1.1, "outQuad"], [580, 1, "outBack"]],
      y: [[0, 0], [90, 0], [270, -7, "outQuad"], [450, 0, "inQuad"]],
      shadow: [[90, 1], [270, 0.6, "outQuad"], [450, 1, "inQuad"]],
      armL: [[90, 0], [270, 35, "outQuad"], [450, 0]],
      armR: [[90, 0], [270, 35, "outQuad"], [450, 0]]
    }
  },
  hopSmall: {
    duration: 420,
    tracks: {
      sy: [[0, 1], [60, 0.9, "outQuad"], [140, 1.05], [260, 1], [300, 0.92], [410, 1, "outBack"]],
      sx: [[0, 1], [60, 1.06, "outQuad"], [140, 0.96], [260, 1], [300, 1.06], [410, 1, "outBack"]],
      y: [[0, 0], [60, 0], [180, -3.5, "outQuad"], [300, 0, "inQuad"]],
      shadow: [[60, 1], [180, 0.8, "outQuad"], [300, 1, "inQuad"]]
    }
  },
  nod: {
    duration: 380,
    tracks: {
      faceY: [[0, 0], [120, 1.3, "outQuad"], [260, 0, "inOutQuad"]],
      sy: [[0, 1], [120, 0.96, "outQuad"], [260, 1]],
      rot: [[0, 0], [120, 2], [260, 0]]
    }
  },
  perk: {
    duration: 420,
    tracks: {
      sy: [[0, 1], [70, 0.94, "outQuad"], [180, 1.07, "outQuad"], [420, 1, "outBack"]],
      sx: [[0, 1], [70, 1.05], [180, 0.96], [420, 1, "outBack"]],
      y: [[0, 0], [70, 0], [180, -1.2, "outQuad"], [330, 0, "inQuad"]]
    }
  },
  wave: {
    duration: 1000,
    tracks: {
      armR: [[0, 0], [160, 125, "outBack"], [320, 95], [480, 125], [640, 95], [800, 120], [1000, 0, "inOutQuad"]],
      rot: [[0, 0], [160, -3], [800, -3], [1000, 0]]
    }
  },
  waveBoth: {
    duration: 900,
    tracks: {
      armR: [[0, 0], [150, 130, "outBack"], [300, 100], [450, 130], [600, 100], [900, 0]],
      armL: [[0, 0], [150, 100, "outBack"], [300, 130], [450, 100], [600, 130], [900, 0]]
    }
  },
  spin: {
    duration: 440,
    tracks: {
      sx: [[0, 1], [110, 0.12, "inQuad"], [220, 1, "outQuad"], [330, 0.12, "inQuad"], [440, 1, "outQuad"]],
      dir: [[0, 1], [110, -1, "step"], [330, 1, "step"]]
    }
  },
  bow: {
    duration: 1000,
    tracks: {
      sy: [[0, 1], [280, 0.86, "inOutQuad"], [640, 0.86], [900, 1, "outBack"]],
      faceY: [[0, 0], [280, 2.4], [640, 2.4], [900, 0]],
      rot: [[0, 0], [280, 3], [640, 3], [900, 0]],
      armL: [[0, 0], [280, -20], [640, -20], [900, 0]],
      armR: [[0, 0], [280, -20], [640, -20], [900, 0]]
    },
    set: [[220, { eyes: "closed" }], [700, { eyes: "open" }]]
  },
  stretch: {
    duration: 1300,
    tracks: {
      sy: [[0, 1], [150, 0.9, "outQuad"], [600, 1.18, "inOutQuad"], [900, 1.18], [1150, 0.95], [1300, 1, "outBack"]],
      sx: [[0, 1], [150, 1.08], [600, 0.9], [900, 0.9], [1150, 1.04], [1300, 1]],
      armL: [[0, 0], [600, 155, "inOutQuad"], [900, 155], [1150, 0]],
      armR: [[0, 0], [600, 155, "inOutQuad"], [900, 155], [1150, 0]]
    },
    set: [[300, { eyes: "closed", mouth: "yawn" }], [1050, { eyes: "open", mouth: "base" }]]
  },
  shakeOff: {
    duration: 640,
    tracks: {
      rot: [[0, 0], [80, -8], [160, 8], [240, -7], [320, 6], [400, -4], [480, 2], [640, 0]],
      x: [[0, 0], [80, -0.6], [160, 0.6], [240, -0.5], [320, 0.4], [480, 0], [640, 0]],
      sy: [[0, 1], [80, 0.96], [480, 0.96], [640, 1]]
    }
  },
  lookAround: {
    duration: 1600,
    tracks: {
      gazeX: [[0, 0], [100, -1.2, "step"], [700, 1.2, "step"], [1300, 0, "step"]],
      faceX: [[0, 0], [100, -0.7, "step"], [700, 0.7, "step"], [1300, 0, "step"]],
      dir: [[0, 1], [100, -1, "step"], [700, 1, "step"]]
    }
  },
  land: {
    duration: 360,
    tracks: {
      sy: [[0, 1], [60, 0.8, "outQuad"], [360, 1, "outBack"]],
      sx: [[0, 1], [60, 1.16, "outQuad"], [360, 1, "outBack"]]
    },
    fx: [[40, { kind: "dust", n: 3, at: "feet", spread: [4, 0.5], v: [0, -3], vspread: [7, 2], life: 520, grow: 0.6 }]]
  },
  flip: {
    duration: 900,
    tracks: {
      sy: [[0, 1], [140, 0.8, "outQuad"], [260, 1.12, "outQuad"], [700, 1], [740, 0.82, "outQuad"], [900, 1, "outBack"]],
      sx: [[0, 1], [140, 1.14], [260, 0.92], [700, 1], [740, 1.14], [900, 1, "outBack"]],
      y: [[0, 0], [140, 0], [420, -11, "outQuad"], [700, 0, "inQuad"]],
      rot: [[0, 0], [200, 0], [620, -360, "inOutQuad"], [621, 0, "step"]],
      shadow: [[140, 1], [420, 0.5], [700, 1]]
    }
  },
  scoot: {
    duration: 600,
    tracks: {
      x: [[0, 0], [300, 2.5, "inOutQuad"], [600, 0, "inOutQuad"]],
      sy: [[0, 1], [150, 0.96], [300, 1], [450, 0.96], [600, 1]]
    }
  },
  sway: {
    duration: 1600,
    tracks: { rot: [[0, 0], [400, -4], [1200, 4], [1600, 0]] }
  },
  flutter: {
    duration: 520,
    set: [[0, { eyes: "closed" }], [160, { eyes: "sleepy" }], [240, { eyes: "closed" }], [340, { eyes: "open" }]]
  }
}
