#!/bin/bash
# Tokenlings bench (dev-only). Runs seeded demo scenarios through the plugin's
# IPC and measures what the shell pays for them.
#
#   tools/bench.sh [set] [seconds per row]      set: phase3 (default)
#
# Per row: shell CPU (quickshell utime+stime, % of one core), wake-ups/s
# (context switches), RSS at the end, stage frames/s and clock ticks/s (from
# `omarchy-shell tokenlings stats`), iGPU busy (100 - RC6 residency, Intel
# only), and the runtime status of any discrete GPU.
#
# Results are written to a temporary file and moved to .dev/bench/ only when
# the run ends: any write inside the plugin folder hot-reloads every plugin.
#
# Optional environment:
#   BENCH_BEFORE / BENCH_AFTER   shell commands run before and after the run
#                                (e.g. hide another widget that would add noise)
#   BENCH_SETTLE                 seconds to settle before each row (default 8)
set -uo pipefail

SET="${1:-phase3}"
SECS="${2:-45}"
SETTLE="${BENCH_SETTLE:-8}"
PLUGIN=$(cd "$(dirname "$0")/.." && pwd)
OUT_DIR="$PLUGIN/.dev/bench"
TMP=$(mktemp "${XDG_RUNTIME_DIR:-/tmp}/tokenlings-bench.XXXXXX") || exit 1
NAME="$(date +%F)-$SET.md"

ipc() { omarchy-shell tokenlings "$@" 2>/dev/null; }
stat_json() { ipc stats; }

PID=$(pgrep -f -x "quickshell -n -p ${OMARCHY_PATH:-/usr/share/omarchy}/shell" | head -1)
[[ -n $PID ]] || { echo "omarchy shell is not running" >&2; exit 1; }
[[ -n $(stat_json) ]] || { echo "tokenlings is not answering (enabled?)" >&2; exit 1; }
HZ=$(getconf CLK_TCK)

cpu_ticks() { awk '{ print $14 + $15 }' "/proc/$PID/stat"; }
# The compositor's CPU too: a surface's cost is partly Hyprland's (it composites
# whatever a frame damages).
HPID=$(pgrep -x Hyprland | head -1)
hypr_ticks() { [[ -n $HPID ]] && awk '{ print $14 + $15 }' "/proc/$HPID/stat" || echo 0; }
switches() { awk '/ctxt_switches/ { s += $2 } END { print s }' "/proc/$PID/status"; }
rss_mb() { awk '/VmRSS/ { printf "%.1f", $2 / 1024 }' "/proc/$PID/status"; }
rc6_file=$(ls /sys/class/drm/card*/gt/gt0/rc6_residency_ms 2>/dev/null | head -1)
rc6() { [[ -n $rc6_file ]] && cat "$rc6_file" || echo 0; }
dgpu() {
  local d out=""
  for d in /sys/bus/pci/devices/*; do
    [[ $(cat "$d/class" 2>/dev/null) == 0x03* ]] || continue
    [[ $(cat "$d/boot_vga" 2>/dev/null) == 1 ]] && continue
    out+="$(cat "$d/power/runtime_status" 2>/dev/null) "
  done
  echo "${out:-none}"
}
now_ms() { date +%s%3N; }
# Whether the desktop went idle (screensaver, lock, display off) during a row:
# such rows measure a different desktop and are marked.
idle_flag() { omarchy-shell idle status 2>/dev/null | jq -r 'if .inIdleCycle or .screensaverStarted then "idle" else "" end' 2>/dev/null; }

cleanup() {
  [[ -n ${DRIVER:-} ]] && kill "$DRIVER" 2>/dev/null
  ipc roaming auto >/dev/null; ipc wide auto >/dev/null; ipc explorer mover >/dev/null; ipc demo 'cast off' >/dev/null
  ipc stop >/dev/null; ipc show >/dev/null; ipc awake auto >/dev/null; ipc renderer baked >/dev/null; ipc fps 0 >/dev/null; ipc power auto >/dev/null; ipc drawIn stage >/dev/null
  [[ -n ${BENCH_AFTER:-} ]] && bash -c "$BENCH_AFTER"
}
trap cleanup EXIT

row() {  # row <label> <setup> [seconds]: setup is a list of IPC calls separated by ';'
  # (an argument with spaces is quoted with ', e.g. demo 'state tool.edit all')
  local label="$1" setup="$2" secs="${3:-$SECS}" IFS=';' call
  for call in $setup; do eval "ipc $call" >/dev/null; done
  sleep "$SETTLE"
  local c0 s0 r0 t0 j0 c1 s1 r1 t1 j1
  c0=$(cpu_ticks); h0=$(hypr_ticks); s0=$(switches); r0=$(rc6); t0=$(now_ms); j0=$(stat_json); i0=$(idle_flag)
  local m0; m0=$(rss_mb)
  sleep "$secs"
  local i1; i1=$(idle_flag)
  c1=$(cpu_ticks); h1=$(hypr_ticks); s1=$(switches); r1=$(rc6); t1=$(now_ms); j1=$(stat_json)
  local f0 f1 k0 k1
  f0=$(jq .frames <<<"$j0"); f1=$(jq .frames <<<"$j1"); k0=$(jq .ticks <<<"$j0"); k1=$(jq .ticks <<<"$j1")
  awk -v label="$label" -v dc=$((c1 - c0)) -v dh=$((h1 - h0)) -v hz="$HZ" -v ds=$((s1 - s0)) -v dt=$((t1 - t0)) \
      -v df=$((f1 - f0)) -v dk=$((k1 - k0)) -v dr=$((r1 - r0)) -v rss="$(rss_mb) (+$(awk -v a="$m0" -v b="$(rss_mb)" 'BEGIN { printf "%.1f", b - a }'))" -v gpu="$(dgpu)" -v rc6="${rc6_file:+1}" -v idle="${i0}${i1}" '
    BEGIN {
      secs = dt / 1000
      igpu = rc6 ? sprintf("%.1f", 100 - dr / dt * 100) : "n/a"
      if (idle != "") label = label " (IDLE: discard)"
      printf "| %-34s | %5.2f | %5.2f | %6.2f | %6.2f | %6.1f | %s | %5s | %s |\n",
        label, dc / hz / secs * 100, dh / hz / secs * 100, df / secs, dk / secs, ds / secs, rss, igpu, gpu
    }' | tee -a "$TMP"
}

{
  echo "# Tokenlings bench: $SET ($(date -Is))"
  echo
  echo "Tokenlings $(stat_json | jq -r .version), $SECS s per row after $SETTLE s settle." \
       "Power: AC=$(cat /sys/class/power_supply/A*/online 2>/dev/null | head -1)" \
       "profile=$(powerprofilesctl get 2>/dev/null || echo ?)."
  echo
  echo "| row | shell CPU % | Hyprland CPU % | frames/s | clock ticks/s | wakeups/s | RSS MB (row Δ) | iGPU % | dGPU |"
  echo "|---|---|---|---|---|---|---|---|---|"
} >"$TMP"
cat "$TMP"

