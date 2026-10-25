import QtQuick
import QtQuick.Window
import ".."
import "../../core/compose.mjs" as Compose

// A pet drawn in the panel: the live one (its rig is the engine's, so it
// moves as the bar's does) or a still one composed from a look (the editor's
// draft, a disabled pet, a welcome proposal).
Item {
  id: preview
  property var art: null                // ready art (a live pet's), or…
  property var look: null               // …a look to compose
  property string provider: ""
  property var theme: ({ foreground: "#ffffff", background: "#000000", accent: "#88aaff", mode: "dark" })
  property var evolved: null
  property var liveRig: null
  property real size: 40
  property bool dim: false

  readonly property var shown: art ? art : (look ? Compose.compose(look, theme, provider, { evolved: evolved }) : null)

  // a little hop when the look changes (the editor), on the still rig only
  function bounce() { if (!liveRig) hop.restart() }
  Rig { id: still }
  SequentialAnimation {
    id: hop
    NumberAnimation { target: still; property: "sy"; to: 0.85; duration: 70 }
    ParallelAnimation {
      NumberAnimation { target: still; property: "sy"; to: 1.1; duration: 120 }
      NumberAnimation { target: still; property: "y"; to: -4; duration: 150; easing.type: Easing.OutQuad }
    }
    NumberAnimation { target: still; property: "y"; to: 0; duration: 150; easing.type: Easing.InQuad }
    NumberAnimation { target: still; property: "sy"; to: 1; duration: 160; easing.type: Easing.OutBack }
  }

  width: size
  height: size
  opacity: dim ? 0.45 : 1
  Pet {
    rig: preview.liveRig || still
    art: preview.shown
    size: preview.size
    dpr: Screen.devicePixelRatio || 1
    renderer: "baked"
  }
}
