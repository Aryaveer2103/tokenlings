// Base forms: where every pet starts, one per provider family. Colour and
// behaviour nods only — no logos, marks, mascots or brand shapes, and the
// names are invented. (Notes on what each one avoids are next to it.)
//
// Each form's personality is an affectionate parody of how its company is
// seen to work, never of a real person:
//   hero        the one piece that makes the form recognisable at bar size
//   habits      idle clips it reaches for (weights), see clips/ambient.mjs
//   moves       its signature move first, then the moves in its set
//   evolution   its evolved form (assets/parts/evolutions.mjs)

export const FORMS = {
  // Thoughtful and polite: checks before jumping, bows, tidies up after friends.
  // Avoids: any star / burst shape (the Claude mark is a starburst).
  ember: {
    label: "Ember",
    hero: "curl",
    look: { body: "dumpling", eyes: "dot", mouth: "smile", topper: "curl", accessories: [], pattern: "bellyPatch",
            palette: { body: "#E8714A", shade: "#B9472A", light: "#FFD9BE", accent: "#FFB347", cheek: "#FF7F6E", eye: "#2B1410" } },
    personality: { energy: 0.45, sociability: 0.7, mischief: 0.15, sleepiness: 0.35 },
    habits: { tidyUp: 3, checkFirst: 2, smallBow: 2, readScroll: 1, polish: 1 },
    moves: ["bowAndSpin", "tidyUp"],
    evolution: "inferno"
  },
  // Ships fast and confident: speed-runs, launch pose with a confetti cannon.
  // Avoids: hexagonal / knot shapes.
  slate: {
    label: "Slate",
    hero: "roundGlasses",
    look: { body: "roundBlob", eyes: "dot", mouth: "smirk", topper: "none", accessories: ["roundGlasses"], pattern: "bellyPatch",
            palette: { body: "#3E4654", shade: "#262C36", light: "#F2F2EC", accent: "#4FE3B0", cheek: "#F08A9A", eye: "#F7F7F2" } },
    personality: { energy: 0.9, sociability: 0.5, mischief: 0.3, sleepiness: 0.15 },
    habits: { speedRun: 3, launchPose: 1, stareClock: 1, juggle: 1 },
    moves: ["moonwalkLaunch", "speedRun"],
    evolution: "cyber"
  },
  // Laid-back and a bit lazy: naps mid-task, sloth stretches, hammock idle.
  // Avoids: four-pointed sparkles (the Gemini mark); its stars have five points.
  prism: {
    label: "Prism",
    hero: "sleepMask",
    look: { body: "tallBlob", eyes: "starry", mouth: "cat", topper: "none", accessories: ["sleepMask"], pattern: "gradient",
            palette: { body: "#5B7CFF", shade: "#3D52D6", light: "#E3E8FF", accent: "#A35CFF", cheek: "#FF8AD0", eye: "#15123A" } },
    personality: { energy: 0.25, sociability: 0.6, mischief: 0.25, sleepiness: 0.95 },
    habits: { hammockNap: 3, slothStretch: 2, nodOff: 3, yawn: 2 },
    moves: ["yawnRoll", "hammockNap"],
    evolution: "nebula"
  },
  // Patient long-reader: unrolls an enormous scroll and reads all of it.
  // Avoids: letterforms.
  mochi: {
    label: "Mochi",
    hero: "crescentClip",
    look: { body: "mochiCube", eyes: "sleepy", mouth: "cat", topper: "crescentClip", accessories: ["backpack"], pattern: "none",
            palette: { body: "#FAF8F2", shade: "#D6D2EA", light: "#FFFFFF", accent: "#4A4FD8", cheek: "#FF9DB5", eye: "#24245A" } },
    personality: { energy: 0.3, sociability: 0.45, mischief: 0.1, sleepiness: 0.6 },
    habits: { readScroll: 4, yawn: 1, slothStretch: 1 },
    moves: ["scrollUnfurl", "readScroll"],
    evolution: "moonlit"
  },
  // Funky, blunt and brash: sunglasses, cheeky raspberry, interrupts friends,
  // mic-drop. Kept PG.
  // Avoids: slashes and voids.
  jinx: {
    label: "Jinx",
    hero: "shades",
    look: { body: "bean", eyes: "dot", mouth: "smirk", topper: "cowlick", accessories: ["shades"], pattern: "none",
            palette: { body: "#1A1A20", shade: "#34343E", light: "#5A5A6A", accent: "#FF4FA3", cheek: "#FF4FA3", eye: "#F7F7F2" } },
    personality: { energy: 0.8, sociability: 0.8, mischief: 0.95, sleepiness: 0.2 },
    habits: { raspberry: 3, shadesFlip: 2, yoyo: 1, kickPebble: 1 },
    moves: ["micDropStrut", "raspberry"],
    evolution: "neon"
  },
  // Frugal and efficient: does more with less; minimal moves that still land.
  // Avoids: whale shapes (the DeepSeek mark); a droplet, not a fish.
  tide: {
    label: "Tide",
    hero: "waveFringe",
    look: { body: "droplet", eyes: "anime", mouth: "o", topper: "waveFringe", accessories: [], pattern: "bellyPatch",
            palette: { body: "#2563C9", shade: "#1A4796", light: "#9CDBFF", accent: "#3EE6F0", cheek: "#FF8FB8", eye: "#0B1733" } },
    personality: { energy: 0.35, sociability: 0.4, mischief: 0.3, sleepiness: 0.3 },
    habits: { minimalTrick: 3, blowBubbles: 2, balance: 1 },
    moves: ["trickShot", "minimalTrick"],
    evolution: "abyss"
  },
  // Open-source tinkerer: hands tools to friends, glitch-teleports.
  // Avoids: letterforms; the only nod is a terminal caret.
  shell: {
    label: "Shell",
    hero: "caret",
    look: { body: "mochiCube", eyes: "caret", mouth: "flat", topper: "none", accessories: [], pattern: "scanlines",
            palette: { body: "#15181D", shade: "#262B33", light: "#3A4250", accent: "#3FE07F", cheek: "#7A4A5A", eye: "#3FE07F" } },
    personality: { energy: 0.5, sociability: 0.75, mischief: 0.45, sleepiness: 0.3 },
    habits: { tinker: 3, glitchBlink: 2, doodle: 1 },
    moves: ["glitchTeleport", "toolHandoff"],
    evolution: "glitch"
  },
  // Dreamy and floaty: always levitates.
  drift: {
    label: "Drift",
    hero: "orbitRing",
    look: { body: "ghosty", eyes: "lash", mouth: "smile", topper: "none", accessories: ["orbitRing"], pattern: "none",
            palette: { body: "#B29CFF", shade: "#8E74F0", light: "#EAE2FF", accent: "#7FD8FF", cheek: "#FFA8D6", eye: "#251C4A" } },
    personality: { energy: 0.3, sociability: 0.5, mischief: 0.2, sleepiness: 0.7 },
    habits: { floatDrift: 3, dreamBubble: 2, nodOff: 1 },
    moves: ["zeroGSomersault", "floatDrift"],
    evolution: "comet",
    levitates: true
  },
  // Musical.
  lyra: {
    label: "Lyra",
    hero: "noteAntennae",
    look: { body: "pear", eyes: "ovalSparkle", mouth: "cat", topper: "noteAntennae", accessories: [], pattern: "none",
            palette: { body: "#FFB3D4", shade: "#EC86B4", light: "#FFE6F2", accent: "#7B61FF", cheek: "#FF7AAE", eye: "#3A1F3E" } },
    personality: { energy: 0.65, sociability: 0.75, mischief: 0.3, sleepiness: 0.3 },
    habits: { hum: 3, dance: 2, waveCamera: 1 },
    moves: ["twirl", "dance"],
    evolution: "encore"
  },
  // Anything else: balanced, its body colour hashed from the provider name.
  bit: {
    label: "Bit",
    hero: "antenna",
    look: { body: "roundBlob", eyes: "dot", mouth: "smile", topper: "antenna", accessories: [], pattern: "none",
            palette: { hashed: true } },
    personality: { energy: 0.5, sociability: 0.5, mischief: 0.5, sleepiness: 0.5 },
    habits: { juggle: 1, kickPebble: 1, paperPlane: 1, waveCamera: 1, balance: 1 },
    moves: ["hopSpin", "juggle"],
    evolution: "prime"
  }
}

export const PROVIDER_FORMS = {
  claude: "ember", "claude-desktop": "ember",
  codex: "slate", chatgpt: "slate",
  gemini: "prism",
  kimi: "mochi",
  grok: "jinx",
  deepseek: "tide",
  opencode: "shell",
  antigravity: "drift",
  muse: "lyra"
}

export function formFor(provider) {
  return PROVIDER_FORMS[String(provider || "").toLowerCase()] || "bit"
}

// Every form's signature move, in form order.
export const SIGNATURE_MOVES = Object.values(FORMS).map(f => f.moves[0])

// Names used before the personalities were settled; read as their successors.
export const MOVE_ALIASES = {
  thoughtfulSpin: "bowAndSpin", moonwalk: "moonwalkLaunch", twinJump: "yawnRoll", longStretch: "scrollUnfurl",
  prank: "micDropStrut", diveRoll: "trickShot"
}

// The set a pet's moves come from: the form whose signature it uses (so a
// personal pet with Ember's signature also gets Ember's other moves).
export function moveSet(signature) {
  for (const f of Object.values(FORMS)) if (f.moves[0] === signature) return f.moves
  return [signature]
}