[[ -n ${BENCH_BEFORE:-} ]] && bash -c "$BENCH_BEFORE"
# A driver repeats IPC calls in the background where a row needs trips or flings.
drive() { (while :; do eval "$1"; sleep "$2"; done) >/dev/null 2>&1 & DRIVER=$!; }
undrive() { [[ -n ${DRIVER:-} ]] && kill "$DRIVER" 2>/dev/null; DRIVER=""; ipc stop >/dev/null; }
LONG=$((SETTLE + SECS + 5))

case "$SET" in
phase3)
  # The animation engine with real clips on the configured pets. `awake on`
  # keeps the pets from dozing off when nobody touches the machine mid-bench.
  row "stage hidden (no tokenlings surface)" "awake on;stop;hide"
  row "pets asleep (resting)"                "show;demo 'state asleep.still all'"
  row "pets awake, idle (blinks, glances)"   "awake on;demo 'state wake all'"
  row "3 pets working: edit (8 fps grid)"    "demo 'state tool.edit all'"
  row "3 pets working: edit/shell/read"      "demo 'state tool.edit 0';demo 'state tool.shell 1';demo 'state tool.read 2'"
  row "3 pets busy montage (8 fps grid)"     "demo 'state busy all'"
  row "3 pets thinking"                      "demo 'state thinking all'"
  row "every state, back to back (walk)"     "demo 'walk 1'"
  row "3 pets working, battery mode"         "power battery;demo 'state tool.edit all'"
  row "pets asleep again"                    "power auto;demo 'state asleep.still all'"
  ;;
phase4)
  # The brain running the configured pets on its own (ambient, social, naps),
  # against the budgets: Balanced ambient ≤ 0.5 %, 3 working ≤ 1.5 %.
  row "stage hidden (no tokenlings surface)" "awake on;stop;hide" 60
  row "Balanced ambient, brain on (10 min)"  "show;demo 'seed 7'" 600
  row "3 pets working: edit/shell/read"      "demo 'state tool.edit 0';demo 'state tool.shell 1';demo 'state tool.read 2'" 60
  row "3 pets busy montage"                  "demo 'state busy all'" 60
  row "3 pets working, battery mode"         "power battery;demo 'state tool.edit all'" 60
  row "pets asleep (user away)"              "power auto;awake off" 60
  ;;
rest)
  row "stage hidden (no tokenlings surface)" "awake off;stop;hide" 60
  row "pets asleep (user away)"              "show;awake off" 60
  ;;
