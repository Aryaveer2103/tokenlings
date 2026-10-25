// Adapters: one small normaliser per provider, from a line the hook bridge
// wrote ({ t, p, e, c, k, s, pid, chain, cwd }) to the session model's event
// ({ pet, session, event, tool, at, pid, chain, cwd }).
import * as claude from "./claude.mjs"
import * as codex from "./codex.mjs"
import * as grok from "./grok.mjs"
import * as kimi from "./kimi.mjs"
import * as muse from "./muse.mjs"
import * as gemini from "./gemini.mjs"
import * as opencode from "./opencode.mjs"

export const ADAPTERS = { claude, codex, grok, kimi, muse, gemini, opencode }

// Which providers have lifecycle hooks (Tier A) and how the installer wires them.
export const TIER_A = Object.keys(ADAPTERS)

const CATEGORIES = ["edit", "shell", "read", "web", "mcp", "task", "other"]
const MAX_LINE = 2048

// Parses one log line defensively; returns null for anything unusable.
export function parseLine(text) {
  if (typeof text !== "string" || !text || text.length > MAX_LINE) return null
  let raw
  try { raw = JSON.parse(text) } catch (e) { return null }
  if (!raw || typeof raw !== "object") return null
  const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "")
  const line = {
    t: Number.isFinite(raw.t) ? raw.t : 0, p: str(raw.p, 32), e: str(raw.e, 40), c: str(raw.c, 16), k: str(raw.k, 32),
    s: str(raw.s, 32), pid: Number.isInteger(raw.pid) && raw.pid > 0 ? raw.pid : 0,
    chain: Array.isArray(raw.chain) ? raw.chain.filter(n => Number.isInteger(n) && n > 0).slice(0, 16) : [], cwd: str(raw.cwd, 48)
  }
  if (!line.t || !line.p || !line.e) return null
  return line
}

export function normalize(pet, line) {
  const a = ADAPTERS[line.p] || claude
  const out = a.normalize(line)
  if (!out) return null
  const tool = CATEGORIES.includes(line.c) ? (line.c === "task" ? "other" : line.c) : ""
  return Object.assign({ pet, session: line.s || "default", tool, at: line.t, pid: line.pid, chain: line.chain, cwd: line.cwd }, out)
}

// New lines of a pet's log since `after` (ms timestamp + count of lines with
// exactly that timestamp already taken), in order.
export function newLines(text, after) {
  const out = []
  let lastT = after ? after.t : 0, sameT = after ? after.n : 0, seenAtLast = 0
  for (const row of String(text || "").split("\n")) {
    const line = parseLine(row)
    if (!line) continue
    if (line.t < lastT) continue
    if (line.t === lastT) { seenAtLast++; if (seenAtLast <= sameT) continue }
    out.push(line)
  }
  let t = lastT, n = sameT
  for (const l of out) { if (l.t === t) n++; else { t = l.t; n = 1 } }
  return { lines: out, cursor: { t, n } }
}
