import QtQuick
import qs.Commons
import qs.Ui
import "../../core/config.mjs" as Config
import "../../core/tiers.mjs" as Tiers
import "../../core/welcome.mjs" as Welcome

// Connect: which agent account a pet follows (each change applies at once),
// how it knows what the agent is doing (the signal tier), and the hook
// installer — which always shows the exact change and waits for Write
// before touching an agent's config. A connected pet's Install turns into a
// faded Connected.
Item {
  id: page
  property var panel: null
  readonly property var service: panel ? panel.service : null
  readonly property color fg: panel ? panel.fg : Color.foreground
  readonly property string fontFamily: panel ? panel.fontFamily : Style.font.family
  readonly property var pets: service ? service.configPets() : []
  readonly property var pet: {
    for (var i = 0; i < pets.length; i++) if (pets[i].id === (panel ? panel.selectedPet : "")) return pets[i]
    return pets.length ? pets[0] : null
  }
  implicitHeight: col.implicitHeight

  // the account, as pets.json has it (changes are written as they are made)
  readonly property string provider: pet ? pet.provider : ""
  readonly property string configDir: pet && pet.account.configDir ? pet.account.configDir : ""
  readonly property string match: pet && pet.account.match ? pet.account.match : ""
  onPetChanged: refresh()
  readonly property bool hookable: Welcome.HOOKED.indexOf(provider) !== -1
  readonly property bool connected: !!pet && !!service && (service.hookedVersion, service.isHooked(pet.id, provider))

  readonly property var tier: pet ? Tiers.tierOf({ provider: provider, account: { match: match } }) : { tier: "none" }
  readonly property string tierText: tier.tier === "A" ? "A · lifecycle hooks: everything it does"
                                   : tier.tier === "B" ? "B · process activity: busy or idle"
                                   : tier.tier === "C" ? "C · window presence: asleep, awake, watching"
                                   : "none yet: install hooks or set a match"

  // which hook files drive this pet (the service's tokenlings hooks status),
  // and for Codex whether this account has trusted them yet (tokenlings doctor)
  readonly property var mine: pet && service ? (service.hookedVersion, service.hooked[pet.id] || []) : []
  readonly property string wired: mine.length ? mine.map(function(e) { return e.file.replace(page.service.home, "~") }).join(", ") : "no hooks installed"
  property string trust: ""
  function refresh() {
    if (!pet || !panel) return
    service.refreshHooks()
    checkTrust()
  }
  onMineChanged: checkTrust()
  function checkTrust() {
    var codex = mine.filter(function(e) { return e.provider === "codex" }).map(function(e) { return e.file })
    if (!codex.length || !panel) { trust = ""; return }
    panel.cli(["doctor"], function(d) {
      if (!Array.isArray(d)) return
      var c = d.filter(function(x) { return x.check === "codex" && codex.some(function(f) { return x.detail.indexOf(f) !== -1 }) })[0]
      page.trust = c ? (c.status === "ok" ? "trusted" : "not trusted yet: run /hooks in Codex for this account") : ""
    })
  }
  onPanelChanged: refresh()

  function dirArgs() { return configDir ? ["--config-dir", configDir] : [] }
  // one account field, written at once
  function put(changes, said) {
    var id = page.pet.id
    var err = service.saveConfig(function(raw) { Config.setPet(raw, id, changes) })
    panel.say(err ? "not saved: " + err : said)
    return !err
  }
  function install() {
    if (connected) { panel.say(pet.name + " is already connected: " + wired); return }
    var id = pet.id, name = pet.name
    panel.confirmChange("Install Tokenlings hooks so " + name + " follows " + provider + (configDir ? " (" + configDir + ")" : ""),
                        ["hooks", "install", provider, "--pet", id, "--dry-run"].concat(dirArgs()),
                        ["hooks", "install", provider, "--pet", id, "--yes"].concat(dirArgs()), function() { page.refresh() })
  }
  function uninstall() {
    panel.confirmChange("Remove Tokenlings' hooks from " + provider + (configDir ? " (" + configDir + ")" : "") + " (other hooks stay)",
                        ["hooks", "uninstall", provider, "--dry-run"].concat(dirArgs()),
                        ["hooks", "uninstall", provider, "--yes"].concat(dirArgs()), function() { page.refresh() })
  }

  Column {
    id: col
    width: parent.width
    spacing: Style.space(4)
    visible: page.pet !== null

    Field {
      kind: "choice"; label: "Pet"
      foreground: page.fg; fontFamily: page.fontFamily
      options: page.pets.map(function(p) { return { value: p.id, label: p.name } })
      value: page.pet ? page.pet.id : ""
      onChanged: function(v) { page.panel.selectedPet = v }
    }
    Field {
      kind: "choice"; label: "Agent"
      foreground: page.fg; fontFamily: page.fontFamily
      options: page.service ? page.service.providers : []
      value: page.provider
      onChanged: function(v) { page.put({ provider: v }, page.pet.name + " follows " + v) }
    }
    Field {
      kind: "text"; label: "Account folder"
      hint: "~/.claude-work"
      foreground: page.fg; fontFamily: page.fontFamily
      value: page.configDir
      onChanged: function(v) { page.put({ "account.configDir": String(v).trim() || undefined }, String(v).trim() ? "account folder: " + String(v).trim() : "the agent's default account folder") }
    }
    Field {
      kind: "text"; label: "Match (no hooks)"
      foreground: page.fg; fontFamily: page.fontFamily
      value: page.match
      onChanged: function(v) { page.put({ "account.match": String(v).trim() || undefined }, String(v).trim() ? "match: " + String(v).trim() : "no match") }
    }
    Field { kind: "info"; label: "Signal"; value: page.tierText; foreground: page.fg; fontFamily: page.fontFamily }
    Field { kind: "info"; label: "Hooks"; value: page.wired; foreground: page.fg; fontFamily: page.fontFamily }
    Field { kind: "info"; label: "Codex trust"; value: page.trust; visible: page.trust !== ""; foreground: page.fg; fontFamily: page.fontFamily }

    Field {
      kind: "buttons"
      foreground: page.fg; fontFamily: page.fontFamily
      options: (page.hookable ? [page.connected ? { value: "install", label: "✓ Connected", dim: true } : { value: "install", label: "Install hooks…" },
                                 { value: "uninstall", label: "Remove hooks…" }] : [])
               .concat([{ value: "test", label: "Send a test event" }])
      onPressed: function(v) {
        if (v === "install") page.install()
        else if (v === "uninstall") page.uninstall()
        else { page.service.testRun(page.pet.id); page.panel.say(page.pet.name + " is acting out a short pretend session") }
      }
    }

    Text {
      width: parent.width
      wrapMode: Text.Wrap
      textFormat: Text.PlainText
      color: page.fg
      opacity: 0.75
      font.family: page.fontFamily
      font.pixelSize: Style.font.caption
      font.bold: page.provider === "codex"
      text: page.provider === "codex" ? "After installing: " + Welcome.trustStep(page.configDir, page.service ? page.service.home : "")
          : page.provider === "gemini" ? "Gemini CLI runs hooks only when hooks are enabled in its settings."
          : page.provider === "grok" ? "One hook file in ~/.grok/hooks serves every Grok account: each event goes to the pet whose account folder is that session's GROK_HOME (no folder: the default ~/.grok). Grok also runs Claude Code's hooks; Tokenlings tells them apart."
          : page.provider === "opencode" ? "One plugin serves every OpenCode setup: each event goes to the pet whose account folder is that session's OPENCODE_CONFIG_DIR."
          : !page.hookable ? "No hooks for this agent: match its process (process:<regex>) or its window (window:<regex>, the title of the active tab for browsers)."
          : "The installer shows the exact change first, keeps a backup, leaves other hooks alone, and removes only its own."
    }
  }
}
