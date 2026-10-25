pragma Singleton
import QtQuick

// Where the bar widget finds the service. The shell's own lookup
// (bar.shell.serviceFor) is withheld from widgets under a replacement bar, so
// the two halves of the plugin meet here instead: the service publishes
// itself, widgets bind to it.
QtObject {
  property var service: null
}
