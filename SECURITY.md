# Security and privacy

Tokenlings is a plugin for `omarchy-shell`. It runs inside the shell's
Quickshell process with your user's permissions, like every Omarchy plugin.
This file lists everything it can do and why, so a review can check each
item against the code.

## What it never does

- No network access of any kind (no sockets, no HTTP, no downloads, no update checks).
- No credentials: it never opens an agent's auth or token files.
- No `sudo`, `pkexec` or `doas`; no package installs; no systemd units; no
  services that outlive the shell.
- From your agents' sessions it never stores prompts, tool input or output,
  file contents or full paths (see "What the hook records").
- It never changes an agent's configuration without showing you the exact
  change (a unified diff) and getting an explicit yes.

## Files it writes

| Path | What | When |
|---|---|---|
| `$XDG_CONFIG_HOME/tokenlings/pets.json` | your pets and settings | when you save in the panel or use the CLI (`add`, `edit`, `rename`, `remove`, `import`) |
| `$XDG_STATE_HOME/tokenlings/` (0700) | `pets.last-good.json` (the last config that loaded), `stats.json` (levels, turn counts and times), `welcomed` (the first-run welcome was seen), `backups/<time>/` (copies of agent configs taken before each hook install or uninstall) | while running; before each hook change |
| `$XDG_RUNTIME_DIR/tokenlings/events/` (0700, made at start) and `<pet>.log` in it (0600) | one line per agent hook event (see below); the hook starts the log over past about 60 KiB | each time an agent's hook runs |
| an agent's hook settings | Tokenlings' hook entries, marked so they can be removed exactly | only after you confirm the diff (panel **Connect**, or `tokenlings hooks install`) |

Nothing is ever written inside the plugin folder. `pets.json` is written
whole (a temporary file renamed over it): the panel first checks the new
content the way loading does, the CLI checks each value against the shipped
`schema/pets.schema.json`. `pets.json` holds what you put in it, including the
account folders you point pets at.

`tokenlings uninstall` removes only Tokenlings' hook entries (each change
shown and confirmed, backed up first); with `--purge` it also deletes
`~/.config/tokenlings`, `~/.local/state/tokenlings` and
`$XDG_RUNTIME_DIR/tokenlings`, asking for each (never following a symlink).

Agent hook files it can change, one per provider, after confirmation:
`<claude config dir>/settings.json`, `<codex home>/hooks.json`,
`<grok home>/hooks/tokenlings.json`, `<kimi home>/config.toml` (a marked block),
`<opencode config>/plugins/tokenlings.js`, `<muse config>/settings.json`,
`<gemini folder>/settings.json`. With several accounts, each account's own
file. Other entries in those files are kept as they
are; Codex hook groups never change position (Codex trusts them by position).

## What the hook records

`bin/tokenlings-hook` (POSIX `sh`) is what an agent runs. Per event it appends
one line to its pet's log:

```json
{"t":1792915747678,"p":"claude","e":"PreToolUse","c":"shell","k":"","s":"60cbf2cc123fabc0","pid":575185,"chain":[575340,575185,28665],"cwd":"my-project"}
```

