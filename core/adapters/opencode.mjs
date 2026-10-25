// OpenCode: our plugin (integrations/opencode/tokenlings.js) forwards bus
// events and plugin hooks by name.
const EVENTS = {
  "session.created": "session.start",
  "chat.message": "prompt",
  "tool.execute.before": "tool.start",
  "tool.execute.after": "tool.end",
  "permission.asked": "needs",
  "question.asked": "needs",
  "permission.replied": "needs.end",
  "question.replied": "needs.end",
  "question.rejected": "needs.end",
  "session.compacted": "compact.end",
  "session.error": "turn.fail",
  "session.idle": "turn.end",
  "session.deleted": "session.end"
}

export function normalize(line) {
  const event = EVENTS[line.e]
  return event ? { event } : null
}
