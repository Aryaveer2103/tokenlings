import QtQuick

// A row of pets standing on a shared floor, with the FX pool over them. The
// bar's stage and the theater (a large review view) both show one; the rigs
// and the pool are the engine's, so both show the same animation.
//
// `indices` picks which of the engine's pets this row shows (each bar shows
// the pets that live on it). A pet out on a desktop trip is drawn by the
// excursion surface instead, so its cell stays empty meanwhile.
Item {
  id: row

  required property var engine
  property var indices: engine.pets.map(function(p, i) { return i })
  property real petSize: 28
  property real dpr: 1
  property real gap: 2
  property real hopScale: 1
  property real perchDepth: 9          // grid units to the edge a perching pet sits on
  property bool interactive: false
  property var home: null              // the bar widget, for tooltips and the panel
  property string renderer: "baked"
  property bool vertical: false        // vertical bars stack the pets
  property int hiddenPet: -1           // drawn elsewhere (out on the desktop)
  readonly property real unit: petSize / 32

  width: line.width
  height: line.height

  function localOf(i) { return indices.indexOf(i) }
  function cellOf(i) { var k = localOf(i); return k >= 0 ? pets.itemAt(k) : null }
  // The pet's hit area (it follows the pet when it walks off its slot).
  function hitOf(i) { var c = cellOf(i); return c ? c.hit : null }
  // Where a pet's cell sits in the row, and how big a grid unit is for it.
  function cellX(i) { var c = cellOf(i); return c ? c.x : 0 }
  function cellY(i) { var c = cellOf(i); return c ? c.y : 0 }
  function unitOf(i) { var c = cellOf(i); return c ? c.size / 32 : unit }

  Grid {
    id: line
    columns: row.vertical ? 1 : Math.max(1, row.indices.length)
    spacing: row.gap
    Repeater {
      id: pets
      model: row.indices
      Item {
        id: cell
        required property int modelData
        readonly property int petIndex: modelData
        readonly property var entry: row.engine.pets[petIndex] || null
        readonly property real size: entry ? Math.round(row.petSize * entry.sizeFactor) : row.petSize
        readonly property real cellUnit: size / 32
        property alias hit: hitArea
        width: size
        height: row.petSize
        Pet {
          id: pet
          y: row.petSize - height
          visible: cell.entry !== null && row.hiddenPet !== cell.petIndex
          rig: cell.entry ? cell.entry.state : null
          art: cell.entry ? cell.entry.art : null
          size: cell.size
          dpr: row.dpr
          hopScale: row.hopScale
          perchDepth: row.perchDepth
          renderer: row.renderer
        }
        // shadow clones: the account's other sessions, as minis beside it
        Repeater {
          model: row.engine.clones && row.engine.clones[cell.petIndex] ? row.engine.clones[cell.petIndex] : []
          Item {
            id: clone
            required property var modelData
            required property int index
            readonly property real size: Math.round(cell.size * 0.55)
            x: cell.size * 0.62 + index * size * 0.5
            y: row.petSize - size
            z: -1 - index
            width: size
            height: size
            opacity: 0.6          // the rig's own alpha still fades it in and out
            Pet {
              rig: clone.modelData.state
              art: cell.entry ? cell.entry.art : null
              size: clone.size
              dpr: row.dpr
              hopScale: row.hopScale
              renderer: row.renderer
            }
          }
        }
        // The pointer. It follows the pet off its slot (walks, trips, flings)
        // so the input mask can stay exactly where pets are; while the pet
        // only leans, hops or bounces in place it stays put: following those
        // slid it out from under a still pointer (leave, enter, the hover
        // clip over the click's, a neighbour's area overlapping).
        MouseArea {
          id: hitArea
          readonly property var rig: cell.entry ? cell.entry.state : null
          readonly property real awayX: rig && Math.abs(rig.x) > 10 ? rig.x : 0
          readonly property real awayY: { var v = rig ? rig.y * row.hopScale + rig.lift + rig.perch * row.perchDepth : 0; return Math.abs(v) > 12 ? v : 0 }
          enabled: row.interactive && pet.visible
          x: awayX * cell.cellUnit
          y: awayY * cell.cellUnit
          width: cell.width
          height: cell.height
          hoverEnabled: true
          preventStealing: true
          acceptedButtons: Qt.LeftButton | Qt.MiddleButton | Qt.RightButton
          cursorShape: dragging ? Qt.ClosedHandCursor : Qt.PointingHandCursor
          property point pressAt: Qt.point(0, 0)        // in row coordinates
          property bool dragging: false
          function rowPoint(mouse) { return mapToItem(row, mouse.x, mouse.y) }
          onEntered: row.engine.hoverPet(cell.petIndex, true, row.home)
          onExited: if (!dragging) row.engine.hoverPet(cell.petIndex, false, row.home)
          onPositionChanged: function(mouse) {
            var p = rowPoint(mouse)
            if (pressed && !dragging && Math.hypot(p.x - pressAt.x, p.y - pressAt.y) > 4) {
              dragging = true
              row.engine.dragPet(cell.petIndex, "start", 0, 0)
            }
            if (dragging) row.engine.dragPet(cell.petIndex, "move", (p.x - pressAt.x) / cell.cellUnit, (p.y - pressAt.y) / (cell.cellUnit * row.hopScale))
            else row.engine.pointAt(cell.petIndex, (mouse.x / width) * 2 - 1, (mouse.y / height) * 2 - 1)
          }
          onPressed: function(mouse) { pressAt = rowPoint(mouse); dragging = false }
          onReleased: if (dragging) { dragging = false; row.engine.dragPet(cell.petIndex, "end", 0, 0) }
          onCanceled: if (dragging) { dragging = false; row.engine.dragPet(cell.petIndex, "end", 0, 0) }
          onClicked: function(mouse) { if (!dragging) row.engine.clickPet(cell.petIndex, mouse.button, row.home) }
          onDoubleClicked: function(mouse) { if (mouse.button === Qt.LeftButton) row.engine.doubleClickPet(cell.petIndex) }
          onWheel: function(wheel) { row.engine.patPet(cell.petIndex) }
        }
      }
    }
  }

  // Pets as items in the row, for the FX layer's positions.
  FxLayer {
    engine: row.engine
    petAt: function(i) {
      if (i === row.hiddenPet) return null
      var c = row.cellOf(i)
      return c && c.children[0] ? { x: c.x, y: c.y + c.children[0].y, width: c.children[0].width } : null
    }
    unit: row.unit
    dpr: row.dpr
  }
}
