// Tokenlings for OpenCode: forwards session and tool events to a pet.
// Installed by `tokenlings hooks install opencode --pet @PET@`; removed by
// `tokenlings hooks uninstall opencode`. tokenlings-hook
//
// It hands each event's name and a few ids to the Tokenlings hook bridge on
// stdin; prompts, tool input and output are never passed on. If the plugin
// is removed, the bridge is gone and this does nothing.
import { spawn } from "node:child_process"
import { accessSync, constants } from "node:fs"

const HOOK = "@HOOK@"
const PET = "@PET@"
const FORWARD = new Set([
  "session.created", "session.idle", "session.error", "session.deleted", "session.compacted",
  "permission.asked", "permission.replied", "question.asked", "question.replied", "question.rejected"
])

function present() {
  try { accessSync(HOOK, constants.X_OK); return true } catch (e) { return false }
}

function send(event, sessionID, tool, cwd) {
  if (!present()) return
  try {
    const child = spawn(HOOK, ["--pet", PET, "--provider", "opencode", "--event", event], { stdio: ["pipe", "ignore", "ignore"] })
    child.on("error", () => {})
    child.stdin.on("error", () => {})
    child.stdin.end(JSON.stringify({ sessionID: sessionID || "", tool: tool || "", cwd: cwd || "" }))
  } catch (e) {}
}

export const TokenlingsPlugin = async ({ directory }) => ({
  "chat.message": async (input) => send("chat.message", input && input.sessionID, "", directory),
  "tool.execute.before": async (input) => send("tool.execute.before", input && input.sessionID, input && input.tool, directory),
  "tool.execute.after": async (input) => send("tool.execute.after", input && input.sessionID, input && input.tool, directory),
  event: async ({ event }) => {
    const type = event && event.type
    if (!FORWARD.has(type)) return
    const props = (event && event.properties) || {}
    send(type, props.sessionID || (props.info && props.info.id), "", directory)
  }
})
