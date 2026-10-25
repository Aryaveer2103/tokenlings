import QtQuick
import qs.Commons
import qs.Ui
import "../../core/config.mjs" as Config
import "../../core/card.mjs" as Card
import "../../core/tiers.mjs" as Tiers
import "../../forms/forms.mjs" as Forms

// Pets: a card per pet with its live preview, what it is doing, its
// account's limits and its stats, and what you can do with it; adding a pet
// and importing a card.
Item {
  id: page
  property var panel: null
  readonly property var service: panel ? panel.service : null
  readonly property color fg: panel ? panel.fg : Color.foreground
  readonly property string fontFamily: panel ? panel.fontFamily : Style.font.family
  readonly property var list: service ? service.configPets() : []
  implicitHeight: col.implicitHeight

  // state lines refresh once a second while the page is open
  property int tick: 0
  Timer { interval: 1000; running: true; repeat: true; onTriggered: page.tick++ }

  // accounts on this machine no pet follows yet: looked for each time the
  // page opens, offered below, added only on a yes
  onServiceChanged: if (service) service.checkNewAccounts()
  // (folders that look like backups are left to Welcome, unticked; at most three here)
  readonly property var fresh: service && !service.newAccountsDismissed && service.configSource !== "defaults"
                               ? service.newAccounts.filter(function(c) { return c.selected }).slice(0, 3) : []
  readonly property var freshLooks: fresh.length ? service.proposalLooks(fresh) : []
  function adopt(c) {
    var id = ""
    var ok = save(function(raw) {
      id = Config.freshId(raw, c.id)
      Config.addPet(raw, { id: id, name: c.name, provider: c.provider, baseForm: c.baseForm, account: { configDir: c.account.configDir } })
    }, "added " + c.name)
    if (!ok) return
    service.newAccounts = service.newAccounts.filter(function(x) { return x !== c })
    if (c.hooks) panel.show("connect", id)
  }

  property string mode: ""            // "" | add | import | card
  property string removing: ""        // a pet id waiting for its second press
  property string cardText: ""

  function save(fn, ok) {
    var err = service.saveConfig(fn)
    panel.say(err ? "not saved: " + err : (ok || "saved"))
    return !err
  }
  function tierLabel(p) {
    var t = Tiers.tierOf(p).tier
    return t === "A" ? "hooks" : t === "B" ? "process" : t === "C" ? "window" : "no signal"
  }
  function statsLine(id) {
    var s = service.progress.pets[id]
    if (!s || !s.turns) return "no turns yet"
    var longest = Math.round(s.longestMs / 60000)
    return "Lv " + s.level + " · " + s.turns + (s.turns === 1 ? " turn" : " turns") + " · " + Math.round(s.workMs / 60000) + " min working" + (longest ? " · longest " + longest + " min" : "") + (s.bestStreak > 1 ? " · best streak " + s.bestStreak : "")
  }
  function act(p, what) {
    if (what === "edit") panel.show("edit", p.id)
    else if (what === "connect") panel.show("connect", p.id)
    else if (what === "toggle") save(function(raw) { Config.setPet(raw, p.id, { enabled: !p.enabled }) }, p.name + (p.enabled ? " is off" : " is on"))
    else if (what === "card") {
      cardText = Card.encode(p)
      mode = "card"
      copier.command = ["wl-copy", "--", cardText]
      copier.running = true
      panel.say("the card for " + p.name + " is on the clipboard")
    } else if (what === "remove") {
      if (removing !== p.id) { removing = p.id; panel.say("press Remove again to take " + p.name + " out of pets.json (stats and hooks stay)"); return }
      removing = ""
      save(function(raw) { Config.removePet(raw, p.id) }, "removed " + p.name)
    }
  }
  ProcessRunner { id: copier }

  Column {
    id: col
    width: parent.width
    spacing: Style.space(8)

    // no pets.json yet: the demo pet, and the way to real ones
    Column {
      width: parent.width
      spacing: Style.space(4)
      visible: page.service && page.service.configSource === "defaults"
      Text {
        width: parent.width
        wrapMode: Text.Wrap
        text: "No pets.json yet, so Bit, the demo pet, is keeping the bar company. Set up a pet for each of your agent accounts:"
        textFormat: Text.PlainText
        color: page.fg
        font.family: page.fontFamily
        font.pixelSize: Style.font.bodySmall
      }
      Field {
        kind: "buttons"
        options: [{ value: "welcome", label: "Find my agents" }]
        foreground: page.fg; fontFamily: page.fontFamily
        onPressed: page.panel.show("welcome")
      }
    }

    // ---- new accounts found
    Repeater {
      model: page.fresh
      Rectangle {
        id: found
        required property var modelData
        required property int index
        width: col.width
        height: foundCol.implicitHeight + Style.space(12)
        radius: Style.cornerRadius
        color: "transparent"
        border.width: 1
        border.color: Qt.rgba(page.fg.r, page.fg.g, page.fg.b, 0.35)
        Column {
          id: foundCol
          x: Style.space(6); y: Style.space(6)
          width: parent.width - Style.space(12)
          spacing: Style.space(4)
          Row {
            width: parent.width
            spacing: Style.space(8)
            PetPreview {
              size: 32
              look: page.freshLooks[found.index] || page.service.formLook(found.modelData.baseForm)
              provider: found.modelData.provider
              theme: page.service.theme
            }
            Text {
              width: parent.width - 40
              wrapMode: Text.Wrap
              textFormat: Text.PlainText
              color: page.fg
              font.family: page.fontFamily
              font.pixelSize: Style.font.bodySmall
              text: "New account found: " + found.modelData.provider + " · " + found.modelData.account.configDir
                    + (found.modelData.found === "env" ? " (from a running agent)" : "") + ". Add a pet for it?"
            }
          }
          Field {
            kind: "buttons"
            foreground: page.fg; fontFamily: page.fontFamily
            options: [{ value: "add", label: "Add " + found.modelData.name }, { value: "later", label: "Not now" }]
            onPressed: function(v) {
              if (v === "add") page.adopt(found.modelData)
              else page.service.newAccountsDismissed = true
            }
          }
        }
      }
    }

    Repeater {
      model: page.list
      Rectangle {
        id: card
        required property var modelData
        readonly property var p: modelData
        readonly property int live: page.service.runtimeIndex(p.id)
        width: col.width
        height: inner.implicitHeight + Style.space(12)
        radius: Style.cornerRadius
        color: Style.normalFillFor(page.fg, Color.accent)

        Column {
          id: inner
          x: Style.space(6); y: Style.space(6)
          width: parent.width - Style.space(12)
          spacing: Style.space(4)
          Row {
            width: parent.width
            spacing: Style.space(8)
            PetPreview {
              clip: true
              size: 40
              art: card.live >= 0 ? page.service.pets[card.live].art : null
              liveRig: card.live >= 0 ? page.service.pets[card.live].state : null
              look: card.p.look
              provider: card.p.provider
              theme: page.service.theme
              dim: !card.p.enabled
            }
            Column {
              width: parent.width - 48
              spacing: 1
              Text {
                width: parent.width
                text: card.p.name + (card.p.enabled ? "" : "  (off)")
                textFormat: Text.PlainText
                elide: Text.ElideRight
                color: page.fg
                font.family: page.fontFamily
                font.pixelSize: Style.font.body
                font.bold: true
              }
              Text {
                width: parent.width
                text: card.p.provider + " · " + (Forms.FORMS[card.p.baseForm] ? Forms.FORMS[card.p.baseForm].label : card.p.baseForm) + (card.p.sibling ? " sibling" : "") + " · " + page.tierLabel(card.p) + (card.p.account && card.p.account.configDir ? " · " + card.p.account.configDir : "")
                textFormat: Text.PlainText
                elide: Text.ElideMiddle
                color: page.fg
                opacity: 0.7
                font.family: page.fontFamily
                font.pixelSize: Style.font.caption
              }
              Text {
                width: parent.width
                text: { page.tick; return card.live >= 0 ? page.service.tooltipFor(card.live) : "off" }
                textFormat: Text.PlainText
                elide: Text.ElideRight
                color: page.fg
                font.family: page.fontFamily
                font.pixelSize: Style.font.caption
              }
              // the account's limits: a meter each, the plan, when it resets
              Repeater {
                model: { page.service.usageVersion; var u = page.service.usageFor(card.p.id); return u ? u.limits : [] }
                Row {
                  id: limit
                  required property var modelData
                  readonly property real pct: Math.max(0, Math.min(1, modelData.percent))
                  width: parent.width
                  spacing: Style.space(6)
                  Text {
                    width: Math.round(parent.width * 0.24)
                    anchors.verticalCenter: parent.verticalCenter
                    text: limit.modelData.label
                    textFormat: Text.PlainText
                    elide: Text.ElideRight
                    color: page.fg
                    font.family: page.fontFamily
                    font.pixelSize: Style.font.caption
                  }
                  Rectangle {
                    width: Math.round(parent.width * 0.36)
                    height: 5
                    radius: 2.5
                    anchors.verticalCenter: parent.verticalCenter
                    color: Qt.rgba(page.fg.r, page.fg.g, page.fg.b, 0.15)
                    Rectangle {
                      width: Math.max(height, parent.width * limit.pct)
                      height: parent.height
                      radius: parent.radius
                      visible: limit.pct > 0
                      color: limit.pct >= 0.9 ? Color.urgent : Color.accent
                    }
                  }
                  Text {
                    width: parent.width - Math.round(parent.width * 0.6) - 2 * Style.space(6)
                    anchors.verticalCenter: parent.verticalCenter
                    text: { page.tick; var now = Date.now(); return Math.round(limit.modelData.percent * 100) + "%" + (limit.modelData.resetsAt > now ? " · resets in " + page.service.spanText(limit.modelData.resetsAt - now) : "") }
                    textFormat: Text.PlainText
                    elide: Text.ElideRight
                    color: page.fg
                    opacity: 0.8
                    font.family: page.fontFamily
                    font.pixelSize: Style.font.caption
                  }
                }
              }
              Text {
                readonly property var u: { page.service.usageVersion; return page.service.usageFor(card.p.id) }
                visible: !!u && (u.plan !== "" || (u.stale && u.limits.length > 0) || (u.limits.length === 0 && u.status !== ""))
                width: parent.width
                text: !u ? "" : [u.plan ? u.plan + " plan" : "", u.stale && u.limits.length ? "last known limits" : "", u.limits.length === 0 ? u.status : ""].filter(function(t) { return t }).join(" · ")
                textFormat: Text.PlainText
                elide: Text.ElideRight
                color: page.fg
                opacity: 0.7
                font.family: page.fontFamily
                font.pixelSize: Style.font.caption
              }
              Text {
                width: parent.width
                text: page.statsLine(card.p.id)
                textFormat: Text.PlainText
                elide: Text.ElideRight
                color: page.fg
                opacity: 0.7
                font.family: page.fontFamily
                font.pixelSize: Style.font.caption
              }
            }
          }
          Field {
            kind: "buttons"
            foreground: page.fg; fontFamily: page.fontFamily
            options: [{ value: "edit", label: "Edit" },
                      (page.service.hookedVersion, page.service.isHooked(card.p.id, card.p.provider)) ? { value: "connect", label: "✓ Connected", dim: true } : { value: "connect", label: "Connect" },
                      { value: "toggle", label: card.p.enabled ? "Turn off" : "Turn on" },
                      { value: "card", label: "Share card" }, { value: "remove", label: page.removing === card.p.id ? "Remove?" : "Remove" }]
            onPressed: function(v) { page.act(card.p, v) }
          }
        }
      }
    }

    Field {
      kind: "buttons"
      foreground: page.fg; fontFamily: page.fontFamily
      options: [{ value: "add", label: "+ Add a pet" }, { value: "import", label: "Import a card" }]
      onPressed: function(v) { page.mode = page.mode === v ? "" : v }
    }

    // ---- add: a provider and an id; the rest comes from its base form
    Column {
      width: parent.width
      spacing: Style.space(4)
      visible: page.mode === "add"
      property string provider: "claude"
      property string newId: ""
      property string dir: ""
      id: adder
      Field {
        kind: "choice"; label: "Provider"
        foreground: page.fg; fontFamily: page.fontFamily
        options: page.service ? page.service.providers : []
        value: adder.provider
        onChanged: function(v) { adder.provider = v }
      }
      Field {
        kind: "text"; label: "Id (a-z 0-9 - _)"
        foreground: page.fg; fontFamily: page.fontFamily
        value: adder.newId
        max: 32
        onChanged: function(v) { adder.newId = String(v).trim().toLowerCase() }
      }
      Field {
        kind: "text"; label: "Account folder (optional)"
        foreground: page.fg; fontFamily: page.fontFamily
        value: adder.dir
        onChanged: function(v) { adder.dir = String(v).trim() }
      }
      Field {
        kind: "buttons"
        foreground: page.fg; fontFamily: page.fontFamily
        options: [{ value: "add", label: "Add" }, { value: "cancel", label: "Cancel" }]
        onPressed: function(v) {
          if (v === "cancel") { page.mode = ""; return }
          var pet = { id: "", provider: adder.provider }
          var ok = page.save(function(raw) {
            pet.id = adder.newId || Config.freshId(raw, Forms.formFor(adder.provider) === "bit" ? adder.provider : Forms.FORMS[Forms.formFor(adder.provider)].label)
            if (adder.dir) pet.account = { configDir: adder.dir }
            Config.addPet(raw, pet)
          }, "added")
          if (ok) { page.mode = ""; adder.newId = ""; adder.dir = ""; page.panel.show("connect", pet.id) }
        }
      }
    }

    // ---- import a tkl1: card (checked strictly before anything is written)
    Column {
      id: importer
      width: parent.width
      spacing: Style.space(4)
      visible: page.mode === "import"
      property string text: ""
      Field {
        kind: "text"; label: "Card (tkl1:…)"
        foreground: page.fg; fontFamily: page.fontFamily
        value: importer.text
        max: 4096
        onChanged: function(v) { importer.text = String(v) }
      }
      Field {
        kind: "buttons"
        foreground: page.fg; fontFamily: page.fontFamily
        options: [{ value: "import", label: "Import" }, { value: "cancel", label: "Cancel" }]
        onPressed: function(v) {
          if (v === "cancel") { page.mode = ""; return }
          var r = Card.decode(importer.text)
          if (!r.ok) { page.panel.say("that card cannot be used: " + r.errors.slice(0, 2).join("; ")); return }
          var pet = r.pet
          if (page.save(function(raw) { pet.id = Config.freshId(raw, pet.name); Config.addPet(raw, pet) }, "imported " + pet.name)) { page.mode = ""; importer.text = "" }
        }
      }
    }

    // ---- a shared card, to copy by hand if the clipboard was not there
    Column {
      width: parent.width
      spacing: Style.space(4)
      visible: page.mode === "card"
      Text {
        width: parent.width
        text: page.cardText
        textFormat: Text.PlainText
        wrapMode: Text.WrapAnywhere
        color: page.fg
        font.family: "monospace"
        font.pixelSize: Style.font.caption
      }
      Field {
        kind: "buttons"
        foreground: page.fg; fontFamily: page.fontFamily
        options: [{ value: "close", label: "Done" }]
        onPressed: page.mode = ""
      }
    }
  }
}
