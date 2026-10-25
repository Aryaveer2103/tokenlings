# Changelog

All notable changes to Tokenlings. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-10-26

### Added
- Account limits: hover a pet to see its account's session and weekly usage
  ("session 21% · weekly 50%", with the reset time once a window is nearly
  used up). The **Pets** tab shows a meter per limit, the plan and when each
  resets. Read with Omarchy's own usage collectors, one account at a time
  with a cache of its own, every 5 minutes while you are at the computer.
  Claude Code, Codex, Grok and Kimi. A pet slumps when a limit runs out and
  cheers when one resets. **Behaviour → Account limits** turns it off.
- Setup in one click: on first run Tokenlings makes a pet for every agent
  account it finds (pets.json only), and Welcome offers **Connect all my
  agents**: one yes connects every pet to its agent (a backup of every file it
  changes, and a notification naming them) and turns on **Behaviour → Connect
  new pets to their agents automatically**, so pets added later are connected
  too. Each hooks file is connected automatically once, so hooks you remove
  stay removed. Nothing touches an agent's settings before that yes.
  `tokenlings hooks auto` does the same from a terminal.
- **Behaviour → Pet size**: Small, Medium, Large (as thick as the bar) or Huge.
- Click a pet to see its usage: Omarchy's Agents panel opens on that agent's
  tab (on the panel as it is when it has no tabs; on the pet's card in the
  Tokenlings panel when there is no Agents panel). A pet that needs you still
  takes you to its terminal. It is the new default click (**Edit → Click →
  Show its usage**).

### Fixed
- Hovering and clicking the pets did nothing, or opened the Tokenlings panel,
  whenever the bar had started after them: the bar's surface sat above the
  pets' and took the pointer. The pets now live on the overlay layer.
- Tooltips never showed: the bar shows one only while its target says it is
  hovered, and the pets' slot never did. Moving from one pet to the next no
  longer leaves the first one's tooltip up or hides the second's.
- A pet that leaned, hopped or bounced slid its pointer area out from under a
  still pointer, restarting the hover animation over a click's.
- Running pets jumped: at the start of each new animation away from their slot
  they were drawn twice as far out for a moment, then snapped back. Running is
  also smoother (frames follow the display while a pet moves, back to the
  usual cap when it stops) and slower, and zoomies stay off other widgets.

### Changed
- Pets are bigger: Large, the new default, is as thick as the bar (they used
  to be about three quarters of it).
- The **Edit** and **Connect** tabs apply every change as you make it, so the
  pet on the bar follows each click; there is no Save. **Undo changes** puts
  the pet back as it was when you opened it.
- A connected pet's **Connect**, **Install hooks…** and Welcome's **Connect…**
  turn into a faded **✓ Connected**.
- Backups of agent settings carry the account folder in their name, so two
  accounts backed up in the same second no longer overwrite each other.

## [1.0.0] - 2026-10-25

First public release.

### Pets
- Any number of pets, one per agent account, for any provider. Each starts
  from its provider's base form (Ember, Slate, Prism, Mochi, Jinx, Tide,
  Shell, Drift, Lyra, or Bit for anything else) with its own personality,
  habits and signature move, and an evolved form at level 10.
- Several accounts of the same agent: the first keeps the pure base form,
  every other one gets its own colours, an accessory and a nudge to one trait,
  seeded from its account folder (stable across reinstalls). Tooltips name
  the account when two pets share a provider.
- Parts library: 8 bodies, 10 eyes, 7 mouths, 12 hair and ear styles, 19
  accessories (two unlocked by levels), 7 patterns, 193 animation clips;
  palettes that can follow the Omarchy theme.
- `~/.config/tokenlings/pets.json` with a JSON schema, migrations, live reload
  and a last-good fallback when the file is broken.

### Animation and behaviour
- Clips as data on one shared, frame-quantised clock that stops completely
  when nothing moves: zero frames while pets rest.
- Agent states: session start, prompt, thinking, edit, shell, read, web, MCP,
  subagents, busy montage, failure, needs you (an escalation ladder that ends
  in a doze), compacting, done (scaled by task length, streaks), session end,
  shadow clones for parallel sessions.
- Touch: hover, click to focus the agent's terminal, double-click for the
  signature move, scroll to pat, drag and fling with physics, middle-click for
  do not disturb, right-click for the panel.
- Ambient antics weighted by personality under a global attention cap;
  context (media, battery, night and morning, workspace switches, fullscreen
  hides the pets); social scenes (high-fives, cheer squads, pointing at the pet
  that needs you, chases, catch, naps in a pile and more).
- Roaming along the bar (strolls, perching, zoomies) and optional desktop
  trips onto window edges in a small surface made for the trip.
- Power modes (Show-off, Balanced, Battery, Still) that follow AC and battery;
  reduced motion.
- Progression: XP per finished turn, levels, unlocks, per-pet stats. No decay,
  no neglect penalties.

### Agents
- Lifecycle hooks for Claude Code, Codex CLI, Gemini CLI, Grok Build, Kimi
  Code, OpenCode and Muse, through one POSIX `sh` bridge that stores only the
  event, a tool category, a hashed session id, process ids and the project
  folder's basename.
- Account routing: a session on one account never drives another account's
  pet (Claude Code loads `~/.claude/settings.json` as project settings in a
  session started in `$HOME`, whichever account it runs); where one hook
  location serves several accounts, events go to the pet on the session's
  account.
- Opt-in installer with a diff, a backup, an exact uninstall and a guarded hook
  command (removing the plugin never breaks an agent); Codex hooks are only
  ever appended, and doctor reports hooks Codex has not trusted yet.
- Process (`process:<regex>`) and window (`window:<regex>`) signals for agents
  and apps without hooks.

### Panel and CLI
- Panel: Pets, Edit (live preview), Connect, Behaviour, About, and a first-run
  Welcome that finds agent accounts (folders, and the account variables of
  running agents) and proposes one pet each. New accounts found later are
  offered on the Pets tab. Keyboard navigable.
- `bin/tokenlings`: list, add, edit, rename, remove, export and import pet
  cards (`tkl1:`), hooks install, uninstall and status, doctor, demo, event,
  uninstall `--purge`; `--json` everywhere.

### Not in 1.0
- Usage exhausted and refreshed reactions exist as clips but have no data
  source yet.
- "Response ready" for desktop and web apps: Omarchy offers plugins no
  supported way to observe other apps' notifications, so window presence is
  all Tier C shows.
- Gemini CLI and OpenCode adapters are tested against recorded sessions only.
