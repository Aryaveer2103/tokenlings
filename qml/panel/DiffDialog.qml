import QtQuick
import qs.Commons
import qs.Ui

// The exact change an install would make to an agent's config, line by line
// (+ added, - removed), with Cancel and Write. Nothing is written unless
// Write is chosen. Keyboard: Left/Right picks, Enter confirms, Escape cancels.
Item {
  id: dialog
  property bool open: false
  property string title: ""
  property string file: ""
  property string text: ""
  property var confirmAction: null
  property int choice: 0                     // 0 Cancel, 1 Write
  property color foreground: Color.foreground
  property string fontFamily: Style.font.family
  readonly property var lines: String(text).split("\n").slice(0, 400)

  visible: open
  onOpenChanged: if (open) { choice = 0; forceActiveFocus() }
  function finish(yes) {
    open = false
    if (yes && confirmAction) confirmAction()
    confirmAction = null
  }
  focus: open
  Keys.onPressed: function(event) {
    if (event.key === Qt.Key_Escape) { finish(false); event.accepted = true }
    else if (event.key === Qt.Key_Left || event.key === Qt.Key_Right || event.text === "h" || event.text === "l") { choice = 1 - choice; event.accepted = true }
    else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter || event.key === Qt.Key_Space) { finish(choice === 1); event.accepted = true }
  }

  Rectangle {
    anchors.fill: parent
    color: Color.background
    opacity: 0.97
    radius: Style.cornerRadius
  }
  MouseArea { anchors.fill: parent }   // the page below stays out of reach

  Column {
    anchors.fill: parent
    anchors.margins: Style.space(6)
    spacing: Style.space(6)
    Text {
      width: parent.width
      text: dialog.title
      textFormat: Text.PlainText
      wrapMode: Text.Wrap
      color: dialog.foreground
      font.family: dialog.fontFamily
      font.pixelSize: Style.font.subtitle
      font.bold: true
    }
    Text {
      width: parent.width
      text: "This change will be written to " + dialog.file + " (a backup is kept in ~/.local/state/tokenlings/backups):"
      textFormat: Text.PlainText
      wrapMode: Text.Wrap
      color: dialog.foreground
      opacity: 0.8
      font.family: dialog.fontFamily
      font.pixelSize: Style.font.caption
    }
    Rectangle {
      width: parent.width
      height: parent.height - y - buttons.height - Style.space(10)
      color: Style.normalFillFor(dialog.foreground, Color.accent)
      radius: Style.cornerRadius
      Flickable {
        id: lines
        anchors.fill: parent
        anchors.margins: Style.space(6)
        contentHeight: col.implicitHeight
        contentWidth: Math.max(width, col.implicitWidth)
        clip: true
        Column {
          id: col
          Repeater {
            model: dialog.lines
            Text {
              required property string modelData
              text: modelData === "" ? " " : modelData
              textFormat: Text.PlainText
              color: modelData.charAt(0) === "+" && modelData.indexOf("+++") !== 0 ? "#3fb950" : (modelData.charAt(0) === "-" && modelData.indexOf("---") !== 0 ? "#f85149" : dialog.foreground)
              font.family: "monospace"
              font.pixelSize: Style.font.caption
            }
          }
        }
      }
    }
    Row {
      id: buttons
      anchors.right: parent.right
      spacing: Style.space(8)
      Button {
        text: "Cancel"
        bordered: true
        hasCursor: dialog.choice === 0
        foreground: dialog.foreground
        onClicked: dialog.finish(false)
      }
      Button {
        text: "Write"
        bordered: true
        hasCursor: dialog.choice === 1
        foreground: dialog.foreground
        onClicked: dialog.finish(true)
      }
    }
  }
}
