import QtQuick
import qs.Commons
import qs.Ui
import "../../core/welcome.mjs" as Welcome
import "../../core/config.mjs" as Config

// Welcome (first run, or "Find my agents again"): the agent accounts on this
// machine, one suggested pet for each. On the first run the service has
// already made them (pets.json only), and this page shows them. Agents'
// settings change only on a yes: "Connect all my agents" (one click for every
// pet, and settings.autoConnect on for pets added later), or Connect… per
// pet, with its diff.
Item {
  id: page
  property var panel: null
  readonly property var service: panel ? panel.service : null
  readonly property color fg: panel ? panel.fg : Color.foreground
  readonly property string fontFamily: panel ? panel.fontFamily : Style.font.family
  implicitHeight: col.implicitHeight

  property string step: "scan"          // scan | choose | connect
  property var proposals: []
  // each proposal's look beside the pets there are (siblings get their own)
  readonly property var looks: service && proposals.length ? service.proposalLooks(proposals) : []
  property var created: []
  property var connected: ({})
  function isConnected(p) { return !!page.service && (page.service.hookedVersion, page.service.isHooked(p.id, p.provider)) || !!page.connected[p.id] }
  readonly property var hookable: created.filter(function(p) { return p.hooks })
  readonly property bool allConnected: hookable.length > 0 && hookable.every(function(p) { return page.isConnected(p) })
  // the panel is handed over once the page has loaded
  onServiceChanged: begin()
  function begin() {
    if (!service || step !== "scan") return
    if (service.setupResult) {
      created = service.setupResult.pets
      step = "connect"
      service.setupSeen = true
      return
    }
    if (service.autoSetupRunning || service.autoSetupDue) return    // the first run is being set up: wait for it
    service.scanAgents(function(list) {
      page.proposals = list
      page.step = "choose"
    })
  }
  Connections {
    target: page.service
    function onAutoSetupRunningChanged() { page.begin() }
    function onSetupResultChanged() { page.begin() }
  }
  function setProposal(i, key, value) {
    var l = proposals.slice()
    l[i] = Object.assign({}, l[i])
    l[i][key] = value
    proposals = l
  }

  Column {
    id: col
    width: parent.width
    spacing: Style.space(6)

    Text {
      width: parent.width
      wrapMode: Text.Wrap
      text: "Welcome to Tokenlings"
      textFormat: Text.PlainText
      color: page.fg
      font.family: page.fontFamily
      font.pixelSize: Style.font.heading
      font.bold: true
    }
    Text {
      width: parent.width
      wrapMode: Text.Wrap
      textFormat: Text.PlainText
      color: page.fg
      opacity: 0.85
      font.family: page.fontFamily
      font.pixelSize: Style.font.bodySmall
      text: page.step === "scan" ? "Looking for your AI agents…"
          : page.step === "choose" ? (page.proposals.length ? "One pet for each agent account found on this machine. Untick any you do not want and name them as you like. Nothing is written until you create them." + (page.service && page.service.settings.autoConnect ? " Then each is connected to its agent (Behaviour turns that off)." : " Your agents' settings stay untouched.") : "No agent accounts found. Bit, the demo pet, will keep you company; you can add pets any time on the Pets tab.")
          : page.allConnected ? "Your pets are ready and connected to their agents. Hover a pet to see what it is doing and how much of its account's limits are used."
          : page.hookable.length && page.service && page.service.settings.autoConnect ? "Your pets are ready. Connecting them to their agents…"
          : "Your pets are ready. Connect them so they react to your agents: Tokenlings adds its hooks to each agent's settings (each file is backed up first, and Remove hooks takes them out again). Connect all at once, or one at a time to see each change first."
    }

    // ---- choose
    Repeater {
      model: page.step === "choose" ? page.proposals : []
      Column {
        id: prop
        required property var modelData
        required property int index
        width: col.width
        spacing: 2
        Row {
          width: parent.width
          spacing: Style.space(8)
          PetPreview {
            size: 32
            look: page.looks[prop.index] || page.service.formLook(prop.modelData.baseForm)
            provider: prop.modelData.provider
            theme: page.service.theme
            dim: !prop.modelData.selected
          }
          Field {
            width: parent.width - 40
            kind: "toggle"
            label: prop.modelData.provider + " · " + prop.modelData.account.configDir + (prop.modelData.found === "env" ? " (from a running agent)" : "") + (prop.modelData.hooks ? "" : " (no hooks: process or window only)")
            value: prop.modelData.selected
            foreground: page.fg; fontFamily: page.fontFamily
            onChanged: function(v) { page.setProposal(prop.index, "selected", v) }
          }
        }
        Field {
          kind: "text"; label: "Name"; max: 24
          visible: prop.modelData.selected
          value: prop.modelData.name
          foreground: page.fg; fontFamily: page.fontFamily
          onChanged: function(v) { if (String(v).trim()) page.setProposal(prop.index, "name", String(v).trim().slice(0, 24)) }
        }
      }
    }
    Field {
      visible: page.step === "choose"
      kind: "buttons"
      foreground: page.fg; fontFamily: page.fontFamily
      options: page.proposals.length ? [{ value: "create", label: "Create these pets" }, { value: "later", label: "Not now" }] : [{ value: "later", label: "Keep Bit" }]
      onPressed: function(v) {
        if (v === "later") { page.service.markWelcomed(); page.panel.show("pets"); return }
        var chosen = page.proposals.filter(function(p) { return p.selected })
        if (!chosen.length) { page.panel.say("tick at least one, or choose Not now"); return }
        var r = page.service.finishWelcome(chosen)
        if (r.error) { page.panel.say("not saved: " + r.error); return }
        page.created = r.pets
        page.step = "connect"
        page.panel.say("created " + r.pets.length + (r.pets.length === 1 ? " pet" : " pets") + " in ~/.config/tokenlings/pets.json")
      }
    }

    // ---- connect, one agent at a time
    Repeater {
      model: page.step === "connect" ? page.hookable : []
      Column {
      id: conn
      required property var modelData
      width: col.width
      spacing: 2
      Field {
        readonly property var modelData: conn.modelData
        width: parent.width
        kind: "buttons"
        label: modelData.name + " · " + modelData.provider
        foreground: page.fg; fontFamily: page.fontFamily
        options: [page.isConnected(modelData) ? { value: "connect", label: "✓ Connected", dim: true } : { value: "connect", label: "Connect…" }]
        onPressed: {
          var p = modelData
          if (page.isConnected(p)) { page.panel.say(p.name + " is already connected"); return }
          var dir = p.account.configDir ? ["--config-dir", p.account.configDir] : []
          page.panel.confirmChange("Connect " + p.name + " to " + p.provider + " (" + p.account.configDir + ")",
                                   ["hooks", "install", p.provider, "--pet", p.id, "--dry-run"].concat(dir),
                                   ["hooks", "install", p.provider, "--pet", p.id, "--yes"].concat(dir),
                                   function(w) { if (w && w.ok) { var c = Object.assign({}, page.connected); c[p.id] = true; page.connected = c } })
        }
      }
      // Codex runs a new hook only after it is trusted, per account
      Text {
        width: parent.width
        visible: Welcome.needsTrustStep(conn.modelData.provider) && page.isConnected(conn.modelData)
        wrapMode: Text.Wrap
        textFormat: Text.PlainText
        color: page.fg
        font.family: page.fontFamily
        font.pixelSize: Style.font.bodySmall
        font.bold: true
        text: "Next for " + conn.modelData.name + ": " + Welcome.trustStep(conn.modelData.account.configDir, page.service ? page.service.home : "")
      }
      }
    }
    Field {
      visible: page.step === "connect"
      kind: "buttons"
      foreground: page.fg; fontFamily: page.fontFamily
      // the one yes for every agent: auto-connect on, which connects them all now
      // (tokenlings hooks auto) and the pets added later
      options: (page.hookable.length && !page.allConnected && page.service && !page.service.settings.autoConnect
                ? [{ value: "all", label: "Connect all my agents" }] : []).concat([{ value: "done", label: page.allConnected ? "Done" : "Not now" }])
      onPressed: function(v) {
        if (v === "done") { page.panel.show("pets"); return }
        var err = page.service.saveConfig(function(raw) { Config.setSetting(raw, "autoConnect", true) })
        page.panel.say(err ? "not saved: " + err : "connecting your agents… (Behaviour → Connect new pets automatically turns this off)")
      }
    }
  }
}
