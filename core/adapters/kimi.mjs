// Kimi Code: [[hooks]] entries ({ event, matcher, command, timeout }) in
// $KIMI_CODE_HOME/config.toml; camelCase payloads.
import * as Claude from "./claude.mjs"

const EXTRA = {
  PermissionResult: "needs.end",
  Interrupt: "turn.cancel",
  // TurnStarted and UserPromptQueued arrive beside UserPromptSubmit: one prompt is enough
  TurnStarted: null, UserPromptQueued: null, SessionHeartbeat: null, TaskStarted: null
}

export function normalize(line) {
  if (line.e in EXTRA) return EXTRA[line.e] ? { event: EXTRA[line.e] } : null
  return Claude.normalize(line)
}
