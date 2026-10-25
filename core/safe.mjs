// The one way Tokenlings reads its own files from the shell (qml/SafeFile.qml):
// a regular file the user owns, never a FIFO or a device, at most `cap`
// bytes, and never through a symlink unless the caller allows one (pets.json
// may be a dotfile manager's link; state and event files may not).
//
//   sh -c READ_SCRIPT sh <path> <cap + 1> <links|nolinks>
//
// prints M (missing), R (refused: a symlink, FIFO, directory, device or not
// ours) or F followed by the bytes.
export const READ_SCRIPT = 'f=$1; if [ ! -e "$f" ] && [ ! -L "$f" ]; then printf M; exit 0; fi; ' +
  'if [ "$3" != links ] && [ -L "$f" ]; then printf R; exit 0; fi; ' +
  '[ -f "$f" ] && [ -O "$f" ] || { printf R; exit 0; }; printf F; head -c "$2" -- "$f"'

// { state: "ok" | "missing" | "refused", text, truncated }
export function parse(out, cap) {
  const t = String(out || "")
  const c = t.charAt(0)
  if (c !== "F") return { state: c === "M" ? "missing" : "refused", text: "", truncated: false }
  const body = t.slice(1)
  return { state: "ok", text: body.length > cap ? body.slice(0, cap) : body, truncated: body.length > cap }
}
