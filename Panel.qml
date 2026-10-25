import QtQuick
import qs.Commons
import qs.Ui
import "qml/panel"

// The Tokenlings panel: Pets · Edit · Connect · Behaviour · About, and the
// first-run Welcome. Keyboard: Up/Down moves between rows (the tab strip is
// the top row), Left/Right changes the row under the cursor or switches tabs,
// Enter activates, 1–5 jump to a tab, Escape closes.
//
// Nothing here writes on its own: pets.json changes go through the service
// (checked by the config loader before writing), agent configs only through
// the hook installer after its diff has been shown and confirmed.
Panel {
  id: root
  moduleName: "io.github.aryaveer2103.tokenlings"
  ipcTarget: "io.github.aryaveer2103.tokenlings"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  property var service: null
  readonly property var barIdentity: hostWidget || root
  readonly property color fg: bar ? bar.foreground : Color.foreground
  readonly property string fontFamily: bar && bar.fontFamily ? bar.fontFamily : Style.font.family

  readonly property var tabs: [
    { value: "pets", label: "Pets" }, { value: "edit", label: "Edit" }, { value: "connect", label: "Connect" },
    { value: "behaviour", label: "Behaviour" }, { value: "about", label: "About" }
  ]
  property string page: "pets"
  property string selectedPet: ""          // pet id the Edit and Connect tabs work on
  property int cursor: -1                  // -1: the tab strip; else a row of the page
  property string notice: ""               // one line of feedback (saved, an error)
  // the content lives in KeyboardPanel's component: its parts, once loaded
  readonly property var ui: panel.loadedContent

  function show(pageName, petId) {
    if (petId !== undefined && petId !== "") selectedPet = petId
    page = pageName
    cursor = -1
  }
  function say(text) { notice = String(text || ""); noticeTimer.restart() }
  Timer { id: noticeTimer; interval: 5000; onTriggered: root.notice = "" }

  onOpenedChanged: {
    if (!opened || !service) return
    if (service.welcomePending) page = "welcome"
    if (!selectedPet && service.configPets().length) selectedPet = service.configPets()[0].id
    cursor = -1
  }

  // ---- the keyboard cursor: rows are the page's controls, in reading order
  function rows() {
    var page = ui ? ui.pageLoader.item : null
    var out = [], todo = page ? [page] : [], n = 0
    while (todo.length && n < 2000) {
      var it = todo.shift()
      n++
      if (!it || it.visible === false) continue
      if (typeof it.adjust === "function" && typeof it.activate === "function" && it !== page) { out.push(it); continue }
      var kids = it.children || []
      for (var i = kids.length - 1; i >= 0; i--) todo.unshift(kids[i])
    }
    return out
  }
  function moveCursor(dy) {
    var list = rows()
    cursor = Math.max(-1, Math.min(list.length - 1, cursor + dy))
    syncCursor(list)
  }
  function syncCursor(list) {
    list = list || rows()
    for (var i = 0; i < list.length; i++) if ("hasCursor" in list[i]) list[i].hasCursor = (i === cursor)
    if (cursor >= 0 && list[cursor]) ensureVisible(list[cursor])
    else if (ui) ui.flick.contentY = 0
  }
  function ensureVisible(item) {
    if (!ui) return
    var flick = ui.flick
    var p = item.mapToItem(flick.contentItem, 0, 0)
    if (p.y < flick.contentY) flick.contentY = Math.max(0, p.y - 8)
    else if (p.y + item.height > flick.contentY + flick.height) flick.contentY = Math.min(flick.contentHeight - flick.height, p.y + item.height - flick.height + 8)
  }
  function switchTab(d) {
    var i = 0
    for (var k = 0; k < tabs.length; k++) if (tabs[k].value === page) i = k
    show(tabs[(i + d + tabs.length) % tabs.length].value)
  }
  function editingText() {
    var list = rows()
    for (var i = 0; i < list.length; i++) if (list[i].editing) return true
    return false
  }

  // ---- running the CLI (the installer, doctor): one at a time, JSON back
  property var queue: []
  function cli(args, done) {
    queue = queue.concat([{ args: args, done: done }])
    if (!runner.running) runNext()
  }
  function runNext() {
    if (!queue.length || !service) return
    var job = queue[0]
    queue = queue.slice(1)
    runner.done = job.done
    runner.command = [service.pluginDir + "/bin/tokenlings"].concat(job.args).concat(["--json"])
    runner.running = true
  }
  ProcessRunner {
    id: runner
    environment: root.service ? root.service.cliEnv : ({})
    onFinished: root.runNext()
  }

  // ---- the diff dialog: what an install would change, before anything is written
  property var pendingInstall: null        // { args, title }
  function confirmChange(title, dryArgs, applyArgs, after) {
    say("checking " + title + "…")
    cli(dryArgs, function(r) {
      if (!r || !r.ok) { say((r && r.error) || "the installer could not run"); return }
      if (!r.changed) { say("already set up: " + r.file); if (after) after(r); return }
      if (!ui) return
      var diff = ui.diff
      diff.title = title
      diff.file = r.file
      diff.text = r.diff || ""
      diff.confirmAction = function() {
        cli(applyArgs, function(w) {
          say(w && w.ok ? "written: " + w.file + (w.provider === "codex" ? " — in Codex, run /hooks once to trust them" : "") : ((w && w.error) || "nothing written"))
          if (after) after(w)
        })
      }
      diff.open = true
    })
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    focusTarget: panel.loadedContent
    contentWidth: panel.fittedContentWidth(Style.space(440))
    contentHeight: panel.fittedContentHeight(Math.min(Style.space(560), root.ui ? root.ui.wanted : Style.space(560)))

    content: PanelKeyCatcher {
      id: keys
      property alias flick: flick
      property alias pageLoader: pageLoader
      property alias diff: diff
      // as tall as the page wants, up to the cap (then it scrolls)
      readonly property real wanted: header.height + (pageLoader.item ? pageLoader.item.implicitHeight : 0) + noticeText.height + frame.spacing * 2 + 4
      anchors.fill: parent
      implicitHeight: Math.min(Style.space(560), wanted)
      blocked: diff.open || root.editingText()
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onMoveRequested: function(dx, dy) {
        if (dy !== 0) { root.moveCursor(dy); return }
        if (root.cursor < 0) { root.switchTab(dx); return }
        var list = root.rows()
        if (list[root.cursor]) list[root.cursor].adjust(dx)
      }
      onActivateRequested: {
        var list = root.rows()
        if (root.cursor >= 0 && list[root.cursor]) list[root.cursor].activate()
      }
      onTextKey: function(t) {
        var n = Number(t)
        if (n >= 1 && n <= root.tabs.length) root.show(root.tabs[n - 1].value)
      }

      Column {
        id: frame
        anchors.fill: parent
        spacing: Style.space(8)

        // header: the title and the tabs (the cursor's top row)
        Row {
          id: header
          width: parent.width
          spacing: Style.space(10)
          Text {
            text: "Tokenlings"
            textFormat: Text.PlainText
            color: root.fg
            font.family: root.fontFamily
            font.pixelSize: Style.font.title
            font.bold: true
            anchors.verticalCenter: parent.verticalCenter
          }
          Row {
            visible: root.page !== "welcome"
            spacing: Style.space(4)
            anchors.verticalCenter: parent.verticalCenter
            Repeater {
              model: root.tabs
              Rectangle {
                required property var modelData
                required property int index
                readonly property bool on: root.page === modelData.value
                width: tabText.implicitWidth + Style.space(14)
                height: Style.spacing.controlHeight - 4
                radius: Style.cornerRadius
                color: on ? Style.selectedFillFor(root.fg, Color.accent) : (tabMouse.containsMouse ? Style.hoverFillFor(root.fg, Color.accent) : "transparent")
                border.width: root.cursor < 0 && on ? 2 : 0
                border.color: Color.accent
                Text {
                  id: tabText
                  anchors.centerIn: parent
                  text: parent.modelData.label
                  textFormat: Text.PlainText
                  color: root.fg
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.bodySmall
                  font.bold: parent.on
                }
                MouseArea { id: tabMouse; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.show(parent.modelData.value) }
              }
            }
          }
        }

        Flickable {
          id: flick
          width: parent.width
          height: parent.height - y - noticeText.height - Style.space(8)
          contentHeight: pageLoader.item ? pageLoader.item.implicitHeight : 0
          clip: true
          boundsBehavior: Flickable.StopAtBounds
          Loader {
            id: pageLoader
            width: flick.width
            active: root.opened && root.service !== null
            source: {
              var p = root.page
              return p === "welcome" ? "qml/panel/WelcomePage.qml" : p === "edit" ? "qml/panel/EditPage.qml" : p === "connect" ? "qml/panel/ConnectPage.qml"
                   : p === "behaviour" ? "qml/panel/BehaviourPage.qml" : p === "about" ? "qml/panel/AboutPage.qml" : "qml/panel/PetsPage.qml"
            }
            onLoaded: { item.panel = root; root.cursor = -1 }
          }
        }

        Text {
          id: noticeText
          width: parent.width
          height: root.notice ? implicitHeight : 0
          text: root.notice
          textFormat: Text.PlainText
          wrapMode: Text.Wrap
          maximumLineCount: 2
          elide: Text.ElideRight
          color: root.fg
          opacity: 0.8
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
        }
      }

      DiffDialog {
        id: diff
        anchors.fill: parent
        foreground: root.fg
        fontFamily: root.fontFamily
      }
    }
  }
}
