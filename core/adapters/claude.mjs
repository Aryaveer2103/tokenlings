// Claude Code's lifecycle hooks (settings.json in CLAUDE_CONFIG_DIR). Several
// CLIs reuse this event set: Grok Build, Muse, Kimi Code and Codex (hooks.json).
export const EVENTS = {
  SessionStart: "session.start",
  UserPromptSubmit: "prompt",
  PreToolUse: "tool.start",
  PostToolUse: "tool.end",
  PostToolUseFailure: "tool.fail",
  PermissionRequest: "needs",
  PermissionDenied: "needs.end",
  Elicitation: "needs",
  ElicitationResult: "needs.end",
  SubagentStart: "subagent.start",
  SubagentStop: "subagent.stop",
  PreCompact: "compact",
  PostCompact: "compact.end",
  Stop: "turn.end",
  StopFailure: "turn.fail",
  SessionEnd: "session.end"
}

// Notifications that mean "the agent is waiting for you".
export const WAITING = ["permission_prompt", "idle_prompt", "elicitation_dialog", "permission", "input", "question"]

export function normalize(line) {
  if (line.e === "Notification") return WAITING.includes(line.k) ? { event: "needs" } : null
  const event = EVENTS[line.e]
  return event ? { event } : null
}
