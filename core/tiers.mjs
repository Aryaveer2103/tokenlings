// Signals for agents without lifecycle hooks, shown honestly as a tier:
//
//   Tier A  lifecycle hooks (core/adapters)                    full behaviour
//   Tier B  process activity: a CLI matched by process name;    busy / idle
//           busy from its CPU time over a few seconds
//   Tier C  window presence: a desktop or web app's window;    asleep / awake /
//           open, focused, its title changing while focused    attentive
//
// Pure functions: the shell feeds them what it sees (/proc samples, Hyprland
// toplevels) and turns their answers into session events.
import { TIER_A } from "./adapters/index.mjs"

// Window matchers for known apps (class first; a browser tab by its title,
// which only reflects the active tab).
export const WINDOW_APPS = {
  "claude-desktop": { cls: /^claude$/i, title: /\bClaude\b/ },
  chatgpt: { cls: /chatgpt/i, title: /\bChatGPT\b/ },
  antigravity: { cls: /antigravity/i, title: /\bAntigravity\b/ },
  gemini: { cls: /^gemini$/i, title: /\bGemini\b/ },
  grok: { cls: /^grok$/i, title: /\bGrok\b/ }
}
// CLIs without hooks that a process match can still follow.
export const PROCESS_APPS = { aider: /^aider$/, goose: /^goose$/, amp: /^amp$/, qwen: /^qwen$/, crush: /^crush$/, copilot: /^copilot$/, "cursor-agent": /^cursor-agent$/ }

function regex(text) {
  if (typeof text !== "string" || !text || text.length > 128) return null
  try { return new RegExp(text, "i") } catch (e) { return null }
}

// A pet's tier and matcher. account.match: "window:<regex>" (class or title),
// "process:<regex>" (process name); otherwise the provider decides.
export function tierOf(pet) {
  const m = pet.account && typeof pet.account.match === "string" ? pet.account.match : ""
  if (m.startsWith("window:")) { const r = regex(m.slice(7)); return r ? { tier: "C", cls: r, title: r } : { tier: "none" } }
  if (m.startsWith("process:")) { const r = regex(m.slice(8)); return r ? { tier: "B", proc: r } : { tier: "none" } }
  if (TIER_A.includes(pet.provider)) return { tier: "A" }
  if (WINDOW_APPS[pet.provider]) return Object.assign({ tier: "C" }, WINDOW_APPS[pet.provider])
  if (PROCESS_APPS[pet.provider]) return { tier: "B", proc: PROCESS_APPS[pet.provider] }
  return { tier: "none" }
}

// Tier C. windows: [{ address, cls, title, focused }] → { open, focused, title }
export function windowState(matcher, windows) {
  let open = false, focused = false, title = ""
  for (const w of windows || []) {
    const hit = (matcher.cls && matcher.cls.test(w.cls || "")) || (matcher.title && matcher.title.test(w.title || ""))
    if (!hit) continue
    open = true
    if (w.focused) { focused = true; title = String(w.title || "").slice(0, 200) }
  }
  return { open, focused, title }
}

// What changed between two window states, as session events.
export function windowEvents(pet, before, after, at) {
  const out = [], ev = (event) => out.push({ pet, session: "window", event, at })
  if (!before.open && after.open) ev("session.start")
  if (before.open && !after.open) { ev("session.end"); return out }
  if (after.focused && !before.focused) out.push({ pet, cue: "attentive" })
  if (after.focused && before.focused && after.title !== before.title) out.push({ pet, cue: "listening" })
  return out
}

// Tier B. samples: [{ pid, comm, ticks }] from /proc (utime + stime, in
// clock ticks). Busy when the matched processes used more than `busyShare`
// of one core since the last sample.
export function processState(matcher, prev, samples, at, hz, busyShare) {
  const share = busyShare || 0.08
  const mine = (samples || []).filter(s => matcher.proc.test(s.comm || ""))
  const ticks = {}
  for (const s of mine) ticks[s.pid] = s.ticks
  let used = 0
  const had = !!prev && typeof prev.at === "number"
  if (had && at > prev.at) for (const pid in ticks) if (pid in prev.ticks) used += Math.max(0, ticks[pid] - prev.ticks[pid])
  const secs = had ? (at - prev.at) / 1000 : 0
  const busy = secs > 0 && used / (hz || 100) / secs > share
  return { at, ticks, running: mine.length > 0, busy, pids: mine.map(s => s.pid) }
}

// Session events for a Tier B pet: appears → start; busy → working;
// quiet for `quietMs` after work → a finished turn; gone → end.
export function processEvents(pet, before, after, at, quietMs) {
  const out = [], ev = (event, extra) => out.push(Object.assign({ pet, session: "process", event, at, pid: after.pids[0] || 0 }, extra || {}))
  const q = quietMs || 10000
  if (!before.running && after.running) ev("session.start")
  if (before.running && !after.running) { if (before.working) ev("turn.end"); ev("session.end"); return { events: out, working: false, quietSince: 0 } }
  let working = !!before.working, quietSince = before.quietSince || 0
  if (after.busy) {
    if (!working) { ev("prompt"); ev("tool.start", { tool: "other" }) }
    working = true
    quietSince = 0
  } else if (working) {
    if (!quietSince) quietSince = at
    if (at - quietSince >= q) { ev("turn.end"); working = false; quietSince = 0 }
  }
  return { events: out, working, quietSince }
}

// Parses the sampler's output: lines "pid ticks comm" (comm may hold spaces).
export function parseSamples(text) {
  const out = []
  for (const line of String(text || "").split("\n").slice(0, 4096)) {
    const m = /^(\d+) (\d+) (.{1,32})$/.exec(line.trim())
    if (m) out.push({ pid: Number(m[1]), ticks: Number(m[2]), comm: m[3] })
  }
  return out
}
