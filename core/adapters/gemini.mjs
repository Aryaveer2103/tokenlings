// Gemini CLI: "hooks" in ~/.gemini/settings.json (must be enabled there).
// Not installed on the development machine: fixture-tested only.
const EVENTS = {
  SessionStart: "session.start", SessionEnd: "session.end",
  BeforeAgent: "prompt", AfterAgent: "turn.end",
  BeforeTool: "tool.start", AfterTool: "tool.end",
  PreCompress: "compact"
}

export function normalize(line) {
  if (line.e === "Notification") return { event: "needs" }
  const event = EVENTS[line.e]
  return event ? { event } : null
}
