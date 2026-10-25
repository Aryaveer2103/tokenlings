import QtQuick
import Quickshell
import Quickshell.Wayland
import Quickshell.Hyprland

// The pets' own surface: a transparent, click-through layer-shell strip laid
// over the bar's edge of one screen. Pets never live inside the bar window, so
// animating them repaints this small surface instead of the whole bar.
// Input reaches it only through the mask (the pets' row, plus any pet that is
// away from it); everything else falls through to the bar and the windows below.
//
// At rest the strip is only as long as the row plus a pet on each side. While
// one of its pets is out on a trip along the bar, or dragged and flung, it
// spans the whole bar (widened before the pet moves, narrowed after it is home).
PanelWindow {
  id: stage

  // Named engine, not service: `service: service` in the owner would bind the
  // property to itself.
  required property var engine
  required property var home          // the bar widget reserving the slot on this screen
  readonly property string edge: engine.barPosition
  readonly property bool vertical: edge === "left" || edge === "right"

  // The bar window the slot lives in, and where the slot sits along it.
  readonly property var barWindow: home ? home.QsWindow.window : null
  readonly property real thickness: barWindow ? (vertical ? barWindow.width : barWindow.height) : engine.barSize
  readonly property real barLength: barWindow ? (vertical ? barWindow.height : barWindow.width) : 0
  readonly property real headroom: Math.round(thickness * 0.6)

  // Which pets live on this bar.
  readonly property var indices: engine.petsOn(home)

  // A fullscreen window on this monitor hides this bar's pets (the others carry
  // on). Hyprland's hasFullscreen is also true for a maximized window, which
  // leaves the bar in sight: only a window in real fullscreen (mode 2) covers it.
  readonly property var hyprMonitor: screen ? Hyprland.monitorFor(screen) : null
  readonly property var hyprWorkspace: hyprMonitor ? hyprMonitor.activeWorkspace : null
  readonly property bool fullscreenHint: !!hyprWorkspace && hyprWorkspace.hasFullscreen === true
  property bool covered: false
  onFullscreenHintChanged: fullscreenCheck.restart()
  onHyprWorkspaceChanged: fullscreenCheck.restart()
  Connections {
    target: Hyprland
    function onRawEvent(event) { if (String(event.name) === "fullscreen" && stage.fullscreenHint) fullscreenCheck.restart() }
  }
  Timer {
    id: fullscreenCheck
    interval: 60
    onTriggered: {
      if (!stage.fullscreenHint) { stage.covered = false; return }
      Hyprland.refreshToplevels()
      fullscreenRead.restart()
    }
  }
  Timer {
    id: fullscreenRead
    interval: 180
    onTriggered: {
      var ws = stage.hyprWorkspace, list = Hyprland.toplevels ? Hyprland.toplevels.values : [], real = false
      for (var i = 0; ws && i < list.length; i++) {
        var ipc = list[i] ? list[i].lastIpcObject : null
        if (ipc && ipc.workspace && ipc.workspace.id === ws.id && Number(ipc.fullscreen) >= 2) real = true
      }
      stage.covered = stage.fullscreenHint && real
    }
  }

  // mapToItem is one-shot; the watcher's transform changes whenever anything
  // between the bar's content item and the slot moves, which re-evaluates it.
  TransformWatcher {
    id: slotWatcher
    a: stage.barWindow ? stage.barWindow.contentItem : null
    b: stage.home
  }
  readonly property point slotPos: {
    slotWatcher.transform
    if (!home || !barWindow) return Qt.point(0, 0)
    return home.mapToItem(barWindow.contentItem, 0, 0)
  }

  readonly property real petSize: engine.petSizeFor(thickness)
  readonly property real gap: engine.petGap

  function describe() {
    return { screen: screen ? screen.name : null, visible: visible, covered: covered, wide: wide, thickness: thickness,
             along: Math.round(vertical ? slotPos.y : slotPos.x), width: width, height: height, petSize: petSize, pets: indices }
  }

  screen: barWindow ? barWindow.screen : null
  visible: home !== null && barWindow !== null && !engine.hidden && !covered && engine.surface === "stage"
  color: "transparent"
  surfaceFormat.opaque: false
  exclusionMode: ExclusionMode.Ignore
  WlrLayershell.namespace: "tokenlings-stage"
  WlrLayershell.layer: WlrLayer.Top
  WlrLayershell.keyboardFocus: WlrKeyboardFocus.None

  // The surface is only as long as the pets' row plus a pet's width of room on
  // each side: every frame redraws the whole surface, so a full-length strip
  // would pay for empty pixels. It is pinned to the bar's edge and slid along
  // it with a margin.
  readonly property real along: vertical ? slotPos.y : slotPos.x
  readonly property real pad: petSize
  readonly property real rowLength: Math.max(petSize, indices.length * (petSize + gap) - gap)
  readonly property bool wide: engine.wideOn(home) && !vertical && barLength > 0
  readonly property real start: wide ? 0 : Math.max(0, Math.round(along - pad))

  anchors {
    // Pinned to the bar's edge, and to the start of the cross axis so the
    // margin can slide it along the bar.
    top: edge === "top" || vertical
    bottom: edge === "bottom"
    left: edge === "left" || !vertical
    right: edge === "right"
  }
  margins {
    left: vertical ? 0 : start
    top: vertical ? start : 0
  }
  implicitWidth: vertical ? thickness + headroom : (wide ? barLength : rowLength + 2 * pad)
  implicitHeight: vertical ? rowLength + 2 * pad : thickness + headroom

  // The pets' row inside the surface: aligned with the slot along the bar and
  // centred across the bar's thickness.
  readonly property real inset: Math.max(0, Math.round((thickness - petSize) / 2))
  PetRow {
    id: row
    readonly property real alongInSurface: stage.along - stage.start
    x: stage.vertical ? (stage.edge === "left" ? stage.inset : stage.headroom + stage.inset) : alongInSurface
    y: stage.vertical ? alongInSurface : (stage.edge === "top" ? stage.inset : stage.headroom + stage.inset)
    engine: stage.engine
    indices: stage.indices
    petSize: stage.petSize
    gap: stage.gap
    vertical: stage.vertical
    dpr: stage.screen ? stage.screen.devicePixelRatio : 1
    // Under a top bar there is little room above the pets: hops stay lower.
    hopScale: stage.edge === "top" ? 0.55 : 1
    perchDepth: stage.perchUnits
    hiddenPet: stage.engine.explorerShown && stage.engine.explorer && stage.engine.explorer.home === stage.home ? stage.engine.explorer.index : -1
    interactive: true
    home: stage.home
    renderer: stage.engine.renderer
  }

  // Sitting on the bar's window-facing edge, legs over it: under a top bar the
  // pet drops until its hips meet the bar's lower edge; above a bottom bar it
  // rises onto the bar's upper edge.
  readonly property real perchUnits: {
    var u = petSize / 32
    if (edge === "top") return (thickness - inset - petSize) / u + 9
    if (edge === "bottom") return -((inset + petSize) / u - 9)
    return 0
  }

  // ---- geometry for trips (core/roam.mjs), in bar pixels
  // Other widgets on the bar, as [start, end] spans: found by walking the bar
  // window's items for anything that looks like a bar widget (read-only, once
  // per trip; no widget is touched).
  function pills() {
    var out = []
    var root = barWindow ? barWindow.contentItem : null
    if (!root) return out
    var todo = [[root, 0]], seen = 0
    while (todo.length && seen < 4000) {
      var e = todo.pop(), it = e[0]
      seen++
      if (!it || it.visible === false) continue
      if (it !== home && typeof it.moduleName === "string" && it.moduleName !== "" && it.width > 4 && it.height > 4) {
        var p = it.mapToItem(root, 0, 0)
        var a = vertical ? p.y : p.x, len = vertical ? it.height : it.width
        if (len < barLength * 0.6) out.push([Math.round(a), Math.round(a + len)])
        continue
      }
      if (e[1] < 14) { var kids = it.children || []; for (var k = 0; k < kids.length; k++) todo.push([kids[k], e[1] + 1]) }
    }
    out.sort(function(x, y) { return x[0] - y[0] })
    return out
  }
  // What the trip planner needs for pet i, or null (vertical bars stay home).
  function roamInput(i) {
    if (vertical || !barWindow || row.localOf(i) < 0) return null
    var u = row.unitOf(i)
    var size = u * 32
    var homePx = along + row.cellX(i) + size / 2
    var own = [Math.round(along - 2), Math.round(along + rowLength + 2)]
    return {
      pet: i, unit: u, home: homePx, lo: size / 2 + 2, hi: barLength - size / 2 - 2,
      obstacles: pills().filter(function(s) { return s[1] < own[0] || s[0] > own[1] }),
      // standing on a pill's top: only above a bottom bar is there room
      pillLift: edge === "bottom" ? -Math.max(0, (inset + petSize - 4) / u) : 0,
      arcRoom: edge === "top" ? Math.max(1.5, inset / u) : 6,
      reach: 300, hopPx: size * 0.4
    }
  }
  // Where pet i's item stands at its slot, in this screen's logical pixels
  // (the excursion surface draws it from there; the rig's offsets move it).
  function petOrigin(i) {
    var c = row.cellOf(i)
    if (!c) return null
    var sx = (vertical ? 0 : start) + row.x + c.x
    var sy = (vertical ? start : 0) + row.y + c.y
    if (edge === "bottom" && screen) sy += screen.height - height
    if (edge === "right" && screen) sx += screen.width - width
    return { x: sx, y: sy, size: c.size, cellHeight: c.height }
  }
  // The feet of pet i at its slot, in screen pixels (the planner's `home`).
  function petFeet(i) {
    var o = petOrigin(i)
    if (!o) return null
    return { x: o.x + o.size / 2, y: o.y + o.cellHeight - o.size * (32 - 30.6) / 32 }
  }

  // Input: the row, plus whichever pets are away from it (a trip, a fling).
  readonly property var movers: engine.moversOn(home)
  mask: Region {
    item: row
    Region { item: stage.movers.length > 0 ? row.hitOf(stage.movers[0]) : null }
    Region { item: stage.movers.length > 1 ? row.hitOf(stage.movers[1]) : null }
  }

  // Frame counter: every committed frame of this surface, so "zero frames at
  // rest" is a number, not an impression.
  Connections {
    target: row.Window.window
    function onFrameSwapped() { stage.engine.countFrame() }
  }
}
