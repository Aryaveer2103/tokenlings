import QtQuick
import Quickshell
import Quickshell.Wayland

// A pet out on a desktop trip, drawn on its own surface for the length of the
// trip (created when it sets off, destroyed when it is home). The pet's rig
// is the same one the bar's stage animates; the trip's offsets carry it from
// its slot across the windows and back.
//
// Two ways to host it (benchmarked in Phase 6, .dev/bench/*-desktop.md):
//   overlay  a transparent surface over the whole output, input only where
//            the pet is
//   mover    a small surface that follows the pet, re-centred (through its
//            layer-shell margins) whenever the pet nears its edge
PanelWindow {
  id: trip

  required property var engine
  required property var stageScreen
  required property int petIndex
  required property var origin         // { x, y, size, cellHeight }: the pet at its slot, screen px
  property string strategy: "mover"

  readonly property var entry: engine.pets[petIndex] || null
  readonly property real size: origin ? origin.size : 28
  readonly property real unit: size / 32
  readonly property bool overlay: strategy === "overlay"
  readonly property var off: engine.explorerOffset      // grid units, the trip's offset now

  // mover: the box is a few pets wide; it jumps to re-centre on the pet
  readonly property real box: Math.round(size * 5)
  property real boxX: 0
  property real boxY: 0
  function recentre() {
    if (!origin) return
    var px = origin.x + off.x * unit + size / 2, py = origin.y + off.y * unit + size / 2
    if (Math.abs(px - (boxX + box / 2)) > box * 0.22 || Math.abs(py - (boxY + box / 2)) > box * 0.22 || (boxX === 0 && boxY === 0)) {
      boxX = Math.round(px - box / 2)
      boxY = Math.round(py - box / 2)
    }
  }
  onOffChanged: if (!overlay) recentre()
  Component.onCompleted: if (!overlay) recentre()

  screen: stageScreen
  color: "transparent"
  surfaceFormat.opaque: false
  exclusionMode: ExclusionMode.Ignore
  WlrLayershell.namespace: "tokenlings-trip"
  WlrLayershell.layer: WlrLayer.Top
  WlrLayershell.keyboardFocus: WlrKeyboardFocus.None

  anchors {
    top: true
    left: true
    right: trip.overlay
    bottom: trip.overlay
  }
  margins {
    left: trip.overlay ? 0 : trip.boxX
    top: trip.overlay ? 0 : trip.boxY
  }
  implicitWidth: overlay ? 0 : box
  implicitHeight: overlay ? 0 : box

  // The pet, placed where its slot is; its rig's offsets do the travelling.
  Item {
    id: holder
    x: trip.overlay ? 0 : -trip.boxX
    y: trip.overlay ? 0 : -trip.boxY

    Pet {
      id: pet
      x: trip.origin ? trip.origin.x : 0
      y: trip.origin ? trip.origin.y + trip.origin.cellHeight - height : 0
      rig: trip.entry ? trip.entry.state : null
      art: trip.entry ? trip.entry.art : null
      size: trip.size
      dpr: trip.screen ? trip.screen.devicePixelRatio : 1
      renderer: trip.engine.renderer
      perchDepth: 9
    }
    MouseArea {
      id: hit
      readonly property var rig: pet.r
      x: pet.x + (rig ? rig.x * trip.unit : 0)
      y: pet.y + (rig ? (rig.y + rig.lift + rig.perch * 9) * trip.unit : 0)
      width: pet.width
      height: pet.height
      hoverEnabled: true
      acceptedButtons: Qt.LeftButton | Qt.MiddleButton | Qt.RightButton
      cursorShape: Qt.PointingHandCursor
      onEntered: trip.engine.hoverPet(trip.petIndex, true, trip.engine.explorer ? trip.engine.explorer.home : null)
      onExited: trip.engine.hoverPet(trip.petIndex, false, trip.engine.explorer ? trip.engine.explorer.home : null)
      onClicked: function(mouse) { trip.engine.clickPet(trip.petIndex, mouse.button, trip.engine.explorer ? trip.engine.explorer.home : null) }
      onWheel: function(wheel) { trip.engine.patPet(trip.petIndex) }
    }
    FxLayer {
      engine: trip.engine
      petAt: function(i) { return i === trip.petIndex ? { x: pet.x, y: pet.y, width: pet.width } : null }
      unit: trip.unit
      dpr: pet.dpr
    }
  }

  mask: Region { item: hit }

  Connections {
    target: holder.Window.window
    function onFrameSwapped() {
      trip.engine.countFrame()
      if (!trip.engine.explorerShown) trip.engine.explorerShown = true
    }
  }
}
