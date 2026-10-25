import QtQuick
import Quickshell
import Quickshell.Wayland
import qs.Commons

// A large view of the same pets for reviewing animation and recording the
// clip reel (`tokenlings theater on`). It shows the engine's own rigs, so it
// plays exactly what the bar plays, only bigger. Dev and review aid: it is
// never shown on its own.
PanelWindow {
  id: root

  required property var engine
  property real petSize: 112

  color: Qt.rgba(Color.background.r, Color.background.g, Color.background.b, 1)
  surfaceFormat.opaque: true
  exclusionMode: ExclusionMode.Ignore
  WlrLayershell.namespace: "tokenlings-theater"
  WlrLayershell.layer: WlrLayer.Overlay
  WlrLayershell.keyboardFocus: WlrKeyboardFocus.None
  anchors { top: true; bottom: true; left: true; right: true }

  readonly property real fit: Math.min(petSize, (width - 120) / Math.max(1, engine.pets.length) - 16)

  Column {
    anchors.centerIn: parent
    spacing: 14

    Text {
      anchors.horizontalCenter: parent.horizontalCenter
      text: root.engine.theaterTitle
      textFormat: Text.PlainText
      color: Color.foreground
      font.family: Style.fontFamily
      font.pixelSize: 18
      font.bold: true
    }

    Item {
      anchors.horizontalCenter: parent.horizontalCenter
      width: stageRow.width + 2 * root.fit
      height: root.fit * 2.1
      PetRow {
        id: stageRow
        x: root.fit
        y: root.fit * 0.75
        engine: root.engine
        petSize: root.fit
        gap: 16
        dpr: root.screen ? root.screen.devicePixelRatio : 1
      }
    }

    Row {
      anchors.horizontalCenter: parent.horizontalCenter
      spacing: 16
      Repeater {
        model: root.engine.pets
        Text {
          required property var modelData
          required property int index
          width: Math.round(root.fit * modelData.sizeFactor)
          text: modelData.name + "\n" + (root.engine.petLabels[index] || "")
          textFormat: Text.PlainText
          horizontalAlignment: Text.AlignHCenter
          color: Color.foreground
          opacity: 0.8
          font.family: Style.fontFamily
          font.pixelSize: 12
          elide: Text.ElideRight
        }
      }
    }
  }
}
