// Progression: XP for finished turns, levels that unlock cosmetics, and plain
// per-pet stats. No decay, no neglect penalties, no guilt: a pet never loses
// anything for being left alone.
//
// stats.json (in $XDG_STATE_HOME/tokenlings/): { version: 1, pets: { id: Stats } }
// Stats: { xp, level, turns, workMs, longestMs, streak, bestStreak, lastTurnAt }

export const VERSION = 1
export const MAX_BYTES = 64 * 1024

// Unlocks by level (what the editor offers; crown and halo are accessories).
export const UNLOCKS = { 3: "sparkle trail", 5: "crown", 8: "halo", 10: "evolved form" }

// XP needed to reach `level` from level 1: 40, 100, 180, 280, … (gentle).
export function xpFor(level) { return level <= 1 ? 0 : 20 * (level - 1) * (level + 2) }
export function levelFor(xp) { let l = 1; while (xp >= xpFor(l + 1) && l < 99) l++; return l }

// A turn's worth: a little for any turn, more for long ones, capped.
export function turnXp(ms) { return 5 + Math.min(45, Math.round(Math.max(0, ms) / 60000 * 4)) }

export function emptyStats() { return { xp: 0, level: 1, turns: 0, workMs: 0, longestMs: 0, streak: 0, bestStreak: 0, lastTurnAt: 0 } }

// A streak is turns finished without a failure in between, within 15 minutes
// of each other (a working session, not a calendar habit).
export const STREAK_GAP_MS = 15 * 60000

// Returns { stats, levelUp: newLevel | 0, unlocked: [names] }.
export function recordTurn(stats, ms, at, failed) {
  const s = Object.assign(emptyStats(), stats || {})
  s.turns += 1
  s.workMs += Math.max(0, ms)
  s.longestMs = Math.max(s.longestMs, ms)
  s.streak = failed ? 0 : (at - s.lastTurnAt < STREAK_GAP_MS ? s.streak + 1 : 1)
  s.bestStreak = Math.max(s.bestStreak, s.streak)
  s.lastTurnAt = at
  s.xp += turnXp(ms)
  const before = s.level
  s.level = levelFor(s.xp)
  const unlocked = []
  for (let l = before + 1; l <= s.level; l++) if (UNLOCKS[l]) unlocked.push(UNLOCKS[l])
  return { stats: s, levelUp: s.level > before ? s.level : 0, unlocked }
}

export function recordFailure(stats) {
  const s = Object.assign(emptyStats(), stats || {})
  s.streak = 0
  return s
}

// Parses stats.json defensively: anything odd is dropped, never thrown.
export function load(text) {
  const out = { version: VERSION, pets: {} }
  if (typeof text !== "string" || !text || text.length > MAX_BYTES) return out
  let raw
  try { raw = JSON.parse(text) } catch (e) { return out }
  if (!raw || typeof raw !== "object" || !raw.pets || typeof raw.pets !== "object") return out
  for (const id of Object.keys(raw.pets).slice(0, 128)) {
    if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(id)) continue
    const r = raw.pets[id], s = emptyStats()
    for (const k of Object.keys(s)) if (typeof r[k] === "number" && isFinite(r[k]) && r[k] >= 0) s[k] = Math.floor(r[k])
    s.level = levelFor(s.xp)
    out.pets[id] = s
  }
  return out
}

export function save(all) { return JSON.stringify({ version: VERSION, pets: all.pets }, null, 1) + "\n" }