roam)
  # Phase 6: trips along the bar, flings, desktop excursions with both window
  # strategies, and the brain roaming on its own. A cast of three pets no hook
  # writes to, so live agent sessions on this machine do not leak into rows.
  ipc demo 'cast trio' >/dev/null
  row "trio asleep (user away), strip narrow" "awake off;stop" 60
  row "trio asleep (user away), strip wide"   "wide on" 60
  ipc wide auto >/dev/null
  drive "ipc roam 'stroll 1'; sleep 9.5; ipc roam 'zoomies 2'; sleep 9.5; ipc roam 'perch 0'" 9.5
  row "bar trips back to back, strip auto"    "awake on" 60
  undrive
  ipc wide on >/dev/null
  drive "ipc roam 'stroll 1'; sleep 9.5; ipc roam 'zoomies 2'; sleep 9.5; ipc roam 'perch 0'" 9.5
  row "bar trips back to back, strip wide"    "awake on" 60
  undrive
  ipc wide auto >/dev/null
  drive "ipc toss '1 46 -10'" 7
  row "a fling every 7 s"                     "awake on" 60
  undrive
  ipc explorer mover >/dev/null
  drive "ipc roam 'explore 1'" 21
  row "desktop trips back to back: mover"     "awake on" 84
  undrive
  ipc explorer overlay >/dev/null
  drive "ipc roam 'explore 1'" 21
  row "desktop trips back to back: overlay"   "awake on" 84
  undrive
  ipc explorer mover >/dev/null
  ;;
roam-ambient)
  # The brain on its own with roaming on, against the 10 min Balanced budget (≤ 0.5 %).
  ipc demo 'cast trio' >/dev/null
  row "trio asleep (user away)"               "awake off;stop" 60
  row "trio, roaming bar (10 min)"            "awake on;roaming bar;demo 'seed 7'" 600
  row "trio, roaming desktop (10 min)"        "roaming desktop;demo 'seed 7'" 600
  ;;
roam-paired)
  # The same brain and seed with roaming home, bar and desktop, back to back:
  # what roaming itself adds to the 10 min Balanced ambient budget (≤ 0.5 %).
  ipc demo 'cast trio' >/dev/null
  row "trio asleep (user away)"               "awake off;stop" 60
  row "trio, roaming home (10 min)"           "awake on;roaming home;demo 'seed 7'" 600
  row "trio, roaming bar (10 min)"            "roaming bar;demo 'seed 7'" 600
  row "trio, roaming desktop (10 min)"        "roaming desktop;demo 'seed 7'" 600
  ;;
roam-sandwich)
  # Rest, ten minutes of roaming along the bar, rest again: the budget check
  # (Balanced ambient over rest ≤ 0.5 %) with its baseline on both sides.
  ipc demo 'cast trio' >/dev/null
  row "trio asleep (user away), before"       "awake off;stop" 120
  row "trio, roaming bar (10 min)"            "awake on;roaming bar;demo 'seed 7'" 600
  row "trio asleep (user away), after"        "awake off;stop" 120
  ;;
stock)
  # Every budget once more on stock Omarchy (no other pets, the stock bar).
  ipc demo 'cast trio' >/dev/null
  row "trio asleep (user away)"               "awake off;stop" 120
  row "Balanced ambient, roaming home (10 min)" "awake on;roaming home;demo 'seed 7'" 600
  row "Balanced ambient, roaming bar (10 min)" "roaming bar;demo 'seed 7'" 600
  row "3 pets working: edit/shell/read"       "demo 'state tool.edit 0';demo 'state tool.shell 1';demo 'state tool.read 2'" 120
  row "3 pets working, battery mode"          "power battery;demo 'state tool.edit all'" 120
  row "trio asleep again"                     "power auto;awake off;stop" 120
  ;;
ambient)
  # Ambient headroom on stock Omarchy: idle animation with bar roaming,
  # between two rest rows (the delta is against their mean).
  ipc demo 'cast trio' >/dev/null
  row "trio asleep (user away)"               "awake off;stop" 120
  row "Balanced ambient, roaming bar (10 min)" "awake on;roaming bar;demo 'seed 7'" 600
  row "trio asleep again"                     "awake off;stop" 120
  ;;
soak2h)
  # Two hours of the brain on its own (stock Omarchy), roaming on, with a
  # desktop trip and a fling every five minutes: RSS growth ≤ 10 MB, dGPU asleep.
  ipc demo 'cast trio' >/dev/null
  drive "ipc roam 'explore 1'; sleep 150; ipc toss '2 40 -8'" 150
  row "2 h soak: trio, roaming desktop"       "awake on;roaming desktop;demo 'seed 7'" 7200
  undrive
  ;;
soak)
  # 30 minutes of the brain on its own (seeded), for "alive but calm" and RSS.
  row "seeded soak, brain on (30 min)"       "awake on;show;demo 'seed 7'" 1800
  ;;
esac

ipc stop >/dev/null
mkdir -p "$OUT_DIR"
mv "$TMP" "$OUT_DIR/$NAME"
echo "written: $OUT_DIR/$NAME"
