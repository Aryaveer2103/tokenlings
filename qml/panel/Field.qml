import QtQuick
import qs.Commons
import qs.Ui

// One row of the Tokenlings panel: a label and a control, driven by the
// mouse or by the panel's keyboard cursor (Up/Down picks the row, Left/Right
// adjusts it, Enter activates it). Every text it shows is plain text.
//
// kind
//   choice    ‹ value ›: Left/Right steps through options
//   toggle    a switch: Enter or Left/Right flips it
//   slider    0..1 (min, max, step): Left/Right nudges it
//   text      a text field: Enter edits, Enter again (or leaving it) commits
//   chips     several options, each on or off (accessories): Left/Right
//             moves along them, Enter flips the one under the cursor
//   swatches  colour presets plus "#RRGGBB" text: Left/Right picks a preset
//   buttons   a row of actions: Left/Right picks one, Enter runs it; an
//             option with dim: true is done already (Connected), drawn faded
//   info      a value to read, nothing to change
Item {
  id: field

  property string kind: "choice"
  property string label: ""
  property string hint: ""
  property var options: []            // strings, or { value, label }
  property var value: ""
  property real min: 0
  property real max: 1
  property real step: 0.05
  property bool hasCursor: false
  property int sub: 0                 // chips / buttons / swatches: the item under the cursor
  property color foreground: Color.foreground
  property color accent: Color.accent
  property string fontFamily: Style.font.family
  readonly property bool editing: textInput.activeFocus

  signal changed(var value)
  signal pressed(var which)           // buttons: the action's value
  signal hovered()

  function optValue(o) { return o !== null && typeof o === "object" ? o.value : o }
  function optLabel(o) { return o !== null && typeof o === "object" ? String(o.label) : String(o) }
  function indexOf(v) { for (var i = 0; i < options.length; i++) if (optValue(options[i]) === v) return i; return -1 }
  function has(v) { return Array.isArray(value) && value.indexOf(v) !== -1 }

  function adjust(d) {
    if (kind === "choice" && options.length) {
      var i = indexOf(value)
      changed(optValue(options[((i < 0 ? 0 : i) + d + options.length) % options.length]))
    } else if (kind === "toggle") changed(!value)
    else if (kind === "slider") changed(Math.max(min, Math.min(max, Math.round((Number(value) + d * step) / step) * step)))
    else if (kind === "chips" || kind === "buttons" || kind === "swatches") sub = Math.max(0, Math.min(options.length - 1, sub + d))
  }
  function activate() {
    if (kind === "toggle") changed(!value)
    else if (kind === "choice") adjust(1)
    else if (kind === "text") { if (textInput.activeFocus) commit(); else textInput.forceActiveFocus() }
    else if (kind === "chips" && options.length) toggleChip(optValue(options[sub]))
    else if (kind === "buttons" && options.length) pressed(optValue(options[sub]))
    else if (kind === "swatches" && options.length) changed(optValue(options[sub]))
  }
  function toggleChip(v) {
    var list = Array.isArray(value) ? value.slice() : []
    var k = list.indexOf(v)
    if (k === -1) list.push(v); else list.splice(k, 1)
    changed(list)
  }
  function commit() {
    var t = String(textInput.text)
    textInput.focus = false
    if (t !== String(value)) changed(t)
  }

  implicitHeight: Math.max(Style.spacing.controlHeight, kind === "chips" || kind === "swatches" ? chipFlow.implicitHeight + 4 : 0)
  width: parent ? parent.width : 300

  // the cursor's mark: a soft fill behind the whole row
  Rectangle {
    anchors.fill: parent
    anchors.margins: -2
    radius: Style.cornerRadius
    color: field.hasCursor ? Style.hoverFillFor(field.foreground, field.accent) : "transparent"
  }

  Text {
    id: labelText
    visible: field.label !== ""
    // a switch or a value to read needs little room: the label takes the rest
    width: field.kind === "buttons" ? (field.label ? Math.round(field.width * 0.36) : 0) : field.kind === "toggle" ? field.width - 70 : field.kind === "info" ? Math.round(field.width * 0.3) : Math.round(field.width * 0.36)
    anchors.left: parent.left
    anchors.leftMargin: 4
    anchors.verticalCenter: field.kind === "chips" || field.kind === "swatches" ? undefined : parent.verticalCenter
    y: 6
    text: field.label
    textFormat: Text.PlainText
    elide: Text.ElideRight
    color: field.foreground
    opacity: 0.75
    font.family: field.fontFamily
    font.pixelSize: Style.font.bodySmall
  }

  Item {
    id: control
    anchors.left: labelText.visible && labelText.width > 0 ? labelText.right : parent.left
    anchors.leftMargin: labelText.visible && labelText.width > 0 ? 8 : 4
    anchors.right: parent.right
    anchors.rightMargin: 4
    height: parent.height

    // choice: ‹ value ›
    Row {
      visible: field.kind === "choice"
      anchors.verticalCenter: parent.verticalCenter
      anchors.right: parent.right
      spacing: 6
      Text {
        text: "‹"; textFormat: Text.PlainText; color: field.foreground; opacity: 0.6
        font.family: field.fontFamily; font.pixelSize: Style.font.title
        MouseArea { anchors.fill: parent; anchors.margins: -6; cursorShape: Qt.PointingHandCursor; onClicked: field.adjust(-1) }
      }
      Text {
        width: Math.min(implicitWidth, control.width - 40)
        text: { var i = field.indexOf(field.value); return i >= 0 ? field.optLabel(field.options[i]) : String(field.value) }
        textFormat: Text.PlainText; elide: Text.ElideRight; color: field.foreground
        font.family: field.fontFamily; font.pixelSize: Style.font.body; font.bold: field.hasCursor
        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: field.adjust(1) }
      }
      Text {
        text: "›"; textFormat: Text.PlainText; color: field.foreground; opacity: 0.6
        font.family: field.fontFamily; font.pixelSize: Style.font.title
        MouseArea { anchors.fill: parent; anchors.margins: -6; cursorShape: Qt.PointingHandCursor; onClicked: field.adjust(1) }
      }
    }

    ToggleSwitch {
      visible: field.kind === "toggle"
      anchors.verticalCenter: parent.verticalCenter
      anchors.right: parent.right
      checked: field.value === true
      foreground: field.foreground
      accent: field.accent
      interactive: false
      MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: field.changed(!field.value) }
    }

    PanelSlider {
      visible: field.kind === "slider"
      anchors.verticalCenter: parent.verticalCenter
      width: parent.width
      value: Number(field.value) || 0
      minimum: field.min
      maximum: field.max
      step: field.step
      fillColor: field.foreground
      knobColor: field.foreground
      onReleased: function(v) { field.changed(Math.round(v / field.step) * field.step) }
    }

    TextField {
      id: textInput
      visible: field.kind === "text"
      anchors.verticalCenter: parent.verticalCenter
      width: parent.width
      verticalPadding: 3
      text: field.kind === "text" ? String(field.value) : ""
      hasCursor: field.hasCursor
      foreground: field.foreground
      accent: field.accent
      maximumLength: field.max > 1 ? field.max : 512
      onAccepted: field.commit()
      onActiveFocusChanged: if (!activeFocus && field.kind === "text" && String(text) !== String(field.value)) field.changed(String(text))
      Keys.onEscapePressed: { text = String(field.value); focus = false }
    }

    Flow {
      id: chipFlow
      visible: field.kind === "chips" || field.kind === "swatches" || field.kind === "buttons"
      anchors.verticalCenter: field.kind === "buttons" ? parent.verticalCenter : undefined
      y: 2
      width: parent.width
      spacing: 4
      Repeater {
        model: chipFlow.visible ? field.options : []
        Rectangle {
          required property var modelData
          required property int index
          readonly property var v: field.optValue(modelData)
          readonly property bool on: field.kind === "chips" ? field.has(v) : field.kind === "swatches" ? String(field.value).toUpperCase() === String(v).toUpperCase() : false
          readonly property bool cur: field.hasCursor && field.sub === index
          readonly property bool dim: modelData !== null && typeof modelData === "object" && modelData.dim === true
          opacity: dim ? 0.45 : 1
          width: field.kind === "swatches" ? 20 : chipText.implicitWidth + 14
          height: field.kind === "swatches" ? 20 : Style.spacing.controlHeight - 6
          radius: field.kind === "swatches" ? 10 : Style.cornerRadius
          color: field.kind === "swatches" ? String(v) : dim ? "transparent" : (on ? Style.selectedFillFor(field.foreground, field.accent) : (cur || chipMouse.containsMouse ? Style.hoverFillFor(field.foreground, field.accent) : Style.normalFillFor(field.foreground, field.accent)))
          border.width: cur || on ? 2 : 1
          border.color: cur ? field.accent : (on ? field.foreground : Qt.rgba(field.foreground.r, field.foreground.g, field.foreground.b, 0.25))
          Text {
            id: chipText
            visible: field.kind !== "swatches"
            anchors.centerIn: parent
            text: field.optLabel(parent.modelData)
            textFormat: Text.PlainText
            color: field.foreground
            font.family: field.fontFamily
            font.pixelSize: Style.font.bodySmall
            font.bold: parent.on
          }
          MouseArea {
            id: chipMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: parent.dim ? Qt.ArrowCursor : Qt.PointingHandCursor
            onEntered: field.sub = parent.index
            onClicked: {
              field.sub = parent.index
              if (field.kind === "chips") field.toggleChip(parent.v)
              else if (field.kind === "buttons") field.pressed(parent.v)
              else field.changed(parent.v)
            }
          }
        }
      }
    }

    Text {
      visible: field.kind === "info"
      anchors.verticalCenter: parent.verticalCenter
      anchors.right: parent.right
      width: Math.min(implicitWidth, parent.width)
      horizontalAlignment: Text.AlignRight
      text: String(field.value)
      textFormat: Text.PlainText
      elide: Text.ElideMiddle
      color: field.foreground
      font.family: field.fontFamily
      font.pixelSize: Style.font.bodySmall
    }
  }

  // a text row follows its value when it changes elsewhere (not while typing)
  onValueChanged: if (kind === "text" && !textInput.activeFocus) textInput.text = String(value)

  HoverHandler { onHoveredChanged: if (hovered) field.hovered() }
}
