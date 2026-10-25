import QtQuick
import Quickshell.Io

// Tells when a file or folder changes (inotify), without ever reading it.
// A watch only arms on a path that exists: rearm() once it does.
Item {
  id: watch
  property string path: ""
  property bool enabled: true
  signal changed()
  function rearm() { loader.active = false; loader.active = Qt.binding(function() { return watch.enabled && watch.path !== "" }) }
  Loader {
    id: loader
    active: watch.enabled && watch.path !== ""
    sourceComponent: FileView {
      path: watch.path
      watchChanges: true
      preload: false
      blockAllReads: true
      printErrors: false
      onFileChanged: watch.changed()
    }
  }
}
