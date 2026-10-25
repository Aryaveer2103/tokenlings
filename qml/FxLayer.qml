import QtQuick

// The FX pool drawn over a row of pets: a fixed set of slots (≤ 16) the
// engine moves, turns, scales and fades. Each slot builds the art of a kind
// only once it has shown that kind, then keeps it baked.
Item {
  id: root

  required property var engine
  required property var petAt          // function(index) → the pet's item in this row
  property real unit: 1                // px per grid unit of a medium pet
  property real dpr: 1
  readonly property var fxArt: engine.fxArt
  readonly property var box: fxArt ? fxArt.box : [-4, -4, 8, 8]

  Repeater {
    model: root.engine.fxSlots
    Item {
      id: slot
      required property var modelData
      readonly property var pet: modelData.pet >= 0 ? root.petAt(modelData.pet) : null
      readonly property real petUnit: pet ? pet.width / 32 : root.unit
      visible: modelData.kind !== "" && pet !== null
      x: (pet ? pet.x : 0) + modelData.x * petUnit
      y: (pet ? pet.y : 0) + modelData.y * petUnit
      opacity: modelData.a
      property var kinds: []
      onVisibleChanged: if (visible && kinds.indexOf(modelData.kind) === -1) kinds = kinds.concat([modelData.kind])
      Connections {
        target: slot.modelData
        function onKindChanged() { if (slot.modelData.kind && slot.kinds.indexOf(slot.modelData.kind) === -1) slot.kinds = slot.kinds.concat([slot.modelData.kind]) }
      }
      transform: [
        Rotation { angle: slot.modelData.rot },
        Scale { xScale: slot.modelData.s; yScale: slot.modelData.s }
      ]
      Repeater {
        model: slot.kinds
        ArtGroup {
          required property string modelData
          visible: slot.modelData.kind === modelData
          layers: root.fxArt ? root.fxArt.kinds[modelData] || [] : []
          box: root.box
          unit: slot.petUnit
          dpr: root.dpr
        }
      }
    }
  }
}
