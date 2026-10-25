import QtQuick
import Quickshell
import Quickshell.Wayland
import qs.Commons
import "../core/gallery.mjs" as GalleryData

// A full-screen sheet of pets for reviewing art: every part on every body,
// every base form, poses, expressions, props, evolved forms or the user's own
// pets. Static (no clock); exists only while open. Click anywhere or press
// Escape to close.
PanelWindow {
  id: root

  required property var engine
  required property string section

  readonly property var sheet: GalleryData.build(section, engine.theme, engine.config ? engine.config.pets : [])
  readonly property bool big: section === "forms" || section === "mine" || section === "evolved"
  readonly property int columnCount: Math.max(1, sheet.columns.length, sheet.rows.length ? sheet.rows[0].cells.length : 1)
  readonly property int cell: Math.min(big ? 96 : 64, Math.floor((width - labelWidth - 80) / columnCount) - 8)
  readonly property int labelWidth: sheet.rows.some(function(r) { return r.label }) ? 84 : 0

  // Opaque: a review sheet must not show (or screenshot) what is behind it.
  color: Qt.rgba(Color.background.r, Color.background.g, Color.background.b, 1)
  surfaceFormat.opaque: true
  exclusionMode: ExclusionMode.Ignore
  WlrLayershell.namespace: "tokenlings-gallery"
  WlrLayershell.layer: WlrLayer.Overlay
  WlrLayershell.keyboardFocus: WlrKeyboardFocus.OnDemand
  anchors { top: true; bottom: true; left: true; right: true }

  MouseArea {
    anchors.fill: parent
    onClicked: root.engine.gallerySection = ""
  }

  Item {
    anchors.fill: parent
    focus: true
    Keys.onEscapePressed: root.engine.gallerySection = ""
    Component.onCompleted: forceActiveFocus()
  }

  Component {
    id: rigComponent
    Rig {}
  }

  Column {
    anchors.centerIn: parent
    spacing: 8

    Text {
      text: root.sheet.title + "  ·  tokenlings gallery " + root.section
      textFormat: Text.PlainText
      color: Color.foreground
      font.family: Style.fontFamily
      font.pixelSize: 14
      font.bold: true
    }

    Row {
      visible: root.sheet.columns.length > 0
      spacing: 0
      Item { width: root.labelWidth; height: 1 }
      Repeater {
        model: root.sheet.columns
        Text {
          required property string modelData
          width: root.cell + 8
          text: modelData
          textFormat: Text.PlainText
          color: Color.foreground
          opacity: 0.75
          font.family: Style.fontFamily
          font.pixelSize: root.big ? 11 : 8
          elide: Text.ElideRight
          horizontalAlignment: Text.AlignHCenter
        }
      }
    }

    Repeater {
      model: root.sheet.rows
      Row {
        id: sheetRow
        required property var modelData
        spacing: 8
        Text {
          visible: root.labelWidth > 0
          width: root.labelWidth - 8
          height: root.cell
          verticalAlignment: Text.AlignVCenter
          text: sheetRow.modelData.label
          textFormat: Text.PlainText
          color: Color.foreground
          opacity: 0.75
          font.family: Style.fontFamily
          font.pixelSize: 10
        }
        Repeater {
          model: sheetRow.modelData.cells
          Column {
            id: cellBox
            required property var modelData
            readonly property var rig: {
              var r = rigComponent.createObject(cellBox)
              var pose = modelData.pose || {}
              for (var k in pose) if (k !== "caption" && k in r) r[k] = pose[k]
              return r
            }
            Item {
              width: root.cell
              height: root.cell
              Pet {
                visible: cellBox.modelData.art !== null
                rig: cellBox.rig
                art: cellBox.modelData.art
                size: root.cell
                dpr: root.screen ? root.screen.devicePixelRatio : 1
                renderer: "baked"
              }
            }
            Text {
              visible: !!cellBox.modelData.pose.caption
              width: root.cell
              text: cellBox.modelData.pose.caption || ""
              textFormat: Text.PlainText
              color: Color.foreground
              opacity: 0.7
              font.family: Style.fontFamily
              font.pixelSize: 9
              elide: Text.ElideRight
              horizontalAlignment: Text.AlignHCenter
            }
          }
        }
      }
    }
  }
}
