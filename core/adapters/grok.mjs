// Grok Build: Claude-shaped hooks in $GROK_HOME/hooks/*.json, plus a few of
// its own events. (Grok also runs Claude Code's hooks; the hook bridge drops
// those for Claude pets — see bin/tokenlings-hook.)
import * as Claude from "./claude.mjs"

const EXTRA = { StopCancelled: "turn.cancel" }

export function normalize(line) {
  if (EXTRA[line.e]) return { event: EXTRA[line.e] }
  return Claude.normalize(line)
}
