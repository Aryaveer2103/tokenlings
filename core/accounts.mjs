// Accounts: where each provider keeps one, and how a running agent says which
// one it uses. One table for detection (core/welcome.mjs), the sibling looks
// (core/siblings.mjs) and the hook's routing (bin/tokenlings-hook mirrors it
// in sh; test/accounts.test.mjs keeps the two in step).
//
//   dir     the default account folder, relative to $HOME
//   env     the variable that points the CLI at another account folder
//   envSub  the account folder inside $env when $env names a home (Gemini)
//   xdg     the folder under $XDG_CONFIG_HOME when that is how accounts differ
//   marker  a file or folder that shows the CLI has run in a folder (its
//           existence only); extra-account folders need one
//   shared  one hook location can serve several accounts (OpenCode's global
//           plugin; Grok's ~/.grok/hooks when shared through hooks-paths):
//           the hook routes each event by the account in its environment
export const ACCOUNTS = {
  claude: { dir: ".claude", env: "CLAUDE_CONFIG_DIR", marker: ["settings.json", "projects"] },
  codex: { dir: ".codex", env: "CODEX_HOME", marker: ["config.toml", "sessions"] },
  gemini: { dir: ".gemini", env: "GEMINI_CLI_HOME", envSub: ".gemini", marker: ["settings.json", "tmp"] },
  // Grok 1.0.70 reads user hooks from $GROK_HOME/hooks when GROK_HOME is set
  grok: { dir: ".grok", env: "GROK_HOME", marker: ["config.toml", "sessions"], shared: true },
  kimi: { dir: ".kimi-code", env: "KIMI_CODE_HOME", marker: ["config.toml", "sessions"] },
  opencode: { dir: ".config/opencode", env: "OPENCODE_CONFIG_DIR", xdg: "opencode", marker: ["opencode.json", "opencode.jsonc", "plugins"], shared: true },
  muse: { dir: ".config/muse", xdg: "muse", marker: ["settings.json"] }
}
export const PROVIDERS = Object.keys(ACCOUNTS)

// Folder patterns (relative to $HOME) for extra accounts of a provider:
// ~/.<dir>-* and ~/.config/<provider>-* (claude-work, codex-2, grok-alt …).
export function extraGlobs(provider) {
  const a = ACCOUNTS[provider]
  if (!a) return []
  const leaf = a.dir.replace(/^\.config\//, "").replace(/^\./, "")
  const out = [`.${leaf}[-_]*`, `.config/${provider}-*`]
  if (a.dir.startsWith(".config/") && leaf !== provider) out.push(`.config/${leaf}-*`)
  return [...new Set(out)]
}

// "~/x", "/h/u/x/", "x" → an absolute path without a trailing slash.
export function absolute(dir, home) {
  let d = String(dir || "").trim()
  if (!d) return ""
  if (d === "~") d = home
  else if (d.startsWith("~/")) d = home + d.slice(1)
  else if (!d.startsWith("/")) d = home + "/" + d
  return d.length > 1 ? d.replace(/\/+$/, "") : d
}
// The other way: "~/…" when the folder is under home.
export function tilde(dir, home) {
  const d = absolute(dir, home)
  return home && d.indexOf(home + "/") === 0 ? "~" + d.slice(home.length) : d
}

export function defaultDir(provider, home) {
  const a = ACCOUNTS[provider]
  return a ? absolute("~/" + a.dir, home) : ""
}

// A pet's account folder (absolute); its provider's default when it names none.
export function petDir(pet, home) {
  const d = pet && pet.account && pet.account.configDir
  return d ? absolute(d, home) : defaultDir(pet && pet.provider, home)
}

// The account folder an agent's environment names, or "" when it names none:
// env is { NAME: value } as read from the agent's process.
export function dirFromEnv(provider, env, home) {
  const a = ACCOUNTS[provider]
  if (!a || !env) return ""
  if (a.env && env[a.env]) return absolute(env[a.env] + (a.envSub ? "/" + a.envSub : ""), home)
  if (a.xdg && env.XDG_CONFIG_HOME) return absolute(env.XDG_CONFIG_HOME + "/" + a.xdg, home)
  return ""
}

// Names that look like a backup or a copy rather than an account: proposed,
// but unticked.
export function looksLikeBackup(dir) {
  return /(back|bak|old|tmp|temp|trash|copy|orig|save)/i.test(String(dir).split("/").pop())
}
