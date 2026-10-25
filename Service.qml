import QtQuick
import QtQml
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Services.UPower
import Quickshell.Services.Mpris
import Quickshell.Hyprland
import qs.Commons
import "qml"
import "core/clock.mjs" as Clock
import "core/engine.mjs" as Engine
import "core/brain.mjs" as Brain
import "core/progression.mjs" as Progression
import "core/adapters/index.mjs" as Adapters
import "core/tiers.mjs" as Tiers
import "core/roam.mjs" as Roam
import "core/welcome.mjs" as Welcome
import "core/accounts.mjs" as Accounts
import "core/rng.mjs" as Rng
import "clips/index.mjs" as Clips
import "forms/forms.mjs" as Forms
import "core/config.mjs" as Config
import "core/compose.mjs" as Compose
import "core/palette.mjs" as Palette

// Tokenlings service: one per shell. Owns the pets (from pets.json), the
// animation engine and its one shared clock, and one stage surface per bar
// that hosts the widget. The bar widget only reserves the home slot and hands
// itself over with registerHome().
Scope {
  id: service

  // ---- injected by the shell
  property var shell: null
  property var manifest: null

  readonly property string pluginId: "io.github.aryaveer2103.tokenlings"
  readonly property string version: manifest && manifest.version ? String(manifest.version) : ""
  readonly property string pluginDir: Qt.resolvedUrl(".").toString().replace(/^file:\/\//, "").replace(/\/$/, "")

  // ---- bar facts (scalar view the shell gives plugins that position windows)
  readonly property var barState: shell ? shell.bar : null
  readonly property string barPosition: barState && barState.position ? String(barState.position) : "top"
  readonly property int barSize: barState && barState.barSize > 0 ? barState.barSize : Style.bar.sizeHorizontal
  readonly property bool barHidden: barState ? barState.barHidden === true : false

  // ---- theme: outline, ink and theme-following palettes come from here
  function hexOf(c) { return "#" + [c.r, c.g, c.b].map(function(v) { return Math.round(v * 255).toString(16).padStart(2, "0") }).join("") }
  readonly property var theme: {
    var bg = hexOf(Color.background)
    return { foreground: hexOf(Color.foreground), background: bg, accent: hexOf(Color.accent),
             mode: Palette.luminance(bg) > 0.4 ? "light" : "dark" }
  }
  readonly property string themeKey: JSON.stringify(theme)
  onThemeKeyChanged: rebuildPets()
  readonly property color ink: Color.foreground

  // ---- paths (XDG; nothing is ever written inside the plugin folder)
  readonly property string home: Quickshell.env("HOME") || ""
  readonly property string configParent: Quickshell.env("XDG_CONFIG_HOME") || home + "/.config"
  readonly property string configDir: configParent + "/tokenlings"
  readonly property string configPath: configDir + "/pets.json"
  readonly property string stateDir: (Quickshell.env("XDG_STATE_HOME") || home + "/.local/state") + "/tokenlings"
  readonly property string schemaRef: "file://" + pluginDir + "/schema/pets.schema.json"
  // what the CLI runs with (the shell's own environment)
  readonly property var cliEnv: ({})
  readonly property string lastGoodPath: stateDir + "/pets.last-good.json"

  // ---- config
  property var config: Config.defaults()
  property string configSource: "defaults"     // defaults | file | last-good
  property var configWarnings: []
  property string configError: ""
  property string lastGoodText: ""

  // Every read goes through SafeFile (regular files of ours, capped; see
  // core/safe.mjs); the FileViews below only write.
  SafeFile {
    id: configReader
    path: service.configPath
    cap: Config.MAX_BYTES + 1          // one byte over: the loader says "too large"
    links: true                        // a dotfile manager's link is fine
    onLoaded: function(text) { service.applyConfigText(text) }
    onMissing: service.applyMissing()
    onRefused: service.applyRefused()
  }
  // The folder too: a file that does not exist yet cannot be watched.
  Watch {
    id: configDirWatch
    path: service.configDir
    onChanged: configReader.reload()
  }
  // No config folder yet (a fresh install): its parent is watched instead,
  // so `tokenlings add` from a terminal is noticed. Only until there is a file.
  Watch {
    path: service.configParent
    enabled: service.configSource !== "file"
    onChanged: parentSettle.restart()
  }
  Timer { id: parentSettle; interval: 400; onTriggered: { configReader.reload(); configDirWatch.rearm() } }
  FileView {
    id: configFile
    path: service.configPath
    blockAllReads: true
    preload: false
    atomicWrites: true
    printErrors: false
  }
  SafeFile {
    id: lastGoodReader
    path: service.lastGoodPath
    cap: 262144
    watch: false
    onLoaded: function(text) { service.lastGoodSaved = text }
  }
  property string lastGoodSaved: ""
  FileView {
    id: lastGoodFile
    path: service.lastGoodPath
    blockAllReads: true
    preload: false
    atomicWrites: true
    printErrors: false
  }

  property string configText: ""          // the file as last read (the panel edits this)
  function applyConfigText(text) {
    var r = Config.load(String(text), { home: home })
    if (r.ok) {
      configText = String(text)
      config = r.config
      configSource = "file"
      configError = ""
      configWarnings = r.warnings
      rememberLastGood(String(text))
      rebuildPets()
      return
    }
    configError = r.errors.join("; ")
    if (configSource === "defaults") {
      // Starting up with a broken file: fall back to the last one that worked.
      var lg = Config.load(lastGoodSaved || "", { home: home })
      if (lg.ok) { config = lg.config; configSource = "last-good"; configWarnings = lg.warnings; rebuildPets() }
    }
    toastConfigError()
  }

  // ---- writing pets.json: the panel's edits, checked by the loader first.
  // fn(raw) changes the file's document (core/config.mjs: setPet, addPet,
  // removePet, setSetting). Returns "" or what was wrong.
  function saveConfig(fn) {
    var text = configSource === "file" ? configText : ""
    var next
    try { next = Config.edit(text, fn, schemaRef) } catch (e) { return String(e && e.message || e) }
    pendingConfig = next
    configDirMaker.running = true
    applyConfigText(next)
    return ""
  }
  property string pendingConfig: ""
  Process {
    id: configDirMaker
    command: ["mkdir", "-p", "-m", "700", service.configDir]
    onExited: { if (service.pendingConfig !== "") { configFile.setText(service.pendingConfig); service.pendingConfig = "" } }
  }
  // Pets as configured (disabled ones too), for the panel.
  function configPets() { return configSource === "defaults" ? [] : (config && config.pets ? config.pets : []) }
  function runtimeIndex(id) { for (var i = 0; i < pets.length; i++) if (pets[i].id === id) return i; return -1 }
  readonly property var providers: ["claude", "codex", "gemini", "grok", "kimi", "opencode", "muse", "deepseek", "antigravity", "chatgpt", "claude-desktop", "demo"]
  function formLook(form) { var f = Forms.FORMS[form] || Forms.FORMS.bit; return f.look }

  // ---- first run: no pets.json and never welcomed → the panel opens on Welcome
  readonly property string welcomedPath: stateDir + "/welcomed"
  property bool welcomed: true
  SafeFile {
    path: service.welcomedPath
    cap: 16
    watch: false
    onLoaded: service.welcomed = true
    onMissing: service.welcomed = false
    onRefused: service.welcomed = true
  }
  FileView {
    id: welcomedFile
    path: service.welcomedPath
    blockAllReads: true
    preload: false
    atomicWrites: true
    printErrors: false
  }
  readonly property bool welcomePending: !welcomed && configSource === "defaults"
  function markWelcomed() {
    welcomed = true
    stateDirMaker.pendingWelcomed = true
    stateDirMaker.running = true
  }
  // The agent folders on this machine (names only; nothing inside is read).
  property var scanDone: null
  function scanAgents(done) { scanDone = done; scanner.running = false; scanner.running = true }
  Process {
    id: scanner
    command: ["sh", "-c", Welcome.scanScript()]
    environment: service.cliEnv
    stdout: StdioCollector {
      onStreamFinished: {
        var found = Welcome.parseScan(text, service.home)
        if (service.scanDone) service.scanDone(Welcome.propose(found, service.home, service.configPets()))
        service.scanDone = null
      }
    }
  }
  // How proposed pets would look next to the pets there are (a second
  // account of a provider gets its sibling look): one look per proposal.
  function proposalLooks(list) {
    var raw
    try { raw = Config.rawOf(configSource === "file" ? configText : "") } catch (e) { raw = { pets: [] } }
    var mine = raw.pets.length
    raw.pets = raw.pets.concat(list.filter(function(c) { return c.selected !== false }).map(function(c) {
      return { id: c.id, name: c.name, provider: c.provider, baseForm: c.baseForm, account: { configDir: c.account.configDir } }
    }))
    var r = Config.load(JSON.stringify(raw), { home: home })
    var looks = {}
    if (r.ok) r.config.pets.slice(mine).forEach(function(p, i) { looks[p.account.configDir + "\t" + p.provider] = p.look })
    return list.map(function(c) { return looks[c.account.configDir + "\t" + c.provider] || formLook(c.baseForm) })
  }
  // Accounts on this machine that no pet follows yet (the Pets tab offers
  // them); [] until a scan has run. A scan reads folder names and running
  // agents' account variables only.
  property var newAccounts: []
  property bool newAccountsDismissed: false
  function checkNewAccounts() {
    if (scanner.running) return
    scanAgents(function(list) { service.newAccounts = list })
  }
  // Creates the chosen pets (a new pets.json, or added to the one there is).
  function finishWelcome(chosen) {
    var made = []
    var err = saveConfig(function(raw) {
      for (var i = 0; i < chosen.length; i++) {
        var c = chosen[i]
        if (raw.pets.some(function(p) { return p && p.account && p.account.configDir === c.account.configDir && p.provider === c.provider })) continue
        var id = Config.freshId(raw, c.id)
        Config.addPet(raw, { id: id, name: c.name, provider: c.provider, baseForm: c.baseForm, account: { configDir: c.account.configDir } })
        made.push({ id: id, name: c.name, provider: c.provider, account: c.account, hooks: c.hooks })
      }
    })
    if (!err) markWelcomed()
    return { error: err, pets: made }
  }

  // ---- a pretend session for one pet (Connect → Send a test event)
  property var testSteps: []
  function testRun(id) {
    var s = "test-" + Date.now()
    var plan = [[0, "session.start"], [2600, "prompt"], [3600, "tool.start", "edit"], [6600, "tool.start", "shell"], [9600, "turn.end"], [12400, "session.end"]]
    var t0 = Date.now()
    testSteps = plan.map(function(p) { return { at: t0 + p[0], ev: { pet: id, session: s, event: p[1], tool: p[2] || "" } } })
    testTimer.interval = 1
    testTimer.restart()
  }
  Timer {
    id: testTimer
    onTriggered: {
      var now = Date.now(), left = []
      for (var i = 0; i < service.testSteps.length; i++) {
        var st = service.testSteps[i]
        if (st.at <= now) service.agentEvent(Object.assign({ at: now }, st.ev))
        else left.push(st)
      }
      service.testSteps = left
      if (left.length) { interval = Math.max(20, left[0].at - now); restart() }
    }
  }

  // ---- notifications (off by default): the pet's name and its state, nothing else
  function notify(index, what) {
    if (!settings.notifications || !pets[index]) return
    var name = String(pets[index].name).replace(/[&<>]/g, function(c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] })
    notifier.command = ["notify-send", "-a", "Tokenlings", "-i", "dialog-information", "Tokenlings",
                        what === "needs" ? name + " needs you" : name + " finished"]
    notifier.running = true
  }
  Process { id: notifier }
  function notes() { if (brain) { var n = brain.takeNotes(); for (var i = 0; i < n.length; i++) notify(n[i].pet, n[i].what) } }

  // Something is at pets.json, but not a regular file of ours (a FIFO, a
  // device, another user's file): never read; the last good config stays.
  function applyRefused() {
    configError = "pets.json is not a regular file you own"
    if (configSource === "defaults") {
      var lg = Config.load(lastGoodSaved || "", { home: home })
      if (lg.ok) { config = lg.config; configSource = "last-good"; configWarnings = lg.warnings; rebuildPets() }
    }
    toastConfigError()
  }
  function applyMissing() {
    config = Config.defaults()
    configSource = "defaults"
    configError = ""
    configWarnings = []
    rebuildPets()
  }

  function rememberLastGood(text) {
    if (text === lastGoodText) return
    lastGoodText = text
    stateDirMaker.pending = text
    stateDirMaker.running = true
  }
  Process {
    id: stateDirMaker
    property string pending: ""
    property string pendingStats: ""
    property bool pendingWelcomed: false
    command: ["mkdir", "-p", "-m", "700", service.stateDir]
    onExited: {
      if (pending !== "") { lastGoodFile.setText(pending); pending = "" }
      if (pendingStats !== "") { statsFile.setText(pendingStats); pendingStats = "" }
      if (pendingWelcomed) { welcomedFile.setText("1\n"); pendingWelcomed = false }
    }
  }

  // One toast per distinct problem; the text carries no file contents.
  property string toastedError: ""
  function toastConfigError() {
    if (configError === toastedError) return
    toastedError = configError
    toast.running = true
  }
  Process {
    id: toast
    command: ["notify-send", "-a", "Tokenlings", "Tokenlings",
              "pets.json has an error, so the last good version stays in use. Run tokenlings doctor for details."]
  }

  // ---- pets: what the stage draws, rebuilt from the config and the theme
  Component {
    id: rigComponent
    Rig {}
  }
  readonly property var sizeFactors: ({ small: 0.84, medium: 1, large: 1.12 })
  property var pets: []
  // A temporary cast instead of the configured pets (demos, the clip reel);
  // never written anywhere.
  property var cast: null
  property var evolvedUntil: ({})               // pet id → time a triple-click evolution ends

  function evolvedFor(p) {
    if ((evolvedUntil[p.id] || 0) > Date.now()) return p.look.evolution || true
    if (p.look.evolved === "on") return p.look.evolution || true
    if (p.look.evolved === "auto" && config.settings.progression && levelOf(p.id) >= 10) return p.look.evolution || true
    return null
  }
  function levelOf(id) { return progress.pets[id] ? progress.pets[id].level : 1 }

  function rebuildPets() {
    var list = cast ? cast : (config && config.pets ? config.pets : []).filter(function(p) { return p.enabled })
    var old = {}
    for (var i = 0; i < pets.length; i++) old[pets[i].id] = pets[i].state
    var next = []
    for (var j = 0; j < list.length; j++) {
      var p = list[j]
      var state = old[p.id] || rigComponent.createObject(service)
      delete old[p.id]
      var art = Compose.compose(p.look, theme, p.provider, { evolved: evolvedFor(p) })
      next.push({ id: p.id, name: p.name, provider: p.provider, sizeFactor: sizeFactors[p.look.size] || 1,
                  art: art, state: state, pet: p })
    }
    for (var gone in old) old[gone].destroy()
    pets = next
    // labels follow the pets (a new cast, a pet added or removed)
    var ids = next.map(function(q) { return q.id }).join(",")
    if (labels.length !== pets.length || ids !== labelIds) { labels = pets.map(function() { return "" }); labelIds = ids }
    clones = pets.map(function() { return [] })
    syncEngine()
    pushBrainPets()
  }
  // The brain sees which bar each pet is on (a group) and where in its row
  // (a slot): scenes only ever bring together pets that share a bar.
  function pushBrainPets() {
    if (!brain) return
    var slots = {}
    brain.setPets(pets.map(function(q, i) {
      var f = Forms.FORMS[q.pet.baseForm] || Forms.FORMS.bit
      var g = petHomes[i] === undefined ? 0 : petHomes[i]
      slots[g] = (slots[g] || 0) + 1
      return { id: q.id, provider: q.provider, personality: q.pet.personality, habits: f.habits, moves: Forms.moveSet(q.pet.signatureMove),
               group: g, slot: slots[g] - 1 }
    }), { spacing: 32 + 32 * petGap / Math.max(14, petSizeFor(barSize)) })
    think()
  }

  // The engine animates the pets and, after them, every shadow clone.
  function engineDef(q, id) {
    var v = q.art.pivots
    return { id: id || q.id, personality: q.pet.personality,
             anchors: { head: [16, v.top[1] - 1], hand: v.handR, mouth: [16, v.mouthY], feet: [16, 30.4], eyes: [16, v.eyeY] } }
  }
  function syncEngine() {
    if (!eng) return
    var defs = pets.map(function(q) { return service.engineDef(q) })
    cloneIndex = []
    for (var i = 0; i < clones.length; i++)
      for (var k = 0; k < clones[i].length; k++) {
        clones[i][k].engineIndex = defs.length
        cloneIndex.push(clones[i][k])
        defs.push(engineDef(pets[i], pets[i].id + "~" + clones[i][k].id))
      }
    eng.setPets(defs)
    for (var j = 0; j < pets.length; j++) eng.setAwake(j, !userIdle)
    kick()
  }

  // ---- shadow clones: other sessions of one account, as minis beside the pet
  property var clones: []                      // per pet: [{ id, action, state: Rig, engineIndex }]
  property var cloneIndex: []                  // engine index - pets.length → clone
  function setClones(index, list) {
    var cur = clones[index] || []
    var byId = {}
    for (var i = 0; i < cur.length; i++) byId[cur[i].id] = cur[i]
    var next = list.map(function(c) {
      var o = byId[c.id] || { id: c.id, action: "", state: rigComponent.createObject(service), engineIndex: -1 }
      delete byId[c.id]
      o.want = c.action
      return o
    })
    for (var gone in byId) byId[gone].state.destroy()
    var all = clones.slice()
    all[index] = next
    clones = all
    syncEngine()
    for (var k = 0; k < next.length; k++) {
      var c = next[k]
      if (c.action === c.want) continue
      c.action = c.want
      if (c.want === "idle") eng.rest(c.engineIndex)
      else if (Clips.ACTIONS[c.want]) { var clip = Clips.pick(c.want, pets[index].pet.personality, rng, ""); if (clip) eng.play(c.engineIndex, clip, {}) }
      else if (eng.hasClip(c.want)) eng.play(c.engineIndex, c.want, {})
    }
    kick()
  }
  function cloneCount(index) { return clones[index] ? clones[index].length : 0 }

  property int petGap: 2
  function petSizeFor(thickness) { return Math.max(14, Math.round(Number(thickness || barSize) * 0.78)) }
  readonly property int slotWidth: pets.length * petSizeFor(barSize) + Math.max(0, pets.length - 1) * petGap
  // The slot a bar widget reserves: room for the pets that live on that bar.
  function slotWidthFor(home) {
    var n = petsOn(home).length
    return Math.max(1, n) * petSizeFor(barSize) + Math.max(0, n - 1) * petGap
  }

  // ---- homes: one bar widget per bar surface (one per screen)
  property var homes: []
  function registerHome(item) {
    if (!item || homes.indexOf(item) !== -1) return
    homes = homes.concat([item])
    if (!greeted) { greeted = true; actAll("wake") }
  }
  function unregisterHome(item) {
    var i = homes.indexOf(item)
    if (i === -1) return
    var next = homes.slice()
    next.splice(i, 1)
    homes = next
  }
  property bool greeted: false

  // ---- which bar each pet lives on: pet.home names a screen (e.g. "DP-1"),
  // or "bar" for the main one (the first screen's bar). Pets on different
  // bars never meet; a missing screen sends its pets to the main bar.
  function screenOf(home) {
    var w = home && home.QsWindow ? home.QsWindow.window : null
    return w && w.screen ? String(w.screen.name) : ""
  }
  readonly property var homeScreens: homes.map(function(h) { return service.screenOf(h) })
  readonly property int mainHome: {
    var order = Quickshell.screens.map(function(sc) { return String(sc.name) })
    var best = 0, rank = Infinity
    for (var i = 0; i < homeScreens.length; i++) {
      var r = order.indexOf(homeScreens[i])
      if (r !== -1 && r < rank) { rank = r; best = i }
    }
    return homes.length ? best : -1
  }
  readonly property var petHomes: pets.map(function(q) {
    var want = q.pet.home
    if (want && want !== "bar") { var k = service.homeScreens.indexOf(want); if (k !== -1) return k }
    return service.mainHome
  })
  onPetHomesChanged: pushBrainPets()
  function petsOn(home) {
    var k = homes.indexOf(home), out = []
    for (var i = 0; i < pets.length; i++) if (petHomes[i] === k) out.push(i)
    return out
  }
  function stageOf(index) {
    var home = homes[petHomes[index]]
    var list = stages.instances
    for (var i = 0; i < list.length; i++) if (list[i].home === home) return list[i]
    return null
  }

  // ---- trips: a pet away from its slot (along the bar, on the desktop, flung)
  // trips: pet index → kind while it is away. The pet's stage spans the whole
  // bar meanwhile, and its hit area joins the input mask.
  property var trips: ({})
  property string wideOverride: ""            // IPC wide on|off (bench): "" follows the trips
  function setTrip(index, kind) {
    var t = Object.assign({}, trips)
    if (kind) t[index] = kind
    else delete t[index]
    trips = t
  }
  function wideOn(home) {
    if (wideOverride !== "") return wideOverride === "on"
    for (var k in trips) if (homes[petHomes[k]] === home) return true
    return false
  }
  function moversOn(home) {
    var out = []
    for (var k in trips) if (homes[petHomes[k]] === home) out.push(Number(k))
    return out.slice(0, 2)
  }

  // The brain asks for a trip; the stage knows the bar, Hyprland the windows.
  function planRoam(index, kind, prng) {
    var st = stageOf(index)
    if (!st || !st.visible) return null
    if (kind !== "explore") return Roam.planBarRoam(kind, st.roamInput(index), prng)
    if (!explorerAllowed || explorer) return null
    var ex = excursionInput(index, st)
    return ex ? Roam.planExcursion(ex, prng) : null
  }
  readonly property bool explorerAllowed: !onBattery || power === "showoff"
  property string explorerStrategy: "mover"     // "overlay" | "mover" (IPC explorer; chosen by the Phase 6 bench)
  function excursionInput(index, st) {
    if (!st || st.vertical || !st.screen) return null
    var feet = st.petFeet(index)
    if (!feet) return null
    var mon = Hyprland.monitorFor(st.screen)
    var ws = mon ? mon.activeWorkspace : null
    if (!mon || !ws || ws.hasFullscreen) return null
    Hyprland.refreshToplevels()
    var list = Hyprland.toplevels ? Hyprland.toplevels.values : [], wins = []
    for (var i = 0; i < list.length; i++) {
      var ipc = list[i] ? list[i].lastIpcObject : null
      if (!ipc || !ipc.at || !ipc.size || ipc.hidden || ipc.mapped === false) continue
      if (!ipc.workspace || ipc.workspace.id !== ws.id) continue
      wins.push({ id: String(ipc.address || i), x: ipc.at[0] - mon.x, y: ipc.at[1] - mon.y, w: ipc.size[0], h: ipc.size[1], focused: list[i].activated === true })
    }
    var o = st.petOrigin(index)
    return { pet: index, unit: o.size / 32, home: feet, area: { x: 0, y: 0, w: st.screen.width, h: st.screen.height },
             edge: st.edge, windows: wins, sizePx: o.size }
  }

  // ---- the desktop explorer: one pet at a time, on a surface of its own
  property var explorer: null                 // { index, home, screen, origin, window, scene }
  property bool explorerShown: false          // its surface has drawn: the stage stops drawing that pet
  property point explorerOffset: Qt.point(0, 0)
  function startExplorer(index, scene) {
    var st = stageOf(index)
    if (!st) return
    explorerShown = false
    explorerOffset = Qt.point(0, 0)
    explorer = { index: index, home: st.home, screen: st.screen, origin: st.petOrigin(index), window: scene.window || "", feet: st.petFeet(index) }
    watchedWindow = scene.window ? windowRect(scene.window) : null
  }
  function endExplorer() {
    explorerShown = false
    Qt.callLater(function() { if (!service.explorerShown) service.explorer = null })
  }
  LazyLoader {
    active: service.explorer !== null && !service.hidden
    Excursion {
      engine: service
      stageScreen: service.explorer ? service.explorer.screen : null
      petIndex: service.explorer ? service.explorer.index : -1
      origin: service.explorer ? service.explorer.origin : null
      strategy: service.explorerStrategy
    }
  }
  // The window an explorer stands on moved, closed or left the workspace:
  // it parachutes down, climbs back up and walks home.
  property var watchedWindow: null
  function windowRect(id) {
    var list = Hyprland.toplevels ? Hyprland.toplevels.values : []
    for (var i = 0; i < list.length; i++) {
      var ipc = list[i] ? list[i].lastIpcObject : null
      if (ipc && String(ipc.address) === id && ipc.at && ipc.size) return { x: ipc.at[0], y: ipc.at[1], w: ipc.size[0], h: ipc.size[1], ws: ipc.workspace ? ipc.workspace.id : -1 }
    }
    return null
  }
  Connections {
    target: Hyprland
    enabled: service.explorer !== null
    function onRawEvent(event) {
      var n = String(event.name)
      if (["openwindow", "closewindow", "movewindowv2", "changefloatingmode", "fullscreen", "workspacev2", "focusedmonv2", "activespecialv2", "resizewindow"].indexOf(n) === -1) return
      Hyprland.refreshToplevels()
      windowCheck.restart()
    }
  }
  Timer {
    id: windowCheck
    interval: 160
    onTriggered: service.checkWindow()
  }
  function checkWindow() {
    var ex = explorer
    if (!ex || !ex.window || !brain || !eng || trips[ex.index] === "roam.parachute") return
    var now = windowRect(ex.window), was = watchedWindow
    var ws = ex.screen ? Hyprland.monitorFor(ex.screen) : null
    var gone = !now || (ws && ws.activeWorkspace && now.ws !== ws.activeWorkspace.id)
    var moved = now && was && (Math.abs(now.x - was.x) > 2 || Math.abs(now.y - was.y) > 2 || Math.abs(now.w - was.w) > 2)
    if (!gone && !moved) return
    var off = eng.offsetOf(ex.index)
    if (Math.abs(off.y) < 1) { brain.cancelTrip(ex.index); goHome(ex.index); return }
    var st = stageOf(ex.index)
    var input = excursionInput(ex.index, st) || { pet: ex.index, unit: ex.origin.size / 32, home: ex.feet, area: { x: 0, y: 0, w: ex.screen.width, h: ex.screen.height }, edge: barPosition, sizePx: ex.origin.size }
    var scene = Roam.planParachute(input, off)
    ex.window = ""
    brain.replaceTrip(ex.index, scene, Date.now())
    think()
  }

  // A trip cut short (the agent needs the pet, a click): back to the slot at
  // a run, then the trip is over.
  function goHome(index) {
    if (!eng) return
    var cmd = Roam.homeRun(index, eng.offsetOf(index))
    if (cmd) { eng.setOffset(index, 0, cmd.offset.ms, { y: 0, ease: "smooth" }); kick() }
    homeTimers[index] = Date.now() + (cmd ? cmd.offset.ms + 60 : 0)
    homeTimer.interval = cmd ? cmd.offset.ms + 80 : 1
    homeTimer.restart()
  }
  property var homeTimers: ({})
  Timer {
    id: homeTimer
    onTriggered: {
      var now = Date.now(), left = Infinity
      for (var k in service.homeTimers) {
        if (service.homeTimers[k] <= now) { delete service.homeTimers[k]; service.tripOver(Number(k)) }
        else left = Math.min(left, service.homeTimers[k] - now)
      }
      if (left < Infinity) { interval = left + 20; restart() }
    }
  }
  function tripOver(index) {
    if (eng && eng.dragging(index)) return
    setTrip(index, "")
    if (explorer && explorer.index === index) endExplorer()
  }

  Variants {
    id: stages
    model: service.homes
    Stage {
      required property var modelData
      engine: service
      home: modelData
    }
  }

  // ---- gallery and theater (review aids)
  property string gallerySection: ""
  LazyLoader {
    active: service.gallerySection !== ""
    Gallery {
      engine: service
      section: service.gallerySection
    }
  }
  property bool theater: false
  property string theaterTitle: "Tokenlings"
  LazyLoader {
    active: service.theater
    Theater { engine: service }
  }

  // ---- visibility and power
  property bool paused: false                    // IPC pause / resume
  property bool userHidden: false                // IPC hide / show
  readonly property bool hidden: barHidden || userHidden || fullscreen
  property string renderer: "baked"              // "baked" (chosen in Phase 1) | "vector" | "none" (bench)
  property string surface: "stage"               // "stage" | "bar" (bench only: drawn inside the bar window)
  property int fpsOverride: 0                    // IPC fps (bench)
  readonly property int calmFps: 12               // ambient bits (agent events and touches keep the cap)
  property string powerOverride: ""              // IPC power <mode> (bench, demos)
  property string roamingOverride: ""            // IPC roaming <home|bar|desktop> (bench, demos)
  onRoamingOverrideChanged: pushSettings()

  readonly property var settings: config ? config.settings : Config.SETTINGS_DEFAULTS
  readonly property bool onBattery: UPower.onBattery === true
  // auto: Balanced on AC, Battery on battery.
  readonly property string power: powerOverride !== "" ? powerOverride
                                  : (settings.powerMode === "auto" ? (onBattery ? "battery" : "balanced") : settings.powerMode)
  readonly property int fps: fpsOverride > 0 ? fpsOverride : Math.max(12, Clock.POWER_FPS[power] || 24)
  readonly property bool still: power === "still"
  readonly property bool reducedMotion: settings.reducedMotion === true
  readonly property int maxParticles: power === "battery" ? 6 : 16
  // On battery the stepped loops (working, thinking) change half as often.
  readonly property real stepScale: power === "battery" ? 2 : 1
  readonly property string modeKey: [fps, still, reducedMotion, maxParticles, barPosition, stepScale].join(":")
  onModeKeyChanged: if (eng) eng.setMode({ fps: fps, still: still, reduced: reducedMotion, maxParticles: maxParticles, sky: barPosition === "top" ? 0.35 : 1, stepScale: stepScale })

  // ---- the engine and its one shared clock
  // The engine says when its next visible change is due; the clock sleeps
  // until then (Infinity: no timer at all). A frame is never closer than the
  // power mode's fps cap.
  property var eng: null
  property int seed: 1
  property var rng: Rng.create(1)
  property int ticks: 0
  property int frames: 0
  property real startedAt: Date.now()
  property var fxArt: Compose.composeFx(theme)
  property var fxSlots: []
  Component {
    id: fxSlotComponent
    QtObject {
      property string kind: ""
      property int pet: -1
      property real x: 0
      property real y: 0
      property real rot: 0
      property real s: 1
      property real a: 1
    }
  }

  function makeEngine() {
    eng = Engine.createEngine({ clips: Clips.CLIPS, seed: seed, fps: fps, still: still, reduced: reducedMotion,
                                maxParticles: maxParticles, sky: barPosition === "top" ? 0.35 : 1, stepScale: stepScale })
    rng = Rng.create(seed * 7 + 1)
    brain = Brain.createBrain({ seed: seed, clipMs: clipMs, isAction: function(n) { return !!Clips.ACTIONS[n] },
                                onTurn: function(i, ms, failed) { return service.recordTurn(i, ms, failed) },
                                planRoam: function(i, kind, prng) { return service.planRoam(i, kind, prng) } })
    pushSettings()
    pushContext({})
    var slots = []
    for (var i = 0; i < Engine.FX_POOL; i++) slots.push(fxSlotComponent.createObject(service))
    for (var j = 0; j < fxSlots.length; j++) fxSlots[j].destroy()
    fxSlots = slots
    rebuildPets()
  }

  Timer {
    id: clock
    repeat: false
    onTriggered: service.tick()
  }

  function tick() {
    if (!eng || paused || hidden) { clock.stop(); return }
    var now = Date.now()
    var r = eng.tick(now)
    ticks++
    for (var i = 0; i < r.writes.length; i++) {
      var w = r.writes[i], p = pets[w[0]]
      if (p) p.state[w[1]] = w[2]
      else { var c = cloneIndex[w[0] - pets.length]; if (c) c.state[w[1]] = w[2] }
    }
    for (var j = 0; j < r.fx.length; j++) {
      var f = r.fx[j], s = fxSlots[f[0]]
      if (!s) continue
      if (s.kind !== f[1]) s.kind = f[1]
      s.pet = f[2]; s.x = f[3]; s.y = f[4]; s.rot = f[5]; s.s = f[6]; s.a = f[7]
    }
    for (var k = 0; k < r.events.length; k++) {
      var ev = r.events[k]
      if (ev.type === "end") clipEnded(ev)
      else bodyEvent(ev)
    }
    if (explorer) {
      var o = eng.offsetOf(explorer.index)
      if (o.x !== explorerOffset.x || o.y !== explorerOffset.y) explorerOffset = Qt.point(o.x, o.y)
    }
    if (r.due === Infinity) { clock.stop(); return }
    clock.interval = Math.max(Clock.frameInterval(fps), Math.round(r.due - now))
    clock.restart()
  }
  // Something changed outside the clock (a clip started): tick now.
  function kick() { if (eng && !paused && !hidden) tick() }

  onPausedChanged: if (paused) stopAll(); else { kick(); think() }
  onHiddenChanged: if (hidden) stopAll(); else { kick(); think() }

  // Drops every clip and particle and snaps the pets to neutral: a
  // half-finished clip is never resumed.
  function stopAll() {
    if (!eng) return
    eng.reset()
    var r = eng.tick(Date.now())
    for (var i = 0; i < r.writes.length; i++) { var p = pets[r.writes[i][0]]; if (p) p.state[r.writes[i][1]] = r.writes[i][2] }
    for (var j = 0; j < fxSlots.length; j++) fxSlots[j].kind = ""
    clock.stop()
    trips = ({})
    explorer = null
    explorerShown = false
    // the brain takes over again right away
    if (brain) for (var k = 0; k < pets.length; k++) brain.interact(k, 1, Date.now())
    labels = pets.map(function() { return "" })
  }

  function countFrame() { frames++ }

  // ---- acting: an action name → a variant for this pet → the engine
  property var labels: []                        // what each pet is doing (tooltips, theater)
  property string labelIds: ""
  readonly property var petLabels: labels
  property var lastClip: ({})
  function act(index, action, opts) {
    var p = pets[index]
    if (!p || !eng) return false
    var personality = p.pet.personality
    var clip = Clips.pick(action, personality, rng, lastClip[p.id])
    if (!clip) return false
    lastClip[p.id] = clip
    plays++
    // asleep, the eyes system rests too (no blinks, no saccades, no frames)
    if (action.indexOf("asleep") === 0 || action === "dnd" || action === "needs.10m" || action === "session.end") eng.setAwake(index, false)
    else if (!userIdle) eng.setAwake(index, true)
    eng.play(index, clip, opts || {})
    setLabel(index, action)
    kick()
    return true
  }
  function actAll(action) { for (var i = 0; i < pets.length; i++) act(i, action) }
  property int plays: 0                         // clips started (stats; the soak counts these)
  function playClip(index, clip, opts) {
    if (!eng || !eng.hasClip(clip)) return false
    plays++
    eng.play(index, clip, opts || {})
    setLabel(index, clip)
    kick()
    return true
  }
  function setLabel(index, text) {
    var l = labels.slice()
    l[index] = text
    labels = l
  }
  // A clip that ends on a held pose (asleep, dozing) keeps its label.
  function clipEnded(ev) {
    if (!eng || eng.current(ev.pet)) return
    var c = eng.clip(ev.clip)
    if (!(c && c.endPose)) setLabel(ev.pet, userIdle ? "asleep" : "")
  }

  // ---- the user: idle → the pets doze off (and the clock stops)
  // IPC `awake on|off|auto` (bench and demos): on ignores the user's
  // idleness, off acts as if the user stepped away.
  property bool awakeOverride: false
  property bool idleOverride: false
  property bool userIdle: idleOverride || (idleMonitor.isIdle && !awakeOverride)
  IdleMonitor {
    id: idleMonitor
    timeout: 120
    respectInhibitors: true
  }
  onUserIdleChanged: pushContext({})

  // ---- pointer (routed here by the pet rows)
  property var pokes: ({})
  property var pats: ({})
  property var dnd: ({})
  function hoverPet(index, inside, home) {
    var pet = pets[index]
    if (!pet || !home) return
    if (inside) {
      home.showPetTooltip(tooltipFor(index))
      if (eng && !eng.current(index) && !dnd[pet.id]) interact(index, "hover")
    } else {
      home.hidePetTooltip()
      if (eng) { eng.lookAt(index, null, null); kick() }
    }
  }
  // the pointer over a pet: it looks at you, a little toward the pointer
  function pointAt(index, x, y) {
    if (!eng) return
    eng.lookAt(index, x * 0.8, 0.4 + y * 0.3)
    kick()
  }
  function clickPet(index, button, home) {
    var pet = pets[index]
    if (!pet) return
    if (button === Qt.RightButton) { if (home) home.open(); return }
    if (button === Qt.MiddleButton) { toggleDnd(index); return }
    var now = Date.now()
    var list = (pokes[pet.id] || []).filter(function(t) { return now - t < 1600 })
    list.push(now)
    pokes[pet.id] = list
    if (list.length === 3) { evolveFor(index, 60000) }
    if (list.length >= 5) { pokes[pet.id] = []; interact(index, "grump"); return }
    if (list.length > 1) return
    if (dnd[pet.id]) return
    // onClick: focus (Phase 5 wires terminal focus; until then a happy jump), jump, panel, none
    var onClick = pet.pet.onClick
    if (onClick === "panel") { if (home) home.open(); return }
    if (onClick === "none") return
    if (onClick === "focus" && focusPet(index)) { interact(index, "follow"); return }
    interact(index, onClick === "focus" && brain && brain.describe(index).sessions > 0 ? "shrug" : "click")
  }
  function doubleClickPet(index) {
    var pet = pets[index]
    if (!pet || dnd[pet.id]) return
    var set = Forms.moveSet(pet.pet.signatureMove)
    var move = set.length > 1 && rng.next() < 0.25 ? set[1 + Math.floor(rng.next() * (set.length - 1))] : set[0]
    playClip(index, move)
    if (brain) brain.interact(index, clipMs(move), Date.now())
    setLabel(index, "signature · " + move)
  }
  function patPet(index) {
    var pet = pets[index]
    if (!pet || dnd[pet.id]) return
    var now = Date.now()
    var list = (pats[pet.id] || []).filter(function(t) { return now - t < 3000 })
    list.push(now)
    pats[pet.id] = list
    if (list.length >= 8) { pats[pet.id] = []; interact(index, "pat.over"); return }
    var cur = eng ? eng.current(index) : null
    if (cur === "pat" || cur === "pat.over") return
    interact(index, "pat")
  }
  // drag: picked up, dangling; let go gently and it drops, throw it and it
  // flies (bounces off the ends of the bar, lands, maybe dizzy), then walks home.
  // gx, gy: the pointer's travel since the press, in the pet's grid units.
  property var dragFrom: ({})
  function dragPet(index, phase, gx, gy) {
    if (!eng || !pets[index]) return
    if (phase === "start") {
      if (explorer && explorer.index === index) return
      setTrip(index, "drag")
      interact(index, "drag", 600000)
      eng.grab(index)
      var o = eng.offsetOf(index)
      dragFrom[index] = { x: o.x, y: o.y }
      kick()
      return
    }
    if (!eng.dragging(index)) return
    var st = stageOf(index), from = dragFrom[index] || { x: 0, y: 0 }
    var b = dragBounds(index, st)
    if (phase === "move") {
      eng.drag(index, Math.max(b.lo, Math.min(b.hi, from.x + gx)), Math.max(b.ceil, Math.min(b.below, from.y + gy)))
      kick()
      return
    }
    var speed = eng.release(index, b)
    if (brain) brain.interact(index, 60000, Date.now())
    act(index, speed > 120 ? "toss" : "drop")
    kick()
  }
  property var tossing: null
  Timer {
    id: tosser
    interval: 16
    repeat: true
    onTriggered: {
      var t = service.tossing
      if (!t) { stop(); return }
      t.step++
      var k = t.step / 6
      service.dragPet(t.pet, "move", t.gx * k, t.gy * k)
      if (t.step >= 6) { stop(); service.dragPet(t.pet, "end", 0, 0); service.tossing = null }
    }
  }
  // How far a pet can be dragged or fly: the ends of its bar; above it the
  // surface's room, below it a little into the gap under a top bar.
  function dragBounds(index, st) {
    var inp = st ? st.roamInput(index) : null
    // vertical bars: x runs across the bar, so a throw barely moves it
    if (!inp) return { lo: -4, hi: 4, ceil: -6, below: 6 }
    var top = st.edge === "top"
    return { lo: (inp.lo - inp.home) / inp.unit, hi: (inp.hi - inp.home) / inp.unit,
             ceil: top ? -inp.arcRoom / 0.55 : -18, below: top ? 18 : 2 }
  }
  // Landings and bonks while flying; once it settles, a walk home.
  function bodyEvent(ev) {
    var i = ev.pet
    if (ev.type === "bonk") { playClip(i, "bonk"); return }
    if (ev.type === "landed") { if (ev.speed > 180) playClip(i, "land"); return }
    if (ev.type !== "settled") return
    var hard = ev.impact > 260 || ev.speed > 420
    var landing = hard ? "dizzyLand" : (ev.speed > 120 ? "landSoft" : "")
    if (landing) playClip(i, landing)
    else if (eng) { eng.rest(i); setLabel(i, "") }
    var scene = Roam.planWalkHome(i, ev.x, landing ? clipMs(landing) : 0)
    if (brain) brain.interact(i, landing ? clipMs(landing) : 1, Date.now())
    if (scene && brain && brain.walkHome(i, scene, Date.now())) think()
    else tripOver(i)
  }
  function toggleDnd(index) {
    var pet = pets[index]
    var d = Object.assign({}, dnd)
    d[pet.id] = !d[pet.id]
    dnd = d
    interact(index, d[pet.id] ? "dnd" : "wake", d[pet.id] ? 24 * 3600000 : 0)
  }
  // triple-click: the evolved form for a minute (an easter egg, like the old pets)
  function evolveFor(index, ms) {
    var pet = pets[index]
    var e = Object.assign({}, evolvedUntil)
    e[pet.id] = Date.now() + ms
    evolvedUntil = e
    rebuildPets()
    playClip(index, "doneStreak")
    evolveTimer.restart()
  }
  Timer {
    id: evolveTimer
    interval: 60500
    onTriggered: service.rebuildPets()
  }

  // An interaction: played now, and the brain keeps the lower layers out of
  // the way until it is over (an agent loop resumes afterwards).
  function interact(index, action, holdMs) {
    act(index, action)
    if (brain) { brain.interact(index, holdMs || clipMs(lastClip[pets[index].id] || action), Date.now()); think() }
  }
  // ---- terminal focus: the session's process chain → its Hyprland window
  // (tmux/zellij: the terminal hosting them is focused, not the pane).
  function focusPet(index) {
    if (!brain) return false
    var chain = brain.focusChain(index)
    if (!chain.length) return false
    Hyprland.refreshToplevels()
    var list = Hyprland.toplevels ? Hyprland.toplevels.values : []
    for (var i = 0; i < list.length; i++) {
      var ipc = list[i] ? list[i].lastIpcObject : null
      var pid = ipc && ipc.pid ? Number(ipc.pid) : 0
      if (pid > 1 && chain.indexOf(pid) !== -1) { focusWindow(pid); return true }
    }
    return false
  }
  // Lua-configured Hyprland takes hl.dsp.focus(...); older configs focuswindow.
  // Hyprland says which it runs; if the first form errors, the other is tried.
  function focusWindow(pid) {
    focuser.pid = pid
    focuser.legacy = Hyprland.usingLua === false
    focuser.command = focuser.legacy ? legacyFocus(pid) : luaFocus(pid)
    focuser.tried = 1
    focuser.running = true
  }
  function luaFocus(pid) { return ["hyprctl", "dispatch", "hl.dsp.focus({ window = \"pid:" + Math.floor(pid) + "\" })"] }
  function legacyFocus(pid) { return ["hyprctl", "dispatch", "focuswindow", "pid:" + Math.floor(pid)] }
  Process {
    id: focuser
    property int pid: 0
    property bool legacy: false
    property int tried: 0
    stdout: StdioCollector { id: focusOut }
    onExited: function(code) {
      if (tried < 2 && (code !== 0 || /error|invalid|unknown/i.test(focusOut.text))) {
        tried = 2
        legacy = !legacy
        command = legacy ? service.legacyFocus(pid) : service.luaFocus(pid)
        running = true
      }
    }
  }

  // ---- agent events: the hook bridge appends to
  // $XDG_RUNTIME_DIR/tokenlings/events/<pet>.log (our own 0700 folder; every
  // line is size-checked and parsed defensively, core/adapters).
  readonly property string runtimeDir: Quickshell.env("XDG_RUNTIME_DIR") || ""
  readonly property string eventsDir: runtimeDir ? runtimeDir + "/tokenlings/events" : ""
  property var cursors: ({})
  readonly property int maxLogBytes: 128 * 1024
  Instantiator {
    id: eventLogs
    model: service.eventsDir ? service.pets.map(function(p) { return p.id }) : []
    delegate: SafeFile {
      required property string modelData
      path: service.eventsDir + "/" + modelData + ".log"
      cap: service.maxLogBytes
      onLoaded: function(text) { service.readEvents(modelData, truncated ? null : text) }
    }
  }
  // The folder: a log that does not exist yet cannot be watched. The folder
  // itself is made at start (0700, as the hook would), so there is always one.
  Watch {
    id: eventsWatch
    path: service.eventsDir
    onChanged: { for (var i = 0; i < eventLogs.count; i++) if (eventLogs.objectAt(i)) eventLogs.objectAt(i).reload() }
  }
  Process {
    id: eventsDirMaker
    command: ["sh", "-c", "umask 077; d=$1; [ -L \"$d\" ] || [ -L \"$d/events\" ] && exit 0; mkdir -p -m 700 \"$d/events\"", "sh", service.runtimeDir + "/tokenlings"]
    onExited: eventsWatch.rearm()
  }
  function readEvents(id, text) {
    if (!brain) return
    var now = Date.now()
    var first = !(id in cursors)
    // over the cap (the hook keeps it far smaller): skip to now
    if (text === null || text.length > maxLogBytes) { cursors[id] = { t: now, n: 0 }; return }
    var r = Adapters.newLines(text, first ? { t: now - 30 * 60000, n: 0 } : cursors[id])
    cursors[id] = r.cursor
    for (var i = 0; i < r.lines.length; i++) {
      var ev = Adapters.normalize(id, r.lines[i])
      // after a restart the log replays quietly: state, not old animations
      if (ev) brain.event(ev, now, first)
    }
    notes()
    think()
    if (r.lines.length) gcTimer.start()
  }

  // ---- Tier C: an app's window (Hyprland toplevels; no polling)
  readonly property var tiers: pets.map(function(p) { return Tiers.tierOf(p.pet) })
  readonly property bool anyTierC: tiers.some(function(t) { return t.tier === "C" })
  readonly property bool anyTierB: tiers.some(function(t) { return t.tier === "B" })
  property var windowStates: ({})
  readonly property var windowList: {
    if (!anyTierC) return []
    var list = Hyprland.toplevels ? Hyprland.toplevels.values : []
    return list.map(function(t) {
      var ipc = t.lastIpcObject || {}
      return { cls: String(ipc["class"] || ""), title: String(t.title || ""), focused: t.activated === true }
    })
  }
  onWindowListChanged: updateWindows()
  function updateWindows() {
    if (!brain) return
    var now = Date.now(), next = {}
    for (var i = 0; i < pets.length; i++) {
      if (tiers[i].tier !== "C") continue
      var id = pets[i].id
      var before = windowStates[id] || { open: false, focused: false, title: "" }
      var after = Tiers.windowState(tiers[i], windowList)
      next[id] = after
      var evs = Tiers.windowEvents(id, before, after, now)
      for (var k = 0; k < evs.length; k++) {
        if (evs[k].event) brain.event(evs[k], now)
        else if (evs[k].cue === "attentive") interact(i, "hover")
        else if (evs[k].cue === "listening") interact(i, "glance.right")
      }
    }
    windowStates = next
    think()
  }

  // ---- Tier B: a CLI without hooks, by its process. One scan every 30 s
  // finds it (only while some pet uses Tier B); while it runs, its CPU time
  // is sampled every 3 s (bounded /proc reads in one short sh).
  property var procStates: ({})
  Timer {
    id: procTimer
    running: service.anyTierB && !service.paused
    repeat: true
    interval: Object.keys(service.procStates).some(function(k) { return service.procStates[k].running }) ? 3000 : 30000
    triggeredOnStart: true
    onTriggered: { procSampler.running = false; procSampler.running = true }
  }
  Process {
    id: procSampler
    command: ["sh", "-c", "for d in /proc/[0-9]*; do read -r s < \"$d/stat\" 2>/dev/null || continue; c=${s#*(}; c=${c%)*}; r=${s##*) }; set -- $r; printf '%s %s %s\\n' \"${d#/proc/}\" $(( ${12:-0} + ${13:-0} )) \"$c\"; done 2>/dev/null | head -n 4096"]
    stdout: StdioCollector { onStreamFinished: service.readProcesses(text) }
  }
  function readProcesses(text) {
    if (!brain) return
    var samples = Tiers.parseSamples(text), now = Date.now(), next = {}
    for (var i = 0; i < pets.length; i++) {
      if (tiers[i].tier !== "B") continue
      var id = pets[i].id
      var before = procStates[id] || { running: false }
      var st = Tiers.processState(tiers[i], before, samples, now, 100)
      var pe = Tiers.processEvents(id, before, st, now)
      next[id] = Object.assign(st, { working: pe.working, quietSince: pe.quietSince })
      for (var k = 0; k < pe.events.length; k++) brain.event(pe.events[k], now)
    }
    procStates = next
    think()
  }

  // Sessions whose agent is gone end (checked once a minute, only while any exist).
  Timer {
    id: gcTimer
    interval: 60000
    repeat: true
    onTriggered: {
      var pids = []
      var all = service.brain ? service.brain.sessions.all() : {}
      for (var id in all) for (var sid in all[id].sessions) { var p = all[id].sessions[sid].pid; if (p > 1) pids.push(String(p)) }
      if (!pids.length && Object.keys(all).every(function(k) { return Object.keys(all[k].sessions).length === 0 })) { stop(); return }
      aliveCheck.command = ["sh", "-c", "for p; do [ -d /proc/$p ] && printf '%s ' \"$p\"; done; echo", "sh"].concat(pids)
      aliveCheck.running = true
    }
  }
  Process {
    id: aliveCheck
    stdout: StdioCollector {
      onStreamFinished: {
        var alive = {}
        String(text).trim().split(/\s+/).forEach(function(p) { if (p) alive[Number(p)] = true })
        if (service.brain) { service.brain.gc(Date.now(), function(pid) { return !!alive[pid] }); service.think() }
      }
    }
  }

  // The tooltip: "Ember · working · shell · 3m" (plain text). Pets that share
  // a provider also say which account they are: "Ember Work (~/.claude-work)".
  function tooltipFor(index) {
    var pet = pets[index]
    var d = brain ? brain.describe(index) : null
    var twins = pets.filter(function(q) { return q.provider === pet.provider }).length > 1
    var bits = [pet.name + (twins ? " (" + Accounts.tilde(Accounts.petDir(pet.pet, home), home) + ")" : "")]
    if (dnd[pet.id]) bits.push("do not disturb")
    else if (!d || d.sessions === 0) bits.push(d && d.asleep ? "asleep" : "resting")
    else {
      var st = { thinking: "thinking", tool: "working", needs: "needs you", compacting: "compacting", idle: "idle" }[d.state] || d.state
      bits.push(st)
      if (d.state === "tool" && d.tool) bits.push(d.tool)
      var m = Math.floor((Date.now() - d.since) / 60000)
      if (d.state !== "idle" && m >= 1) bits.push(m + "m")
      if (d.sessions > 1) bits.push(d.sessions + " sessions")
      if (settings.showCwd && d.cwd) bits.push(d.cwd)
    }
    return bits.join(" · ")
  }

  // ---- the brain: what every pet does next (core/brain.mjs)
  property var brain: null
  function clipMs(name) {
    if (!eng) return 1500
    var c = eng.clip(name)
    if (!c && Clips.ACTIONS[name]) { var v = Clips.ACTIONS[name][0]; c = eng.clip(typeof v === "string" ? v : v.clip) }
    return c ? (c.loop ? 600000 : c.duration) : 1500
  }
  Timer {
    id: brainClock
    repeat: false
    onTriggered: service.think()
  }
  function think() {
    if (!brain || paused || hidden) { brainClock.stop(); return }
    var now = Date.now()
    var r = brain.update(now)
    for (var i = 0; i < r.commands.length; i++) applyCommand(r.commands[i])
    if (r.due === Infinity) { brainClock.stop(); return }
    brainClock.interval = Math.max(100, Math.round(r.due - now))
    brainClock.restart()
  }
  function applyCommand(c) {
    if (c.pet >= pets.length) return
    if (c.clones) { setClones(c.pet, c.clones); return }
    if (c.awake !== undefined) { eng.setAwake(c.pet, c.awake); return }
    if (c.offset) { eng.setOffset(c.pet, c.offset.x, c.offset.ms, { y: c.offset.y, ease: c.offset.ease, arc: c.offset.arc }); kick(); return }
    if (c.tripStart) {
      setTrip(c.pet, c.tripStart.name)
      if (c.tripStart.name === "roam.explore" && !explorer) startExplorer(c.pet, c.tripStart)
      return
    }
    if (c.tripDone) { tripOver(c.pet); return }
    if (c.goHome) { goHome(c.pet); return }
    if (c.rest) { eng.rest(c.pet); setLabel(c.pet, ""); kick(); return }
    var o = c.calm ? { fps: calmFps } : undefined
    if (c.action) { act(c.pet, c.action, o); return }
    if (c.clip) playClip(c.pet, c.clip, o)
  }
  // agent events (the hook bridge's, or `tokenlings event` for testing)
  function agentEvent(ev) {
    if (!brain) return
    brain.event(ev, Date.now())
    notes()
    think()
  }

  // ---- context: settings, power, media, battery, time of day, Hyprland
  function pushSettings() {
    if (brain) brain.setSettings({ social: settings.social, ambient: settings.ambient, quietHours: settings.quietHours, progression: settings.progression,
                                   roaming: roamingOverride || settings.roaming })
  }
  onSettingsChanged: { pushSettings(); think() }
  readonly property bool mediaPlaying: {
    var list = Mpris.players ? Mpris.players.values : []
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].isPlaying) return true
    return false
  }
  readonly property var batteryDevice: UPower.displayDevice
  readonly property bool batteryLow: onBattery && !!batteryDevice && batteryDevice.isPresent && batteryDevice.percentage < 0.2
  onOnBatteryChanged: if (!onBattery) pushContext({ plugged: true })
  property int hour: new Date().getHours()
  // One timer to the next hour boundary: night (22–6) and morning (6–10) need no polling.
  Timer {
    id: hourTimer
    repeat: false
    running: true
    interval: 3600000 - (Date.now() % 3600000) + 500
    onTriggered: { service.hour = new Date().getHours(); interval = 3600000 - (Date.now() % 3600000) + 500; restart() }
  }
  readonly property bool night: hour >= 22 || hour < 6
  readonly property bool morning: hour >= 6 && hour < 10
  readonly property var focusedMonitor: Hyprland.focusedMonitor
  readonly property var activeWorkspace: focusedMonitor ? focusedMonitor.activeWorkspace : null
  // Fullscreen hides a bar's pets on that monitor only (Stage.covered); the
  // whole thing pauses when every bar with pets is covered.
  readonly property bool fullscreen: {
    var list = stages.instances, any = false
    for (var i = 0; i < list.length; i++) {
      if (!list[i] || !list[i].indices.length) continue
      any = true
      if (!list[i].covered) return false
    }
    return any
  }
  property int lastWorkspace: -1
  onActiveWorkspaceChanged: {
    var id = activeWorkspace ? activeWorkspace.id : -1
    if (lastWorkspace > 0 && id > 0 && id !== lastWorkspace) pushContext({ glance: id > lastWorkspace ? "right" : "left" })
    lastWorkspace = id
  }
  readonly property string contextKey: [mediaPlaying, batteryLow, night, morning, fullscreen, userIdle, power, reducedMotion, still, onBattery, barPosition].join(":")
  onContextKeyChanged: pushContext({})
  function pushContext(extra) {
    if (!brain) return
    brain.setContext(Object.assign({ userIdle: userIdle, media: mediaPlaying, batteryLow: batteryLow, night: night, morning: morning,
                                     fullscreen: fullscreen, power: power, reduced: reducedMotion, still: still, onBattery: onBattery,
                                     vertical: barPosition === "left" || barPosition === "right" }, extra || {}))
    think()
  }

  // ---- progression: stats.json in the state folder (XP, levels, plain stats)
  readonly property string statsPath: stateDir + "/stats.json"
  property var progress: ({ version: 1, pets: {} })
  SafeFile {
    id: statsReader
    path: service.statsPath
    cap: Progression.MAX_BYTES
    watch: false
    onLoaded: function(text) { service.progress = Progression.load(text) }
  }
  FileView {
    id: statsFile
    path: service.statsPath
    blockAllReads: true
    preload: false
    atomicWrites: true
    printErrors: false
  }
  Timer {
    id: statsSaver
    interval: 15000
    onTriggered: { stateDirMaker.pendingStats = Progression.save(service.progress); stateDirMaker.running = true }
  }
  // Returns the celebration for a finished turn (streaks, level-ups).
  function recordTurn(index, ms, failed) {
    var pet = pets[index]
    if (!pet) return null
    if (!settings.progression) return null
    var r = Progression.recordTurn(progress.pets[pet.id], ms, Date.now(), failed)
    var all = { version: 1, pets: Object.assign({}, progress.pets) }
    all.pets[pet.id] = r.stats
    progress = all
    statsSaver.restart()
    if (r.levelUp >= 10 && pet.pet.look.evolved === "auto") Qt.callLater(rebuildPets)
    // a level-up or every fifth turn in a row gets the crown sparkle
    if (r.levelUp || (r.stats.streak > 0 && r.stats.streak % 5 === 0)) return "done.streak"
    return null
  }

  // ---- demos: every state on every pet, the base forms as a temporary cast
  property var walk: null                        // { step, until }
  Timer {
    id: walker
    repeat: false
    onTriggered: service.walkStep()
  }
  function startWalk(states, holdScale) {
    walk = { states: states || Clips.WALK, step: 0, scale: holdScale || 1 }
    walkStep()
  }
  function walkStep() {
    if (!walk) return
    if (walk.step >= walk.states.length) { walk = null; theaterTitle = "Tokenlings"; return }
    var st = walk.states[walk.step++]
    theaterTitle = st[0]
    for (var i = 0; i < pets.length; i++) interact(i, st[0])
    walker.interval = Math.round(st[1] * walk.scale)
    walker.restart()
  }
  // A pet of each base form, as the form ships (evolved: its evolved form).
  function castPet(name, evolved) {
    var f = Forms.FORMS[name]
    var p = Config.defaultPet("demo", name, f.label)
    p.baseForm = name
    p.look = JSON.parse(JSON.stringify(f.look))
    p.look.size = "medium"
    p.look.evolution = f.evolution
    p.look.evolved = evolved ? "on" : "off"
    p.personality = JSON.parse(JSON.stringify(f.personality))
    p.signatureMove = f.moves[0]
    return p
  }
  function setCast(which) {
    if (which === "forms" || which === "evolved") cast = Object.keys(Forms.FORMS).map(function(n) { return service.castPet(n, which === "evolved") })
    // three pets no agent hook writes to (benches, while real agents run)
    else if (which === "trio") cast = ["ember", "slate", "prism"].map(function(n) { return service.castPet(n, false) })
    else cast = null
    rebuildPets()
  }

  function stats() {
    var now = Date.now()
    return {
      version: version,
      frames: frames,
      ticks: ticks,
      plays: plays,
      clockRunning: clock.running,
      clockInterval: clock.interval,
      busy: eng ? eng.isBusy() : false,
      fps: fps,
      power: power,
      reducedMotion: reducedMotion,
      renderer: renderer,
      pets: pets.length,
      cast: cast ? cast.length : 0,
      homes: homes.length,
      paused: paused,
      hidden: hidden,
      userIdle: userIdle,
      barPosition: barPosition,
      configSource: configSource,
      theme: theme,
      labels: labels,
      uptimeSec: Math.round((now - startedAt) / 1000),
      stages: stages.instances.map(function(s) { return s.describe() }),
      trips: trips,
      explorer: explorer ? { pet: explorer.index, strategy: explorerStrategy, shown: explorerShown } : null
    }
  }

  ShellIpc {
    target: "tokenlings"

    function stats(): string { return JSON.stringify(service.stats()) }
    // demo "<what> [arg] [pet]", one quoted string:
    //   walk [holdScale] · state <action> [pet|all] · clip <clip> [pet|all]
    //   cast <forms|evolved|off> · signature [pet|all] · seed <n> · stop
    function demo(spec: string): string {
      var parts = String(spec).trim().split(/\s+/)
      var what = parts[0] || "", arg = parts[1] || "", pet = parts[2] || ""
      var targets = function(sel) {
        if (sel === "" || sel === "all") return service.pets.map(function(p, i) { return i })
        var n = Number(sel)
        if (sel !== "" && n >= 0 && n < service.pets.length) return [n]
        var idx = service.pets.map(function(p) { return p.id }).indexOf(sel)
        return idx >= 0 ? [idx] : []
      }
      if (what === "walk") { service.stopAll(); service.startWalk(null, Number(arg) || 1); return "ok" }
      if (what === "state") {
        if (!Clips.ACTIONS[arg]) return "unknown action"
        service.walk = null
        targets(pet).forEach(function(i) { service.interact(i, arg) })
        return "ok"
      }
      if (what === "clip") {
        if (!service.eng || !service.eng.hasClip(arg)) return "unknown clip"
        service.walk = null
        targets(pet).forEach(function(i) { service.playClip(i, arg); service.brain.interact(i, service.clipMs(arg), Date.now()) })
        return "ok"
      }
      if (what === "signature") { targets(arg).forEach(function(i) { service.doubleClickPet(i) }); return "ok" }
      if (what === "cast") { service.setCast(arg === "off" ? "" : arg); return "ok" }
      // home <cast pet index> <screen|bar>: move a cast pet to another bar (multi-monitor tests)
      if (what === "home") {
        var k = Number(arg)
        if (!service.cast || !(k >= 0 && k < service.cast.length) || !/^[A-Za-z0-9_.-]{1,64}$/.test(pet)) return "invalid"
        var c = service.cast.slice()
        c[k] = Object.assign({}, c[k], { home: pet })
        service.cast = c
        service.rebuildPets()
        return "ok"
      }
      if (what === "seed") { service.seed = Number(arg) || 1; service.makeEngine(); return "ok" }
      if (what === "stop") { service.walk = null; service.stopAll(); return "ok" }
      return "unknown"
    }
    function stop(): string { service.walk = null; service.stopAll(); return "ok" }
    function pause(): string { service.paused = true; return "ok" }
    function resume(): string { service.paused = false; return "ok" }
    function hide(): string { service.userHidden = true; return "ok" }
    function show(): string { service.userHidden = false; return "ok" }
    function theater(on: string): string { service.theater = on === "on"; return "ok" }
    // focus <pet id or index>: the terminal of that pet's session, as a click would
    function focus(pet: string): string {
      var i = Number(pet)
      if (!(i >= 0)) i = service.pets.map(function(p) { return p.id }).indexOf(pet)
      if (i < 0 || i >= service.pets.length) return "unknown pet"
      return service.focusPet(i) ? "ok" : "no window"
    }
    function caption(text: string): string { service.theaterTitle = String(text).slice(0, 80) || "Tokenlings"; return "ok" }
    function awake(mode: string): string { service.awakeOverride = mode === "on"; service.idleOverride = mode === "off"; return "ok" }
    // event '{"pet":"ember","session":"s1","event":"prompt"}' — a normalised agent event (testing)
    function event(json: string): string {
      if (String(json).length > 4096) return "too long"
      var ev
      try { ev = JSON.parse(json) } catch (e) { return "invalid json" }
      if (!ev || typeof ev.pet !== "string" || typeof ev.event !== "string") return "invalid"
      service.agentEvent({ pet: ev.pet, session: String(ev.session || "ipc"), event: ev.event, tool: ev.tool ? String(ev.tool) : "", at: Date.now() })
      return "ok"
    }
    // scene <name> [pet indices, comma separated] — a social scene now (demos)
    function scene(spec: string): string {
      var parts = String(spec).trim().split(/\s+/)
      var list = parts[1] ? parts[1].split(",").map(Number) : service.pets.map(function(p, i) { return i })
      var extra = parts[2] !== undefined ? Number(parts[2]) : list[list.length - 1]
      if (parts[0] === "napPile") return service.brain && service.brain.napPile(Date.now()) ? (service.think(), "ok") : "busy"
      if (parts[0] === "wakePile") return service.brain && service.brain.endNapPile(Date.now()) ? (service.think(), "ok") : "none"
      var ok = service.brain && service.brain.startSceneByName(parts[0], list, Date.now(), extra)
      service.think()
      return ok ? "ok" : "unknown or busy"
    }
    function brain(pet: string): string {
      var i = Number(pet)
      return JSON.stringify(service.brain ? service.brain.describe(i >= 0 ? i : 0) : null)
    }
    function renderer(name: string): string {
      if (name !== "vector" && name !== "baked" && name !== "none") return "unknown"
      service.renderer = name
      return "ok"
    }
    function fps(value: string): string {
      var n = Math.round(Number(value))
      if (!(n >= 0 && n <= 60)) return "invalid"
      service.fpsOverride = n
      return "ok"
    }
    function roaming(mode: string): string {
      if (["", "auto", "home", "bar", "desktop"].indexOf(mode) === -1) return "unknown"
      service.roamingOverride = mode === "auto" ? "" : mode
      return "ok"
    }
    function power(mode: string): string {
      if (["", "auto", "showoff", "balanced", "battery", "still"].indexOf(mode) === -1) return "unknown"
      service.powerOverride = mode === "auto" ? "" : mode
      return "ok"
    }
    function drawIn(name: string): string {
      if (name !== "stage" && name !== "bar") return "unknown"
      service.surface = name
      return "ok"
    }
    function reload(): string { configReader.reload(); return "ok" }
    // editor [page]: open the panel (pets, edit, connect, behaviour, about, welcome)
    function editor(page: string): string {
      var h = service.homes[service.mainHome]
      if (!h) return "no bar"
      h.openPage(page || "pets")
      return "ok"
    }
    // roam "<stroll|perch|zoomies|explore> [pet]": a trip now (demos, the bench)
    function roam(spec: string): string {
      var parts = String(spec).trim().split(/\s+/)
      var kind = parts[0] || "stroll", sel = parts[1] || "0"
      if (["stroll", "perch", "zoomies", "explore"].indexOf(kind) === -1) return "unknown"
      var i = Number(sel)
      if (!(i >= 0)) i = service.pets.map(function(p) { return p.id }).indexOf(sel)
      if (i < 0 || i >= service.pets.length || !service.brain) return "unknown pet"
      var ok = service.brain.tripNow(i, kind, Date.now())
      service.think()
      return ok ? "ok" : "no room"
    }
    // toss "<pet> <gx> <gy>": a scripted drag and throw (the pointer moves
    // gx, gy grid units over ~100 ms, then lets go), for tests and the bench
    function toss(spec: string): string {
      var parts = String(spec).trim().split(/\s+/)
      var i = Number(parts[0]), gx = Number(parts[1]) || 0, gy = Number(parts[2]) || 0
      if (!(i >= 0 && i < service.pets.length)) return "unknown pet"
      service.tossing = { pet: i, gx: gx, gy: gy, step: 0 }
      service.dragPet(i, "start", 0, 0)
      tosser.restart()
      return "ok"
    }
    function explorer(strategy: string): string {
      if (strategy !== "overlay" && strategy !== "mover") return "unknown"
      service.explorerStrategy = strategy
      return "ok"
    }
    function wide(mode: string): string {
      if (mode !== "on" && mode !== "off" && mode !== "auto") return "unknown"
      service.wideOverride = mode === "auto" ? "" : mode
      return "ok"
    }
    // The config as loaded: where it came from, what was wrong, which pets.
    function config(): string {
      return JSON.stringify({ path: service.configPath, source: service.configSource, error: service.configError,
                              warnings: service.configWarnings, pets: service.pets.map(function(p) { return p.id }) })
    }
    // gallery <forms|mine|evolved|actions|expressions|props|bodies|eyes|mouths|toppers|accessories|patterns|off>
    function gallery(section: string): string {
      var known = ["forms", "mine", "evolved", "actions", "expressions", "props", "bodies", "eyes", "mouths", "toppers", "accessories", "patterns"]
      if (section === "off") { service.gallerySection = ""; return "ok" }
      if (known.indexOf(section) === -1) return "unknown"
      service.gallerySection = section
      return "ok"
    }
    function resetCounters(): string { service.frames = 0; service.ticks = 0; service.plays = 0; return "ok" }
  }

  Component.onCompleted: {
    if (runtimeDir) eventsDirMaker.running = true
    Hub.service = service
    makeEngine()
  }
  Component.onDestruction: if (Hub.service === service) Hub.service = null
}
