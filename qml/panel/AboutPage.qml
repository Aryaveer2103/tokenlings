import QtQuick
import qs.Commons
import qs.Ui

// About: the version, what the engine is doing, `tokenlings doctor`, and a
// plain summary of what Tokenlings reads and writes.
Item {
  id: page
  property var panel: null
  readonly property var service: panel ? panel.service : null
  readonly property color fg: panel ? panel.fg : Color.foreground
  readonly property string fontFamily: panel ? panel.fontFamily : Style.font.family
  implicitHeight: col.implicitHeight

  // counters are read when the page opens (and on demand), never bound:
  // binding them would redraw the panel on every pet frame
  property var snap: ({})
  property var doctor: []
  function check() {
    snap = service.stats()
    panel.cli(["doctor"], function(r) { page.doctor = Array.isArray(r) ? r : [{ status: "fail", check: "doctor", detail: (r && r.error) || "did not run" }] })
  }
  onServiceChanged: if (service) check()

  readonly property var privacy: [
    "No network access, no credentials, no sudo, no packages, no services.",
    "Reads: pets.json; the small event files its own hook writes; /proc for agent processes (only for pets set to follow a process); Hyprland windows and workspaces; battery and media-player status.",
    "Writes: ~/.config/tokenlings, ~/.local/state/tokenlings, $XDG_RUNTIME_DIR/tokenlings, and an agent's hook settings only after you confirm the change shown.",
    "Hook events keep the event type, the kind of tool, a hashed session id, process ids and the project folder's name. Never prompts, tool input or output, file contents or full paths."
  ]

  Column {
    id: col
    width: parent.width
    spacing: Style.space(4)

    Field { kind: "info"; label: "Version"; value: page.snap.version || "?"; foreground: page.fg; fontFamily: page.fontFamily }
    Field { kind: "info"; label: "Pets"; value: (page.snap.pets || 0) + " · config from " + (page.snap.configSource || "?"); foreground: page.fg; fontFamily: page.fontFamily }
    Field { kind: "info"; label: "Engine"; value: (page.snap.power || "") + " · " + (page.snap.fps || 0) + " fps cap · " + (page.snap.clockRunning ? "animating" : "resting (no frames)"); foreground: page.fg; fontFamily: page.fontFamily }
    Field { kind: "info"; label: "Since start"; value: (page.snap.frames || 0) + " frames · " + (page.snap.ticks || 0) + " ticks · " + Math.round((page.snap.uptimeSec || 0) / 60) + " min"; foreground: page.fg; fontFamily: page.fontFamily }

    PanelSectionHeader { text: "Doctor"; foreground: page.fg; fontFamily: page.fontFamily }
    Repeater {
      model: page.doctor
      Field {
        required property var modelData
        kind: "info"
        label: (modelData.status === "ok" ? "✓ " : modelData.status === "fail" ? "✗ " : "· ") + modelData.check
        value: String(modelData.detail).replace(page.service ? page.service.home : "\u0000", "~")
        foreground: page.fg; fontFamily: page.fontFamily
      }
    }

    PanelSectionHeader { text: "Privacy"; foreground: page.fg; fontFamily: page.fontFamily }
    Repeater {
      model: page.privacy
      Text {
        required property string modelData
        width: col.width
        wrapMode: Text.Wrap
        text: "• " + modelData
        textFormat: Text.PlainText
        color: page.fg
        opacity: 0.85
        font.family: page.fontFamily
        font.pixelSize: Style.font.caption
      }
    }

    Field {
      kind: "buttons"
      foreground: page.fg; fontFamily: page.fontFamily
      options: [{ value: "check", label: "Check again" }, { value: "welcome", label: "Find my agents again" }]
      onPressed: function(v) { if (v === "check") page.check(); else page.panel.show("welcome") }
    }
  }
}
