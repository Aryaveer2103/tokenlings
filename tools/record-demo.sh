#!/bin/bash
# Records a clip reel of the pets (dev-only): every base form idle, working,
# needing you, celebrating and doing its signature move, then two social
# scenes. Plays in the theater (a large view of the same engine) with a
# temporary cast of the ten base forms; your pets.json is not touched.
#
#   tools/record-demo.sh [output.mp4]      default .dev/media/reel-<date>.mp4
#
# Needs gpu-screen-recorder and ffmpeg (both dev-only here). The video is
# written outside the plugin folder first and moved in at the end: any write
# inside it hot-reloads every plugin.
set -uo pipefail

PLUGIN=$(cd "$(dirname "$0")/.." && pwd)
OUT=${1:-$PLUGIN/.dev/media/reel-$(date +%F).mp4}
TMP=$(mktemp -d "${XDG_RUNTIME_DIR:-/tmp}/tokenlings-reel.XXXXXX") || exit 1
RAW="$TMP/raw.mp4"
ipc() { omarchy-shell tokenlings "$@" >/dev/null 2>&1; }
command -v gpu-screen-recorder >/dev/null || { echo "gpu-screen-recorder is needed" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg is needed" >&2; exit 1; }
omarchy-shell tokenlings stats >/dev/null 2>&1 || { echo "tokenlings is not answering" >&2; exit 1; }

MONITOR=$(hyprctl monitors -j | jq -r '.[] | select(.focused) | .name')
cleanup() {
  [ -n "${REC:-}" ] && kill -INT "$REC" 2>/dev/null && wait "$REC" 2>/dev/null
  ipc caption ""; ipc theater off; ipc demo "cast off"; ipc awake auto
  rm -rf "$TMP"
}
trap cleanup EXIT

say() { ipc caption "$1"; }
state() { ipc demo "state $1 all"; }

ipc awake on
ipc demo "cast forms"
ipc demo "seed 3"
ipc theater on
sleep 2

gpu-screen-recorder -w "$MONITOR" -f 30 -cursor no -encoder cpu -o "$RAW" >/dev/null 2>&1 &
REC=$!
sleep 1.5

say "Idle: blinks, glances, a stretch"; ipc demo "stop"; sleep 1; state "wake"; sleep 4
say "Working: edit"; state "tool.edit"; sleep 3.5
say "Working: shell"; state "tool.shell"; sleep 3
say "Working: read · web"; ipc demo "state tool.read 0"; for i in 1 2 3 4 5 6 7 8 9; do ipc demo "state $( [ $((i % 2)) = 0 ] && echo tool.read || echo tool.web ) $i"; done; sleep 3.5
say "Thinking"; state "thinking"; sleep 3
say "Needs you"; state "needs.0"; sleep 3
say "Needs you (30 s later)"; state "needs.30s"; sleep 3
say "Done (a short task)"; state "done.short"; sleep 1.6
say "Done (a long one)"; state "done.long"; sleep 3.8
say "Signature moves"; ipc demo "signature all"; sleep 6
say "Evolved forms"; ipc demo "cast evolved"; sleep 1; state "done.streak"; sleep 3
ipc demo "cast forms"; ipc demo "stop"; sleep 1

say "Slate needs you: everyone points"
ipc event '{"pet":"slate","session":"reel","event":"needs"}'
sleep 4
ipc event '{"pet":"slate","session":"reel","event":"needs.end"}'
sleep 1.5
say "Catch, and Jinx pulls a prank"
ipc scene "catchBall 0,5"
ipc scene "prank 4,2"
sleep 7.5
say "High five"
ipc scene "highFive 7,9"
sleep 4.5

kill -INT "$REC"; wait "$REC" 2>/dev/null; REC=""
mkdir -p "$(dirname "$OUT")"
# The pets sit in the middle band of the screen: crop to it.
ffmpeg -loglevel error -y -i "$RAW" -vf "crop=iw:ih*0.42:0:ih*0.30" -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p "$TMP/reel.mp4" &&
  ffmpeg -loglevel error -y -i "$TMP/reel.mp4" -vf "fps=15,scale=1100:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer" "$TMP/reel.gif"
mv -f "$TMP/reel.mp4" "$OUT"
[ -f "$TMP/reel.gif" ] && mv -f "$TMP/reel.gif" "${OUT%.mp4}.gif"
echo "written: $OUT"
