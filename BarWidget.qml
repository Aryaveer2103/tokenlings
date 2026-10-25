import QtQuick
import qs.Commons
import qs.Ui
import "qml"

// The pets' home slot in the bar. It draws nothing that moves: the pets render
// in the service's stage surface laid over this slot, so their frames never
// repaint the bar. This item reserves the width, anchors tooltips and hosts
// the panel.
BarWidget {
  id: root
  moduleName: "io.github.aryaveer2103.tokenlings"

  // The service starts independently of the bar and publishes itself on the hub.
  readonly property var service: Hub.service
  property var registeredWith: null
  function syncHome() {
    if (registeredWith === service) return
    if (registeredWith) registeredWith.unregisterHome(root)
    registeredWith = service
    if (service) service.registerHome(root)
  }
  onServiceChanged: {
    syncHome()
    injectPanel()
  }
  Component.onCompleted: syncHome()
  Component.onDestruction: if (registeredWith) registeredWith.unregisterHome(root)

  implicitWidth: vertical ? barSize : (service ? service.slotWidthFor(root) : barSize) + 4
  implicitHeight: vertical ? (service ? service.slotWidthFor(root) : barSize) + 4 : barSize

  // ---- tooltips (shown for the pet under the pointer; text is plain)
  function showPetTooltip(text) { if (bar) bar.showTooltip(root, String(text)) }
  function hidePetTooltip() { if (bar) bar.hideTooltip(root) }

  // ---- panel contract (see omarchy.clock)
  readonly property bool opened: panelLoader.item ? panelLoader.item.opened === true : false
  readonly property bool popoutSwitchClosing: panelLoader.item ? panelLoader.item.popoutSwitchClosing === true : false
  function open() { if (panelLoader.item) panelLoader.item.open() }
  function close() { if (panelLoader.item) panelLoader.item.close() }
  function toggle() { if (panelLoader.item) panelLoader.item.toggle() }
  function togglePanel() { toggle() }
  function closeForPopoutSwitch() { if (panelLoader.item) panelLoader.item.closeForPopoutSwitch() }
  // the panel on a given page (IPC editor, the first-run welcome)
  function openPage(page) {
    if (!panelLoader.item) return
    panelLoader.item.show(page || "pets")
    panelLoader.item.open()
  }

  // First run (no pets.json, never welcomed): the panel opens on Welcome once,
  // from the main bar, a moment after the shell has settled.
  property bool welcomeShown: false
  readonly property bool welcomeDue: !!service && service.welcomePending && service.homes[service.mainHome] === root && !welcomeShown
  onWelcomeDueChanged: if (welcomeDue) welcomeTimer.restart()
  Timer {
    id: welcomeTimer
    interval: 2500
    onTriggered: if (root.welcomeDue) { root.welcomeShown = true; root.openPage("welcome") }
  }

  function injectPanel() {
    var target = panelLoader.item
    if (!target) return
    if ("bar" in target) target.bar = root.bar
    if ("settings" in target) target.settings = root.settings
    if ("anchorItem" in target) target.anchorItem = root
    if ("hostWidget" in target) target.hostWidget = root
    if ("service" in target) target.service = root.service
  }
  onSettingsChanged: injectPanel()

  Loader {
    id: panelLoader
    active: true
    source: Qt.resolvedUrl("Panel.qml")
    visible: false
    onLoaded: {
      root.injectPanel()
      Qt.callLater(root.injectPanel)
    }
  }

  // Bench only (`omarchy-shell tokenlings drawIn bar`): the same pets drawn
  // inside the bar window, to measure what the stage surface saves.
  Row {
    id: inBar
    anchors.centerIn: parent
    spacing: root.service ? root.service.petGap : 2
    visible: root.service !== null && root.service.surface === "bar"
    Repeater {
      model: inBar.visible ? root.service.pets : []
      Pet {
        required property var modelData
        rig: modelData.state
        art: modelData.art
        size: Math.round(root.service.petSizeFor(root.barSize) * modelData.sizeFactor)
        renderer: root.service.renderer
      }
    }
  }

  // The slot itself is clickable only where no pet covers it (the stage takes
  // the pets' area): a click on the gap opens the panel.
  MouseArea {
    anchors.fill: parent
    acceptedButtons: Qt.LeftButton | Qt.RightButton
    onClicked: root.toggle()
  }
}
