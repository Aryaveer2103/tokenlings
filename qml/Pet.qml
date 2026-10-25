import QtQuick

// One pet as a rig built from composed parts (core/compose.mjs):
//
//   seat (back)                          chair, hammock: on the ground
//   shadow
//   hopper (x, y + lift)
//     aura
//     squash (scale about the feet × facing, lean)
//       behind · body · pawL · pawR (turn about the shoulders)
//       face (slides toward the gaze) → face art, mouth, eyes (gaze, blink)
//       topper (springs about the head top)
//       front
//       hand prop (turns and slides about its pivot)
//     seat (front)                       cushion and armrests, kept on the ground
//     desk prop                          laptop, terminal, blanket
//     over prop                          emotes and bubbles
//
// Per frame only the transforms of these un-layered parents change, plus the
// visibility of baked swaps (expressions, props); each group's art is baked
// into a texture once (see ArtGroup), so animation never re-rasterises.
Item {
  id: root

  required property QtObject rig    // see Rig.qml
  // a pet being torn down (a cast swapped, a trip over) can lose its rig a
  // frame before its item goes: it shows a resting pose meanwhile
  Rig { id: resting }
  readonly property QtObject r: rig || resting
  property var art: null            // compose() result
  property string renderer: "baked"
  property real size: 28            // logical px, the pet's box
  property real dpr: 1
  property real hopScale: 1         // < 1 under a top bar: hops have less room above
  property real perchDepth: 9       // grid units down (or up, < 0) to sit on the edge below the pet
  property color shadowColor: art ? art.tokens.shadow : "#808080"

  readonly property bool baked: renderer === "baked"
  // "none" (bench only): the rig still animates but nothing is drawn, which
  // separates the clock's own cost from the cost of painting frames.
  visible: renderer !== "none" && art !== null
  readonly property real unit: size / 32   // art is authored on a 32×32 grid
  readonly property var groups: art ? art.groups : ({})
  readonly property var pivots: art ? art.pivots : ({ feet: [16, 30.6], top: [16, 10], eyeY: 20, shoulderL: [8, 22], shoulderR: [24, 22] })
  readonly property real feetY: 30.6 * unit
  readonly property var props: art ? art.props : ({})
  // Swap slots build a delegate only for names the rig has actually shown, so
  // a pet that never reads a scroll never creates one.
  property var eyeNames: []
  property var mouthNames: []
  property var seatNames: []
  property var deskNames: []
  property var handNames: []
  property var overNames: []
  function asTable(names) { var t = {}; for (var i = 0; i < names.length; i++) t[names[i]] = true; return t }
  readonly property var eyeTable: art ? asTable(art.eyeNames) : ({})
  readonly property var mouthTable: art ? asTable(art.mouthNames) : ({})
  function remember(list, name, table) {
    if (!name || !table || !(name in table) || list.indexOf(name) !== -1) return list
    return list.concat([name])
  }
  function rememberAll() {
    if (!art) return
    eyeNames = remember(eyeNames, r.eyes, eyeTable)
    mouthNames = remember(mouthNames, r.mouth, mouthTable)
    seatNames = remember(seatNames, r.seat, props)
    deskNames = remember(deskNames, r.desk, props)
    handNames = remember(handNames, r.hand, props)
    overNames = remember(overNames, r.over, props)
  }
  onArtChanged: { eyeNames = []; mouthNames = []; seatNames = []; deskNames = []; handNames = []; overNames = []; rememberAll() }
  Component.onCompleted: rememberAll()
  Connections {
    target: root.r
    function onEyesChanged() { root.eyeNames = root.remember(root.eyeNames, root.r.eyes, root.eyeTable) }
    function onMouthChanged() { root.mouthNames = root.remember(root.mouthNames, root.r.mouth, root.mouthTable) }
    function onSeatChanged() { root.seatNames = root.remember(root.seatNames, root.r.seat, root.props) }
    function onDeskChanged() { root.deskNames = root.remember(root.deskNames, root.r.desk, root.props) }
    function onHandChanged() { root.handNames = root.remember(root.handNames, root.r.hand, root.props) }
    function onOverChanged() { root.overNames = root.remember(root.overNames, root.r.over, root.props) }
  }
  // Which of the pet's own paws a prop is holding (it draws them itself).
  readonly property string holds: (rig.desk && props[rig.desk] ? props[rig.desk].holds : "") + (rig.hand && props[rig.hand] ? props[rig.hand].holds : "")

  width: size
  height: size
  opacity: rig.alpha

  // Seat, back half: stays on the ground while the pet hops.
  Repeater {
    model: root.seatNames
    ArtGroup {
      required property string modelData
      visible: root.r.seat === modelData
      lazy: true
      layers: root.art.propArt(modelData).back
      box: root.props[modelData].box
      unit: root.unit; baked: root.baked; dpr: root.dpr
    }
  }

  // Ground shadow: shrinks while the pet is in the air.
  Rectangle {
    id: shadow
    width: 15 * root.unit
    height: 2.4 * root.unit
    radius: height / 2
    color: root.shadowColor
    opacity: 0.14 * (1 - root.r.perch)
    x: (root.width - width) / 2 + root.r.x * root.unit
    y: (30 + root.r.lift) * root.unit
    visible: root.r.seat === ""
    transform: Scale {
      origin.x: shadow.width / 2
      origin.y: shadow.height / 2
      xScale: root.r.shadow
      yScale: root.r.shadow
    }
  }

  Item {
    id: hopper
    width: root.width
    height: root.height
    x: root.r.x * root.unit
    y: (root.r.y * root.hopScale + root.r.lift + root.r.perch * root.perchDepth) * root.unit

    ArtGroup { layers: root.groups.aura || []; box: [-4, -2, 40, 36]; unit: root.unit; baked: root.baked; dpr: root.dpr }

    Item {
      id: squash
      width: root.width
      height: root.height
      transform: [
        Scale {
          origin.x: squash.width / 2
          origin.y: root.feetY
          xScale: root.r.sx * (root.r.dir < 0 ? -1 : 1)
          yScale: root.r.sy
        },
        Rotation {
          origin.x: squash.width / 2
          origin.y: root.feetY
          angle: root.r.rot
        }
      ]

      ArtGroup { layers: root.groups.behind || []; box: [-2, -4, 36, 36]; unit: root.unit; baked: root.baked; dpr: root.dpr }
      ArtGroup { layers: root.groups.body || []; unit: root.unit; baked: root.baked; dpr: root.dpr }

      Item {
        anchors.fill: parent
        visible: root.holds.indexOf("L") === -1 && root.holds.indexOf("both") === -1
        transform: Rotation { origin.x: root.pivots.shoulderL[0] * root.unit; origin.y: root.pivots.shoulderL[1] * root.unit; angle: root.r.armL }
        ArtGroup { layers: root.groups.pawL || []; unit: root.unit; baked: root.baked; dpr: root.dpr }
      }
      Item {
        anchors.fill: parent
        visible: root.holds.indexOf("R") === -1 && root.holds.indexOf("both") === -1
        transform: Rotation { origin.x: root.pivots.shoulderR[0] * root.unit; origin.y: root.pivots.shoulderR[1] * root.unit; angle: -root.r.armR }
        ArtGroup { layers: root.groups.pawR || []; unit: root.unit; baked: root.baked; dpr: root.dpr }
      }

      Item {
        id: face
        width: parent.width
        height: parent.height
        x: root.r.faceX * root.unit
        y: root.r.faceY * root.unit

        ArtGroup { layers: root.groups.face || []; unit: root.unit; baked: root.baked; dpr: root.dpr }
        Repeater {
          model: root.mouthNames
          ArtGroup {
            required property string modelData
            visible: root.r.mouth === modelData
            lazy: true
            layers: root.art.mouthArt(modelData)
            unit: root.unit; baked: root.baked; dpr: root.dpr
          }
        }
        Item {
          id: eyes
          width: parent.width
          height: parent.height
          x: root.r.gazeX * root.unit
          y: root.r.gazeY * root.unit
          transform: Scale { origin.y: root.pivots.eyeY * root.unit; yScale: root.r.blink }
          Repeater {
            model: root.eyeNames
            ArtGroup {
              required property string modelData
              visible: root.r.eyes === modelData
              lazy: true
              layers: root.art.eyeArt(modelData)
              unit: root.unit; baked: root.baked; dpr: root.dpr
            }
          }
        }
      }

      Item {
        id: topper
        anchors.fill: parent
        transform: Rotation { origin.x: root.pivots.top[0] * root.unit; origin.y: (root.pivots.top[1] + 2) * root.unit; angle: root.r.topRot }
        ArtGroup { layers: root.groups.topper || []; box: [-2, -6, 36, 38]; unit: root.unit; baked: root.baked; dpr: root.dpr }
      }

      ArtGroup { layers: root.groups.front || []; box: [-2, -2, 36, 34]; unit: root.unit; baked: root.baked; dpr: root.dpr }

      Repeater {
        model: root.handNames
        Item {
          required property string modelData
          readonly property var prop: root.props[modelData]
          anchors.fill: parent
          visible: root.r.hand === modelData
          transform: [
            Rotation { origin.x: prop.pivot[0] * root.unit; origin.y: prop.pivot[1] * root.unit; angle: root.r.propRot },
            Translate { x: root.r.propX * root.unit; y: root.r.propY * root.unit }
          ]
          ArtGroup { lazy: true; visible: parent.visible; layers: root.art.propArt(parent.modelData).layers; box: prop.box; unit: root.unit; baked: root.baked; dpr: root.dpr }
        }
      }
    }

    // Seat, front half: the cushion over the pet's lower edge, held on the ground.
    Item {
      width: root.width
      height: root.height
      y: -hopper.y
      Repeater {
        model: root.seatNames
        ArtGroup {
          required property string modelData
          visible: root.r.seat === modelData
          lazy: true
          layers: root.art.propArt(modelData).front
          box: root.props[modelData].box
          unit: root.unit; baked: root.baked; dpr: root.dpr
        }
      }
    }

    Repeater {
      model: root.deskNames
      ArtGroup {
        required property string modelData
        visible: root.r.desk === modelData
        lazy: true
        layers: root.art.propArt(modelData).layers
        box: root.props[modelData].box
        unit: root.unit; baked: root.baked; dpr: root.dpr
      }
    }
    Repeater {
      model: root.overNames
      ArtGroup {
        required property string modelData
        visible: root.r.over === modelData
        lazy: true
        layers: root.art.propArt(modelData).layers
        box: root.props[modelData].box
        unit: root.unit; baked: root.baked; dpr: root.dpr
      }
    }
  }
}
