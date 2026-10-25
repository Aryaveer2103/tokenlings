// Codex CLI: Claude-shaped hooks.json in $CODEX_HOME (PascalCase event keys;
// the snake_case names of its trust table are accepted too).
import * as Claude from "./claude.mjs"

const SNAKE = {
  session_start: "SessionStart", user_prompt_submit: "UserPromptSubmit", pre_tool_use: "PreToolUse",
  post_tool_use: "PostToolUse", permission_request: "PermissionRequest", stop: "Stop", session_end: "SessionEnd"
}

export function normalize(line) {
  if (line.e === "Interrupt" || line.e === "interrupt") return { event: "turn.cancel" }
  return Claude.normalize(Object.assign({}, line, { e: SNAKE[line.e] || line.e }))
}
