// First run: which agent accounts are on this machine, and the pets we
// would suggest for them. The shell scans (scanScript: folders that exist,
// and the account variables of agents that are running); this turns the list
// into proposals. On the first run the shell creates them all (backup-looking
// folders stay unticked, so out); later, nothing is written until the user
// confirms. Agent configs are connected by settings.autoConnect, or after a
// per-provider yes in the Connect step.
import { FORMS, formFor } from "../forms/forms.mjs"
import { ACCOUNTS, PROVIDERS, extraGlobs, absolute, tilde, petDir, looksLikeBackup } from "./accounts.mjs"

// Providers the hook installer knows (the others get Tier B or C).
export const HOOKED = ["claude", "codex", "grok", "kimi", "opencode", "muse", "gemini"]

// The process names of each agent (`node`/`bun` agents are told apart by
// their command line). claude-desktop is a window, not an account.
const COMMS = { claude: "claude", codex: "codex", grok: "grok", opencode: "opencode|.opencode", muse: "muse|muse-bin*", gemini: "gemini" }
const SCRIPTS = { kimi: "kimi", gemini: "gemini", claude: "claude-code", opencode: "opencode" }

// A POSIX sh scan for the shell to run. Prints "provider<TAB>folder" lines,
// at most 48:
//  1. the default folder and the extra-account patterns of every provider
//     (~/.claude-work, ~/.config/codex-2 …) that hold one of the provider's
//     markers (existence only: no file is opened);
//  2. the account variable (CLAUDE_CONFIG_DIR, CODEX_HOME, GROK_HOME …) of
//     every running agent process of this user: the first 64 KiB of
//     /proc/<pid>/environ, at most 256 processes looked at, only those names
//     kept, only absolute folders that exist. Shell rc files are never read.
export function scanScript() {
  const lines = ["h=$HOME; n=0", "out() { [ -d \"$2\" ] && [ ! -L \"$2\" ] && [ $n -lt 48 ] && { printf '%s\\t%s\\n' \"$1\" \"$2\"; n=$((n+1)); }; return 0; }"]
  for (const p of PROVIDERS) {
    const a = ACCOUNTS[p]
    const test = "{ " + a.marker.map(x => `[ -e "$d/${x}" ]`).join(" || ") + "; }"
    lines.push(`for d in "$h/${a.dir}" ${extraGlobs(p).map(g => `"$h"/${g}`).join(" ")}; do [ -d "$d" ] && ${test} && out ${p} "$d"; done`)
  }
  const names = Object.values(ACCOUNTS).map(a => a.env).filter(Boolean).concat(["XDG_CONFIG_HOME"])
  const comms = Object.entries(COMMS).map(([p, c]) => `${c}) p=${p} ;;`).join(" ")
  const scripts = Object.entries(SCRIPTS).map(([p, s]) => `*${s}*) p=${p} ;;`).join(" ")
  lines.push(
    "k=0",
    "for d in /proc/[0-9]*; do",
    "  [ $k -lt 256 ] || break",
    "  [ -O \"$d\" ] || continue",
    "  c=; read -r c < \"$d/comm\" 2>/dev/null || continue",
    "  p=",
    `  case "$c" in ${comms} node|bun) a=$(head -c 2048 "$d/cmdline" 2>/dev/null | tr '\\0' ' '); case "$a" in ${scripts} esac ;; esac`,
    "  [ -n \"$p\" ] || continue",
    "  k=$((k+1))",
    `  head -c 65536 "$d/environ" 2>/dev/null | tr '\\0' '\\n' | grep -E '^(${names.join("|")})=/' | head -n 8 | while IFS='=' read -r name v; do`,
    "    case \"$v\" in *[!A-Za-z0-9._/@+-]*) continue ;; esac",
    "    printf '%s\\t%s\\t%s\\n' \"$p\" \"$name\" \"$v\"",
    "  done",
    "done | sort -u | head -n 32 | while IFS='\t' read -r p name v; do",
    "  case \"$p:$name\" in",
    ...PROVIDERS.filter(p => ACCOUNTS[p].env).map(p => `    ${p}:${ACCOUNTS[p].env}) d="$v${ACCOUNTS[p].envSub ? "/" + ACCOUNTS[p].envSub : ""}" ;;`),
    ...PROVIDERS.filter(p => ACCOUNTS[p].xdg).map(p => `    ${p}:XDG_CONFIG_HOME) d="$v/${ACCOUNTS[p].xdg}" ;;`),
    "    *) continue ;;",
    "  esac",
    "  [ -d \"$d\" ] && [ ! -L \"$d\" ] && printf 'env\\t%s\\t%s\\n' \"$p\" \"$d\"",
    "done",
    "exit 0")
  return lines.join("\n")
}

