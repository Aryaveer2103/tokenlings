// The session model: what each pet's agent sessions are doing, from the
// normalised events the hook bridge writes (see core/adapters/).
//
// Event: { pet, session, event, tool?, at, pid?, chain?, cwd? } where event is
//   session.start  prompt  tool.start  tool.end  tool.fail  subagent.start
//   subagent.stop  needs  needs.end  compact  compact.end  turn.end
//   turn.fail  turn.cancel  session.end  usage.exhausted  usage.reset
// (chain: the hook's parent process ids, for focusing the session's terminal)
// and tool a category: edit shell read web mcp other.
//
// A session: { id, state, tool, since, turnStart, lastAt, pid, termPid, toolTimes }
//   state  idle | thinking | tool | needs | compacting | ended
// Sessions end on session.end, when their agent process is gone, or after
// 30 minutes of silence.

export const SILENCE_MS = 30 * 60 * 1000
export const BURST = { count: 3, windowMs: 8000 }     // rapid tool calls → the busy montage

// Ranking when several sessions of one pet compete for its body; the rest
// show as shadow clones.
const RANK = { needs: 5, tool: 4, compacting: 3, thinking: 2, idle: 1, ended: 0 }

export function createSessions() {
  const pets = {}                                      // pet id → { sessions: {id: session} }

  function petOf(id) { return pets[id] || (pets[id] = { sessions: {} }) }

  // Applies one event; returns what happened for the brain to animate:
  //   { pet, session, kind, ... } — kind is the event name, plus
  //   turn: { ms } on turn.end, burst: true on a tool.start inside a burst
  function apply(ev) {
    if (!ev || typeof ev.pet !== "string" || typeof ev.event !== "string") return null
    const at = Number(ev.at) || 0
    const p = petOf(ev.pet)
    const sid = String(ev.session || "default")
    // the account's limits, not a session: nothing to track
    if (ev.event === "usage.exhausted" || ev.event === "usage.reset") return { pet: ev.pet, session: sid, kind: ev.event, at }
    let s = p.sessions[sid]
    if (!s) {
      if (ev.event === "session.end") return null
      s = p.sessions[sid] = { id: sid, state: "idle", tool: "", since: at, turnStart: null, lastAt: at, startedAt: at, pid: 0, termPid: 0, toolTimes: [] }
    }
    s.lastAt = Math.max(s.lastAt, at)
    if (ev.pid) s.pid = Number(ev.pid) || s.pid
    if (ev.termPid) s.termPid = Number(ev.termPid) || s.termPid
    if (Array.isArray(ev.chain) && ev.chain.length) s.chain = ev.chain.slice(0, 16)
    if (ev.cwd) s.cwd = String(ev.cwd).slice(0, 48)
    const out = { pet: ev.pet, session: sid, kind: ev.event, at }
    const set = (state) => { if (s.state !== state) { s.state = state; s.since = at } }
    switch (ev.event) {
      case "session.start": set("idle"); break
      case "prompt": s.turnStart = at; set("thinking"); break
      case "tool.start": {
        s.tool = ev.tool || "other"
        s.toolTimes = s.toolTimes.filter(t => at - t < BURST.windowMs).concat([at])
        if (s.turnStart === null) s.turnStart = at
        out.tool = s.tool
        out.burst = s.toolTimes.length >= BURST.count
        set("tool")
        break
      }
      case "tool.end": set("thinking"); break
      case "tool.fail": set("thinking"); break
      case "subagent.start": case "subagent.stop": break
      case "needs": set("needs"); break
      case "needs.end": set(s.turnStart !== null ? "thinking" : "idle"); break
      case "compact": set("compacting"); break
      case "compact.end": set(s.turnStart !== null ? "thinking" : "idle"); break
      case "turn.end": {
        out.turn = { ms: s.turnStart !== null ? Math.max(0, at - s.turnStart) : 0 }
        s.turnStart = null
        s.toolTimes = []
        set("idle")
        break
      }
      case "turn.fail": case "turn.cancel": {
        out.turn = { ms: s.turnStart !== null ? Math.max(0, at - s.turnStart) : 0 }
        s.turnStart = null
        s.toolTimes = []
        set("idle")
        break
      }
      case "session.end": delete p.sessions[sid]; break
      case "usage.exhausted": case "usage.reset": break
      default: return null
    }
    return out
  }

  // Drops sessions that went quiet or whose agent is gone. alive(pid) is
  // supplied by the shell (a bounded /proc check); returns the ended ids.
  function gc(now, alive) {
    const gone = []
    for (const id in pets) for (const sid in pets[id].sessions) {
      const s = pets[id].sessions[sid]
      if (now - s.lastAt > SILENCE_MS || (s.pid && alive && !alive(s.pid))) { delete pets[id].sessions[sid]; gone.push({ pet: id, session: sid }) }
    }
    return gone
  }

  // The pet's sessions, most important first (ties: most recent).
  function ranked(id) {
    const p = pets[id]
    if (!p) return []
    return Object.values(p.sessions).sort((a, b) => (RANK[b.state] - RANK[a.state]) || (b.lastAt - a.lastAt))
  }

  function primary(id) { return ranked(id)[0] || null }
  function count(id) { return ranked(id).length }
  function all() { return pets }

  return { apply, gc, ranked, primary, count, all }
}

// The action a session's state shows right now (escalation by time).
export function stateAction(s, now) {
  if (!s) return null
  const t = now - s.since
  switch (s.state) {
    case "thinking": return t > 20000 ? "thinking.long" : "thinking"
    case "tool": return s.toolTimes.length >= BURST.count && now - s.toolTimes[s.toolTimes.length - 1] < BURST.windowMs ? "busy" : "tool." + (s.tool || "other")
    case "needs": return t < 30000 ? "needs.0" : t < 120000 ? "needs.30s" : t < 600000 ? "needs.2m" : "needs.10m"
    case "compacting": return "compacting"
    default: return null
  }
}

// When the action for this state next changes on its own (an escalation step).
export function nextEscalation(s, now) {
  if (!s) return Infinity
  const t = now - s.since
  if (s.state === "thinking" && t <= 20000) return s.since + 20001
  if (s.state === "needs") for (const step of [30000, 120000, 600000]) if (t < step) return s.since + step
  if (s.state === "tool" && s.toolTimes.length >= BURST.count) return s.toolTimes[s.toolTimes.length - 1] + BURST.windowMs
  return Infinity
}

// How a finished turn is celebrated: by how long it took (and streaks).
export function doneAction(ms, streak) {
  if (streak > 0 && streak % 5 === 0) return "done.streak"
  if (ms > 10 * 60000) return "done.long"
  if (ms > 60000) return "done.medium"
  return "done.short"
}