- `e` the event name, `c` the kind of tool (edit, shell, read, web, mcp, task,
  other; the tool's own name is not stored), `k` a notification kind
- `s` the first 16 hex digits of the SHA-256 of the session id
- `pid`, `chain`: the agent's process and its parents (to focus its terminal)
- `cwd` the **basename** of the working folder (shown in tooltips only if
  you turn that on; never the full path)

Which pet: the hook is called with `--pet <id>` and, for a per-account file,
`--account <folder>` (the folder that file belongs to). It reads one
environment variable of the calling agent, its account folder
(`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GROK_HOME`, `KIMI_CODE_HOME`,
`GEMINI_CLI_HOME`, `OPENCODE_CONFIG_DIR`, or `XDG_CONFIG_HOME` for Muse).
When that names a folder other than `--account`, it looks the folder up in
`pets.json` (a regular file, at most 256 KiB, read with `head -c` into `jq`)
and either leaves the event to the pet on that account or, where one hook
location serves several accounts, writes it to that pet's log. Pet ids taken
from `pets.json` are checked against `[a-z0-9_-]{1,32}` before use.

It reads at most 64 KiB of the hook's stdin and discards the rest, prints
nothing, always exits 0, spawns nothing that outlives it, and refuses to write
when any part of the path is a symlink or not owned by you. Hook commands are
guarded (`[ -x '<hook>' ] && '<hook>' …; exit 0`), so removing the plugin
without removing its hooks leaves every agent working.

## What it reads

- its own config, state and event files, each one through a single
  `sh -c '[ -f "$f" ] && [ -O "$f" ] … head -c <cap>'` (`core/safe.mjs`): only
  regular files you own, never a FIFO or device, never through a symlink
  (except `pets.json`, which may be a dotfile manager's link to a regular file
  of yours), each with a size cap: pets.json and its last-good copy 256 KiB,
  stats 64 KiB, event logs 128 KiB. Changes are noticed with inotify by
  watchers that never read.
- `/proc/<pid>/stat` (process name and CPU time) of every process, only while
  some pet is set to follow a process (Tier B: once every 30 s to find it,
  every 3 s while it runs, at most 4096 lines); and whether each open session's
  agent process still exists (`[ -d /proc/<pid> ]`, once a minute while
  sessions are open)
- Hyprland: windows (class, title, position, size, workspace, focus),
  workspaces, monitors and fullscreen state, through Quickshell's Hyprland
  integration; window events while a pet is out on a desktop trip
- UPower (on battery, battery level), MPRIS (is something playing), the
  shell's idle state, the Omarchy theme colours
- looking for agent accounts (first run, opening the Pets tab, **Find my
  agents**), once each time, nothing in the background:
  - whether each agent's default folder and the patterns `~/.<folder>-*` and
    `~/.config/<agent>-*` exist and hold one of its marker files (checked by
    name with `[ -e ]`; nothing inside is opened);
  - for running processes of yours that are agent CLIs (by process name, or
    the first 2 KiB of the command line for `node`/`bun`; at most 256
    processes): the first 64 KiB of `/proc/<pid>/environ`, of which only the
    account variables above are kept, and only values that are plain absolute
    paths to existing folders. Everything else in the environment is discarded
    in the same pipeline, never stored or shown. Shell startup files (`.bashrc`
    and the like) are never read.
  What is found is only proposed; nothing is written without a yes.
- `tokenlings doctor` (CLI and the About and Connect tabs): for each Codex
  `hooks.json` with Tokenlings entries, the first 1 MiB of that account's
  `config.toml`, to see whether `[hooks.state."…"]` trust entries exist for
  them (names and `enabled` only; hashes are not compared)

## Commands it runs

| Command | Why |
|---|---|
| `sh -c` with fixed scripts | bounded file reads, `/proc` sampling, the agent-account scan (folders and running agents' account variables), making the events folder |
| `hyprctl dispatch` (`hl.dsp.focus(...)`, or `focuswindow` on non-Lua configs) | clicking a pet focuses its agent's terminal |
| `notify-send` | only if you turn notifications on; the text is the pet's name and its state |
| `wl-copy` | **Share card** copies the pet's design card |
| `mkdir -p -m 700` | its own config and state folders |
| `bin/tokenlings` | the panel's hook installer, hook status and doctor (the same script as the CLI; it uses `jq`, `diff`, `cmp`, `base64`, `cksum`, `mktemp`) |

Process arguments never carry private data.

## Its IPC (`omarchy-shell tokenlings …`)

`stats`, `config`, `reload`, `editor`, `focus`, `event`, `demo`, `stop`,
`scene`, `roam`, `toss`, `brain`, `pause`/`resume`, `hide`/`show`, `awake`,
`theater`, `caption`, `gallery`, and bench switches (`renderer`, `fps`,
`power`, `roaming`, `drawIn`, `wide`, `explorer`, `resetCounters`). None of
them writes anything but the plugin's own state (an `event` that ends a turn
updates stats.json, as a real one would). `event` takes a normalised event (at most 4 KiB of JSON)
for testing. Like every shell IPC target it is reachable only by processes
running as you.

## Rendering

Every string that comes from outside the plugin (pet names, window titles,
tool kinds, folder names, doctor output, diffs) is drawn with
`textFormat: Text.PlainText`, so markup or images in them are shown as text.

## Pet cards

`tkl1:` cards carry a pet's look, personality, signature move, base form,
name and a provider hint — never its id, account folder or stats. Imports
are checked strictly (known keys and parts only, a checksum, at most 4 KiB);
anything unexpected rejects the whole card.

## Reporting a problem

Open an issue at https://github.com/Aryaveer2103/tokenlings/issues. For
something you would rather not post publicly, say so in the issue and we
will arrange another way to talk.
