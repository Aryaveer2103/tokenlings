import QtQuick
import qs.Commons
import qs.Ui
import "../../core/config.mjs" as Config

// Behaviour: the settings every pet shares. Each change is saved at once.
Item {
  id: page
  property var panel: null
  readonly property var service: panel ? panel.service : null
  readonly property color fg: panel ? panel.fg : Color.foreground
  readonly property string fontFamily: panel ? panel.fontFamily : Style.font.family
  readonly property var s: service ? service.settings : ({})
  implicitHeight: col.implicitHeight

  function put(key, value, said) {
    var err = service.saveConfig(function(raw) { Config.setSetting(raw, key, value) })
    panel.say(err ? "not saved: " + err : (said || "saved"))
  }
  function quiet(changes) {
    var q = JSON.parse(JSON.stringify(page.s.quietHours))
    for (var k in changes) q[k] = changes[k]
    put("quietHours", q)
  }

  Column {
    id: col
    width: parent.width
    spacing: Style.space(4)

    PanelSectionHeader { text: "Power"; foreground: page.fg; fontFamily: page.fontFamily }
    Field {
      kind: "choice"; label: "Mode"
      foreground: page.fg; fontFamily: page.fontFamily
      options: [{ value: "auto", label: "Auto (Balanced on AC, Battery on battery)" }, { value: "showoff", label: "Show-off" },
                { value: "balanced", label: "Balanced" }, { value: "battery", label: "Battery" }, { value: "still", label: "Still (poses only)" }]
      value: page.s.powerMode
      onChanged: function(v) { page.put("powerMode", v) }
    }
    Field { kind: "info"; label: "Now"; foreground: page.fg; fontFamily: page.fontFamily
            value: page.service ? page.service.power + " · " + page.service.fps + " fps cap" + (page.service.onBattery ? " · on battery" : "") : "" }

    PanelSectionHeader { text: "Size"; foreground: page.fg; fontFamily: page.fontFamily }
    Field {
      kind: "choice"; label: "Pet size"
      foreground: page.fg; fontFamily: page.fontFamily
      options: [{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large (as thick as the bar)" }, { value: "huge", label: "Huge" }]
      value: page.s.petSize
      onChanged: function(v) { page.put("petSize", v, "pet size: " + v) }
    }

    PanelSectionHeader { text: "Movement"; foreground: page.fg; fontFamily: page.fontFamily }
    Field {
      kind: "choice"; label: "Roaming"
      foreground: page.fg; fontFamily: page.fontFamily
      options: [{ value: "home", label: "Stay home" }, { value: "bar", label: "Along the bar" }, { value: "desktop", label: "Bar and desktop trips (on AC)" }]
      value: page.s.roaming
      onChanged: function(v) { page.put("roaming", v) }
    }
    Field { kind: "toggle"; label: "Reduced motion (poses, no particles, no roaming)"; foreground: page.fg; fontFamily: page.fontFamily
            value: page.s.reducedMotion === true; onChanged: function(v) { page.put("reducedMotion", v) } }

    PanelSectionHeader { text: "Life"; foreground: page.fg; fontFamily: page.fontFamily }
    Field { kind: "toggle"; label: "Pets play together"; foreground: page.fg; fontFamily: page.fontFamily
            value: page.s.social === true; onChanged: function(v) { page.put("social", v) } }
    Field {
      kind: "choice"; label: "Idle antics"
      foreground: page.fg; fontFamily: page.fontFamily
      options: [{ value: "rare", label: "Rare" }, { value: "normal", label: "Normal" }, { value: "lively", label: "Lively" }]
      value: page.s.ambient
      onChanged: function(v) { page.put("ambient", v) }
    }
    Field { kind: "toggle"; label: "Levels and unlocks"; foreground: page.fg; fontFamily: page.fontFamily
            value: page.s.progression === true; onChanged: function(v) { page.put("progression", v) } }
    Field { kind: "toggle"; label: "Quiet hours (everyone sleeps)"; foreground: page.fg; fontFamily: page.fontFamily
            value: page.s.quietHours ? page.s.quietHours.enabled === true : false; onChanged: function(v) { page.quiet({ enabled: v }) } }
    Field { kind: "text"; label: "From (HH:MM)"; max: 5; foreground: page.fg; fontFamily: page.fontFamily
            visible: page.s.quietHours && page.s.quietHours.enabled
            value: page.s.quietHours ? page.s.quietHours.from : ""; onChanged: function(v) { page.quiet({ from: String(v).trim() }) } }
    Field { kind: "text"; label: "To (HH:MM)"; max: 5; foreground: page.fg; fontFamily: page.fontFamily
            visible: page.s.quietHours && page.s.quietHours.enabled
            value: page.s.quietHours ? page.s.quietHours.to : ""; onChanged: function(v) { page.quiet({ to: String(v).trim() }) } }

    PanelSectionHeader { text: "Agents"; foreground: page.fg; fontFamily: page.fontFamily }
    Field { kind: "toggle"; label: "Account limits in tooltips and on Pets (Omarchy's usage check)"; foreground: page.fg; fontFamily: page.fontFamily
            value: page.s.usageLimits === true
            onChanged: function(v) { page.put("usageLimits", v); if (v) page.service.refreshUsage(true) } }
    Field { kind: "toggle"; label: "Connect new pets to their agents automatically"; foreground: page.fg; fontFamily: page.fontFamily
            value: page.s.autoConnect === true; onChanged: function(v) { page.put("autoConnect", v) } }

    PanelSectionHeader { text: "Privacy"; foreground: page.fg; fontFamily: page.fontFamily }
    Field { kind: "toggle"; label: "Notifications (pet name and state only)"; foreground: page.fg; fontFamily: page.fontFamily
            value: page.s.notifications === true; onChanged: function(v) { page.put("notifications", v) } }
    Field { kind: "toggle"; label: "Show the project folder's name in tooltips"; foreground: page.fg; fontFamily: page.fontFamily
            value: page.s.showCwd === true; onChanged: function(v) { page.put("showCwd", v) } }
  }
}
