import QtQuick
import Quickshell.Io
import "../core/safe.mjs" as Safe

// A file read the careful way (core/safe.mjs): only a regular file the user
// owns, never a FIFO or device, never through a symlink unless `links`, at
// most `cap` bytes. Changes are watched with inotify by a FileView that never
// reads; each read is one short `sh`.
//
//   loaded(text)    the file's text (cut at cap: `truncated` says so)
//   missing()       no such file
//   refused()       there is something, but not a regular file of ours
Item {
  id: file

  property string path: ""
  property int cap: 262144
  property bool watch: true
  property bool links: false
  property bool truncated: false
  signal loaded(string text)
  signal missing()
  signal refused()

  function reload() {
    if (!path) return
    if (reader.running) { again = true; return }
    // set here, not bound: a path that just changed must be the one read
    reader.command = ["sh", "-c", Safe.READ_SCRIPT, "sh", path, String(cap + 1), links ? "links" : "nolinks"]
    reader.running = true
  }
  property bool again: false
  onPathChanged: reload()
  Component.onCompleted: reload()

  Watch {
    id: watcher
    path: file.path
    enabled: file.watch
    onChanged: file.reload()
  }
  // a file that was missing is watched from the moment it is there
  property string lastState: ""
  function settled(state) {
    if (state !== lastState && (lastState === "missing" || lastState === "")) watcher.rearm()
    lastState = state
  }
  Process {
    id: reader
    stdout: StdioCollector {
      onStreamFinished: {
        var r = Safe.parse(text, file.cap)
        file.truncated = r.truncated
        file.settled(r.state)
        if (r.state === "ok") file.loaded(r.text)
        else if (r.state === "missing") file.missing()
        else file.refused()
      }
    }
    onExited: if (file.again) { file.again = false; file.reload() }
  }
}
