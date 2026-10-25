// Every clip, and the actions that pick among them. The brain asks for an
// action ("done.medium", "tool.read", "ambient"), never for a clip, so a new
// variant is a line here, not code.
import moves from "./moves.mjs"
import agent from "./agent.mjs"
import variants from "./variants.mjs"
import interaction from "./interaction.mjs"
import ambient from "./ambient.mjs"
import context from "./context.mjs"
import signature from "./signature.mjs"
import social from "./social.mjs"
import roam from "./roam.mjs"

export const CLIPS = Object.assign({}, moves, agent, variants, interaction, ambient, context, signature, social, roam)

// action → variants. A variant is a clip id or { clip, w, trait } where trait
// (energy, sociability, mischief, sleepiness) weights it by personality.
export const ACTIONS = {
  // A. agent
  "session.start": ["sessionStart", "sessionStartB"],
  "session.end": ["sessionEnd", "sessionEndB"],
  "prompt": ["prompt", "promptB"],
  "thinking": ["thinking", "thinkingB"],
  "thinking.long": ["thinkingLong", "thinkingLongB"],
  "tool.edit": ["toolEdit", "toolEditB"],
  "tool.shell": ["toolShell", "toolShellB"],
  "tool.read": ["toolRead", "toolReadScroll"],
  "tool.web": ["toolWeb", "toolWebRadar"],
  "tool.mcp": ["toolMcp", "toolMcpB"],
  "tool.other": ["toolMcp", "toolMcpB"],
  "busy": ["busy", "busyB"],
  "subagent.start": ["subagentSend", "subagentSendB"],
  "subagent.stop": ["subagentReturn", "subagentReturnB"],
  "failure": ["failure", "failureB"],
  "needs.0": ["needsYou", "needsYouB"],
  "needs.30s": ["needsYouSign"],
  "needs.2m": ["needsYouWait"],
  "needs.10m": ["needsYouDoze"],
  "compacting": ["compacting", "compactingB"],
  "done.short": ["doneShort", "doneShortB"],
  "done.medium": ["doneMedium", "doneMediumB"],
  "done.long": ["doneLong", "doneLongB"],
  "done.streak": ["doneStreak", "doneStreakB"],
  "usage.exhausted": ["usageExhausted", "usageExhaustedB"],
  "usage.reset": ["usageReset", "usageResetB"],
  "asleep": ["asleep"],
  "asleep.still": ["asleepStill"],
  // B. interaction
  "hover": ["hover", "hoverB"],
  "click": ["jump", "jumpB"],
  "follow": ["followMe"],
  "shrug": ["shrug"],
  "pat": ["pat", "patB"],
  "pat.over": ["overPetted"],
  "drag": ["pickedUp"],
  "drop": ["drop"],
  "toss": ["tumble"],
  "toss.land": ["landSoft"],
  "toss.hard": ["dizzyLand"],
  "bonk": ["bonk"],
  "grump": ["grump", "grumpB"],
  "dnd": ["dndSleep"],
  "wake": ["wake"],
  // C. ambient
  "micro": ["glance", "earTwitch", "headTilt", "scratch", { clip: "sneeze", w: 0.5 }, { clip: "hiccup", w: 0.4 }, { clip: "yawn", trait: "sleepiness" }],
  "bored": [{ clip: "kickPebble", trait: "mischief" }, { clip: "juggle", trait: "energy" }, { clip: "yoyo", trait: "mischief" }, "readScroll", "doodle", "handheld",
            { clip: "balance", trait: "energy" }, "stareClock", "polish", { clip: "chaseTail", trait: "energy" }, "blowBubbles", "paperPlane", { clip: "waveCamera", trait: "sociability" }],
  "rest": [{ clip: "nodOff", trait: "sleepiness" }, "dreamBubble", "rollOver", "sleepTalk"],
  // D. context
  "media": ["mediaBop", "mediaBopB"],
  "battery.low": ["batteryLow"],
  "battery.plugged": ["pluggedIn"],
  "night": ["nightYawn"],
  "morning": ["morningMug", "morningMugB"],
  "glance.left": ["glanceLeft"],
  "glance.right": ["glanceRight"]
}

// The states `tokenlings demo walk` shows, in order, with how long each holds.
export const WALK = [
  ["session.start", 2600], ["prompt", 800], ["thinking", 3000], ["thinking.long", 3500], ["tool.edit", 3000], ["tool.shell", 3000], ["tool.read", 3000],
  ["tool.web", 3000], ["tool.mcp", 2500], ["busy", 3000], ["subagent.start", 1500], ["subagent.stop", 1200], ["failure", 2400], ["needs.0", 3000],
  ["needs.30s", 3000], ["needs.2m", 3200], ["needs.10m", 1600], ["compacting", 1800], ["done.short", 1200], ["done.medium", 2000],
  ["done.long", 3400], ["done.streak", 2400], ["usage.exhausted", 1800], ["usage.reset", 1800], ["session.end", 3600]
]

// Pick a variant for a pet: personality-weighted, seeded.
export function pick(action, personality, rng, avoid) {
  const list = ACTIONS[action]
  if (!list || !list.length) return null
  const opts = list.map(v => (typeof v === "string" ? { clip: v, w: 1 } : Object.assign({ w: 1 }, v)))
    .map(v => ({ clip: v.clip, w: v.w * (v.trait && personality ? 0.4 + 1.2 * (personality[v.trait] || 0) : 1) * (v.clip === avoid && list.length > 1 ? 0.25 : 1) }))
  let total = 0
  for (const o of opts) total += o.w
  let r = rng.next() * total
  for (const o of opts) { r -= o.w; if (r <= 0) return o.clip }
  return opts[opts.length - 1].clip
}
