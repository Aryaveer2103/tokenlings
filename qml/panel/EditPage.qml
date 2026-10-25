import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "../../core/config.mjs" as Config
import "../../core/compose.mjs" as Compose
import "../../forms/forms.mjs" as Forms

// Edit: every part, colour, personality trait and behaviour of one pet, with
// a live preview. Changes stay a draft until Save (which writes only that
// pet's changed fields into pets.json).
Item {
  id: page
  property var panel: null
  readonly property var service: panel ? panel.service : null
  readonly property color fg: panel ? panel.fg : Color.foreground
  readonly property string fontFamily: panel ? panel.fontFamily : Style.font.family
  readonly property var pets: service ? service.configPets() : []
  readonly property var original: {
    for (var i = 0; i < pets.length; i++) if (pets[i].id === (panel ? panel.selectedPet : "")) return pets[i]
    return pets.length ? pets[0] : null
  }
  property var draft: null
  onOriginalChanged: draft = original ? JSON.parse(JSON.stringify(original)) : null
  Component.onCompleted: draft = original ? JSON.parse(JSON.stringify(original)) : null
  readonly property bool dirty: !!draft && !!original && JSON.stringify(draft) !== JSON.stringify(original)
  implicitHeight: col.implicitHeight

  // ---- options
  function words(name) { return String(name).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, function(c) { return c.toUpperCase() }) }
  function partOptions(table) { return Object.keys(table).map(function(k) { return { value: k, label: table[k] && table[k].label ? table[k].label : page.words(k) } }) }
  readonly property int level: draft && service && service.progress.pets[draft.id] ? service.progress.pets[draft.id].level : 1
  readonly property var accessoryOptions: Object.keys(Compose.LIBRARY.accessories).map(function(k) {
    var a = Compose.LIBRARY.accessories[k], need = a.unlockLevel || 0
    var locked = need > 0 && page.service && page.service.settings.progression && page.level < need
    return { value: k, label: (a.label || page.words(k)) + (locked ? " · Lv " + need : ""), locked: locked }
  })
  // colour presets for a palette key: every form's colour for it, the theme accent, what the pet has
  function swatches(key) {
    var seen = {}, out = []
    var add = function(c) { if (typeof c === "string" && /^#[0-9A-Fa-f]{6}$/.test(c) && !seen[c.toUpperCase()]) { seen[c.toUpperCase()] = true; out.push(c.toUpperCase()) } }
    if (draft && draft.look.palette) add(draft.look.palette[key])
    for (var f in Forms.FORMS) if (Forms.FORMS[f].look.palette) add(Forms.FORMS[f].look.palette[key])
    if (service) add(service.theme.accent)
    return out.slice(0, 14)
  }

  function set(path, value) {
    if (!draft) return
    var d = JSON.parse(JSON.stringify(draft))
    var keys = path.split("."), o = d
    for (var i = 0; i < keys.length - 1; i++) { if (typeof o[keys[i]] !== "object" || o[keys[i]] === null) o[keys[i]] = {}; o = o[keys[i]] }
    o[keys[keys.length - 1]] = value
    // a colour of its own replaces a hashed palette (Bit's)
    if (path.indexOf("look.palette.") === 0 && d.look.palette) delete d.look.palette.hashed
    draft = d
    if (path.indexOf("look.") === 0) preview.bounce()
  }
  property string colourKey: "body"
  function save() {
    if (!draft || !dirty) { panel.say("nothing changed"); return }
    var o = original, d = draft, changes = {}
    for (var k in d) if (k !== "id" && JSON.stringify(d[k]) !== JSON.stringify(o[k])) changes[k] = d[k]
    var err = service.saveConfig(function(raw) { Config.setPet(raw, d.id, changes) })
    panel.say(err ? "not saved: " + err : "saved " + d.name)
  }

  Column {
    id: col
    width: parent.width
    spacing: Style.space(3)
    visible: page.draft !== null

    Field {
      kind: "choice"; label: "Pet"
      foreground: page.fg; fontFamily: page.fontFamily
      options: page.pets.map(function(p) { return { value: p.id, label: p.name } })
      value: page.draft ? page.draft.id : ""
      onChanged: function(v) { page.panel.selectedPet = v }
    }
    Item {
      width: parent.width
      height: 84
      PetPreview {
        id: preview
        anchors.centerIn: parent
        size: 72
        look: page.draft ? page.draft.look : null
        provider: page.draft ? page.draft.provider : ""
        theme: page.service ? page.service.theme : undefined
        evolved: page.draft && page.draft.look.evolved === "on" ? (page.draft.look.evolution || true) : null
      }
      Text {
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        text: page.dirty ? "unsaved changes" : ""
        textFormat: Text.PlainText
        color: page.fg
        opacity: 0.7
        font.family: page.fontFamily
        font.pixelSize: Style.font.caption
      }
    }
    Field { kind: "text"; label: "Name"; max: 24; foreground: page.fg; fontFamily: page.fontFamily
            value: page.draft ? page.draft.name : ""; onChanged: function(v) { if (String(v).trim()) page.set("name", String(v).trim().slice(0, 24)) } }
    Field { kind: "choice"; label: "Base form"; foreground: page.fg; fontFamily: page.fontFamily
            options: Object.keys(Forms.FORMS).map(function(k) { return { value: k, label: Forms.FORMS[k].label } })
            value: page.draft ? page.draft.baseForm : ""; onChanged: function(v) { page.set("baseForm", v) } }

    PanelSectionHeader { text: "Look"; foreground: page.fg; fontFamily: page.fontFamily }
    Field { kind: "choice"; label: "Body"; foreground: page.fg; fontFamily: page.fontFamily; options: page.partOptions(Compose.LIBRARY.bodies)
            value: page.draft ? page.draft.look.body : ""; onChanged: function(v) { page.set("look.body", v) } }
    Field { kind: "choice"; label: "Eyes"; foreground: page.fg; fontFamily: page.fontFamily; options: page.partOptions(Compose.LIBRARY.eyes)
            value: page.draft ? page.draft.look.eyes : ""; onChanged: function(v) { page.set("look.eyes", v) } }
    Field { kind: "choice"; label: "Mouth"; foreground: page.fg; fontFamily: page.fontFamily; options: page.partOptions(Compose.LIBRARY.mouths)
            value: page.draft ? page.draft.look.mouth : ""; onChanged: function(v) { page.set("look.mouth", v) } }
    Field { kind: "choice"; label: "Hair / ears"; foreground: page.fg; fontFamily: page.fontFamily; options: page.partOptions(Compose.LIBRARY.toppers)
            value: page.draft ? page.draft.look.topper : ""; onChanged: function(v) { page.set("look.topper", v) } }
    Field { kind: "choice"; label: "Pattern"; foreground: page.fg; fontFamily: page.fontFamily; options: page.partOptions(Compose.LIBRARY.patterns)
            value: page.draft ? page.draft.look.pattern : ""; onChanged: function(v) { page.set("look.pattern", v) } }
    Field { kind: "chips"; label: "Accessories"; foreground: page.fg; fontFamily: page.fontFamily; options: page.accessoryOptions
            value: page.draft ? page.draft.look.accessories : []
            onChanged: function(v) {
              var locked = page.accessoryOptions.filter(function(o) { return o.locked && v.indexOf(o.value) !== -1 && page.draft.look.accessories.indexOf(o.value) === -1 })
              if (locked.length) { page.panel.say(locked[0].label.replace(" · ", " unlocks at ")); return }
              page.set("look.accessories", v)
            } }
    Field { kind: "choice"; label: "Size"; foreground: page.fg; fontFamily: page.fontFamily
            options: [{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]
            value: page.draft ? page.draft.look.size : ""; onChanged: function(v) { page.set("look.size", v) } }
    // a second account of a provider: its own colours and accessory, or the base form
    Field {
      kind: "buttons"
      visible: !!page.original && (!!page.original.sibling || page.original.look.variant === "off")
      label: page.original && page.original.sibling ? "Sibling look (from " + page.original.sibling.account + ")" : "Sibling look: off"
      foreground: page.fg; fontFamily: page.fontFamily
      options: [{ value: "auto", label: "Sibling colours" }, { value: "off", label: "Pure base form" }]
      onPressed: function(v) {
        // colours and accessories go back to what the choice gives (a reset)
        var id = page.original.id
        var err = page.service.saveConfig(function(raw) { Config.setPet(raw, id, { "look.variant": v === "off" ? "off" : undefined, "look.palette": undefined, "look.accessories": undefined }) })
        page.panel.say(err ? "not saved: " + err : (v === "off" ? "back to the pure base form" : "sibling colours and accessory"))
      }
    }
    Field { kind: "choice"; label: "Evolved form"; foreground: page.fg; fontFamily: page.fontFamily
            options: [{ value: "auto", label: "At level 10" }, { value: "on", label: "Always" }, { value: "off", label: "Never" }]
            value: page.draft ? page.draft.look.evolved : ""; onChanged: function(v) { page.set("look.evolved", v) } }

    PanelSectionHeader { text: "Colours"; foreground: page.fg; fontFamily: page.fontFamily }
    Field { kind: "toggle"; label: "Follow the Omarchy theme"; foreground: page.fg; fontFamily: page.fontFamily
            value: page.draft ? page.draft.look.followTheme === true : false; onChanged: function(v) { page.set("look.followTheme", v) } }
    Repeater {
      model: ["body", "shade", "light", "accent", "cheek", "eye"]
      Field {
        required property string modelData
        kind: "swatches"; label: page.words(modelData)
        foreground: page.fg; fontFamily: page.fontFamily
        visible: !(page.draft && page.draft.look.followTheme && (modelData === "body" || modelData === "shade" || modelData === "light"))
        options: page.swatches(modelData)
        value: page.draft && page.draft.look.palette ? (page.draft.look.palette[modelData] || "") : ""
        onChanged: function(v) { page.colourKey = modelData; page.set("look.palette." + modelData, String(v).toUpperCase()) }
        onHovered: page.colourKey = modelData
      }
    }
    Field { kind: "text"; label: "Custom colour (" + page.colourKey + ")"; max: 7; foreground: page.fg; fontFamily: page.fontFamily
            value: page.draft && page.draft.look.palette && page.draft.look.palette[page.colourKey] ? page.draft.look.palette[page.colourKey] : ""
            onChanged: function(v) {
              var c = String(v).trim().replace(/^([^#])/, "#$1")
              if (/^#[0-9A-Fa-f]{6}$/.test(c)) page.set("look.palette." + page.colourKey, c.toUpperCase())
              else page.panel.say("colours are written #RRGGBB")
            } }

    PanelSectionHeader { text: "Personality"; foreground: page.fg; fontFamily: page.fontFamily }
    Repeater {
      model: [["energy", "Energy"], ["sociability", "Sociability"], ["mischief", "Mischief"], ["sleepiness", "Sleepiness"]]
      Field {
        required property var modelData
        kind: "slider"; label: modelData[1]
        foreground: page.fg; fontFamily: page.fontFamily
        value: page.draft ? page.draft.personality[modelData[0]] : 0.5
        onChanged: function(v) { page.set("personality." + modelData[0], Math.round(Number(v) * 100) / 100) }
      }
    }
    Field { kind: "choice"; label: "Signature move (double-click)"; foreground: page.fg; fontFamily: page.fontFamily
            options: Forms.SIGNATURE_MOVES.map(function(m) { return { value: m, label: page.words(m) } })
            value: page.draft ? page.draft.signatureMove : ""; onChanged: function(v) { page.set("signatureMove", v) } }

    PanelSectionHeader { text: "Behaviour"; foreground: page.fg; fontFamily: page.fontFamily }
    Field { kind: "choice"; label: "Click"; foreground: page.fg; fontFamily: page.fontFamily
            options: [{ value: "focus", label: "Focus its terminal" }, { value: "jump", label: "A happy jump" }, { value: "panel", label: "Open this panel" }, { value: "none", label: "Nothing" }]
            value: page.draft ? page.draft.onClick : ""; onChanged: function(v) { page.set("onClick", v) } }
    Field { kind: "choice"; label: "Lives on"; foreground: page.fg; fontFamily: page.fontFamily
            options: [{ value: "bar", label: "The main bar" }].concat(Quickshell.screens.map(function(s) { return { value: String(s.name), label: String(s.name) } }))
            value: page.draft ? page.draft.home : "bar"; onChanged: function(v) { page.set("home", v) } }
    Field { kind: "toggle"; label: "Shown"; foreground: page.fg; fontFamily: page.fontFamily
            value: page.draft ? page.draft.enabled : true; onChanged: function(v) { page.set("enabled", v) } }

    Field {
      kind: "buttons"
      foreground: page.fg; fontFamily: page.fontFamily
      options: [{ value: "save", label: "Save" }, { value: "revert", label: "Revert" }, { value: "form", label: "Reset to its base form" }]
      onPressed: function(v) {
        if (v === "save") page.save()
        else if (v === "revert") { page.draft = JSON.parse(JSON.stringify(page.original)); preview.bounce() }
        else {
          var f = Forms.FORMS[page.draft.baseForm]
          var look = JSON.parse(JSON.stringify(f.look))
          look.followTheme = false; look.size = page.draft.look.size; look.evolution = f.evolution; look.evolved = page.draft.look.evolved
          page.set("look", look)
          page.set("personality", JSON.parse(JSON.stringify(f.personality)))
          page.set("signatureMove", f.moves[0])
        }
      }
    }
  }
  Text {
    visible: page.draft === null
    width: parent.width
    wrapMode: Text.Wrap
    text: "No pets to edit yet. Add one on the Pets tab."
    textFormat: Text.PlainText
    color: page.fg
    font.family: page.fontFamily
    font.pixelSize: Style.font.bodySmall
  }
}