// Scan output → [{ provider, dir, from }] (validated: known providers,
// absolute paths, no control characters, no "..", each folder once; folder
// matches outside home are kept only when a running agent named them).
export function parseScan(text, home) {
  const out = [], seen = new Set()
  const known = new Set(PROVIDERS)
  for (const line of String(text || "").split("\n").slice(0, 96)) {
    let parts = line.split("\t"), from = "folder"
    if (parts[0] === "env") { from = "env"; parts = parts.slice(1) }
    if (parts.length !== 2) continue
    const provider = parts[0], dir = parts[1].replace(/\/+$/, "")
    if (!known.has(provider) || !dir || dir[0] !== "/" || dir.length > 512 || /[\u0000-\u001f]/.test(dir) || /(^|\/)\.\.(\/|$)/.test(dir)) continue
    if (from === "folder" && home && dir.indexOf(home + "/") !== 0) continue
    const key = provider + "\t" + dir
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ provider, dir, from })
  }
  return out
}

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32)

// The name for an extra account from its folder's suffix: ~/.claude-work →
// "Work", ~/.config/codex-2 → "2", /srv/agents/grok-alt → "Alt".
export function suffixOf(provider, dir) {
  const a = ACCOUNTS[provider]
  const leaf = String(dir).split("/").pop().replace(/^\./, "")
  const stems = [a ? a.dir.split("/").pop().replace(/^\./, "") : "", provider].filter(Boolean).sort((x, y) => y.length - x.length)
  for (const s of stems) if (leaf.toLowerCase().startsWith(s.toLowerCase()) && leaf.length > s.length && /[-_.]/.test(leaf[s.length])) {
    const rest = leaf.slice(s.length + 1)
    return rest ? rest.charAt(0).toUpperCase() + rest.slice(1, 12) : ""
  }
  return leaf === (stems[0] || "") ? "" : leaf.charAt(0).toUpperCase() + leaf.slice(1, 12)
}

// [{ provider, dir }] → pets to suggest, one per account not already in
// `existing` (the pets in pets.json): ids from the folder's name (claude,
// claude-work, codex-2), names from the base form (Ember, Ember Work), the
// folder as the account (~/… form). Folders that look like backups are
// proposed unticked.
export function propose(found, home, existing) {
  const have = new Set((existing || []).map(p => p.provider + "\t" + petDir(p, home)))
  const used = new Set((existing || []).map(p => p.id)), names = new Set((existing || []).map(p => p.name)), out = []
  for (const f of found) {
    const dir = absolute(f.dir, home)
    if (have.has(f.provider + "\t" + dir)) continue
    have.add(f.provider + "\t" + dir)
    const form = formFor(f.provider)
    const a = ACCOUNTS[f.provider]
    const isDefault = a && dir === absolute("~/" + a.dir, home)
    const extra = isDefault ? "" : suffixOf(f.provider, dir)
    const base = dir.split("/").pop().replace(/^\./, "")
    let id = slug(isDefault ? f.provider : base) || form
    if (!/^[a-z0-9]/.test(id)) id = form
    let k = 2
    const stem = id.slice(0, 28)
    while (used.has(id)) id = `${stem}-${k++}`
    used.add(id)
    let name = (FORMS[form].label + (extra ? " " + extra : "")).slice(0, 24)
    let n = 2
    while (names.has(name)) name = `${FORMS[form].label} ${n++}`
    names.add(name)
    out.push({ id, name, provider: f.provider, baseForm: form, account: { configDir: tilde(dir, home) }, hooks: HOOKED.includes(f.provider),
               selected: !looksLikeBackup(dir), found: f.from || "folder" })
  }
  return out
}

// The pets.json a confirmed welcome writes (a minimal file: everything left
// out comes from each pet's base form when it loads).
export function configFrom(chosen, settings, schemaRef) {
  return {
    "$schema": schemaRef,
    version: 1,
    settings: settings || {},
    pets: chosen.map(p => ({ id: p.id, name: p.name, provider: p.provider, baseForm: p.baseForm, account: { configDir: p.account.configDir } }))
  }
}

// Codex trusts each hook once, per account (its /hooks screen); a pet on a
// Codex account needs that step after its hooks are installed.
export function needsTrustStep(provider) { return provider === "codex" }
// The words for that step, naming the account: "codex" for the default one,
// "CODEX_HOME=~/.codex-2 codex" for the others.
export function trustStep(configDir, home) {
  const dir = tilde(configDir || "~/.codex", home)
  const run = dir === "~/.codex" ? "codex" : `CODEX_HOME=${dir} codex`
  return `Run /hooks in Codex once for this account: start ${run}, type /hooks and trust the Tokenlings entries. Until then Codex skips them.`
}
