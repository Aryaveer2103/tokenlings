import QtQuick
import Quickshell.Io

// Runs one command and hands back its stdout parsed as JSON (or
// { ok: false, error } when it was not JSON). Output is capped at 256 KiB.
Process {
  id: proc
  property var done: null
  signal finished()
  stdout: StdioCollector { onStreamFinished: proc.handle(String(text || "")) }
  function handle(text) {
    var result = null
    if (text.length <= 262144) {
      // the last JSON line: commands print one result object (or array)
      var lines = text.trim().split("\n")
      for (var i = lines.length - 1; i >= 0 && result === null; i--) {
        var l = lines[i].trim()
        if (l.charAt(0) !== "{" && l.charAt(0) !== "[") continue
        try { result = JSON.parse(lines.slice(i).join("\n")) } catch (e) { result = null }
      }
    }
    if (result === null) result = { ok: false, error: text.trim() ? "unexpected output" : "no output" }
    // the callback gets the result as parsed (through a signal a JSON array
    // would arrive as a list that is not an Array)
    var cb = done
    done = null
    if (cb) cb(result)
    finished()
  }
}
