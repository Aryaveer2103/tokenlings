// Colours: parsing, small HSL adjustments, theme tokens and the palette a pet
// is drawn with. Palette tokens: body, shade, light, accent, cheek, eye, gear
// (frames of glasses and headphones: graphite, or light on a dark body); theme
// tokens: outline, ink, shadow; plus white.
import { hash } from "./rng.mjs"

export function parse(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function toHex(rgb) {
  return "#" + rgb.map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("").toUpperCase()
}

export function isHex(value) { return parse(value) !== null }

export function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

export function fromHsl([h, s, l]) {
  h = ((h % 360) + 360) % 360 / 360
  if (s === 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const t = x => { x = (x + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p }
  return [t(h + 1 / 3) * 255, t(h) * 255, t(h - 1 / 3) * 255]
}

export function adjust(hex, dl, ds) {
  const rgb = parse(hex)
  if (!rgb) return hex
  const [h, s, l] = toHsl(rgb)
  return toHex(fromHsl([h, Math.max(0, Math.min(1, s + (ds || 0))), Math.max(0, Math.min(1, l + dl))]))
}

export function luminance(hex) {
  const rgb = parse(hex)
  if (!rgb) return 0
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
}

// a·(1 - t) + b·t, channel by channel.
export function mix(a, b, t) {
  const x = parse(a) || [128, 128, 128], y = parse(b) || [128, 128, 128]
  return toHex(x.map((c, i) => c * (1 - t) + y[i] * t))
}

export function fromHue(hue, sat, light) { return toHex(fromHsl([hue, sat, light])) }

// Bit's colour: a hue hashed from the provider name, so every unknown provider
// gets its own steady colour.
export function hashedBody(name) { return fromHue(hash(String(name || "bit")) % 360, 0.55, 0.62) }

// Fill in whatever a palette leaves out, from its body colour.
export function complete(palette) {
  const p = Object.assign({}, palette || {})
  if (!isHex(p.body)) p.body = "#DE7A5A"
  if (!isHex(p.shade)) p.shade = adjust(p.body, -0.12)
  if (!isHex(p.light)) p.light = adjust(p.body, 0.14)
  if (!isHex(p.accent)) p.accent = adjust(p.body, -0.05, 0.2)
  if (!isHex(p.cheek)) p.cheek = "#FF8F8F"
  if (!isHex(p.eye)) p.eye = luminance(p.body) < 0.08 ? "#F4F4F0" : adjust(p.body, -0.62, -0.2)
  p.gear = luminance(p.body) < 0.12 ? "#C9CED6" : "#2B2E31"
  return p
}

// A palette that follows the Omarchy theme: body from the theme's accent,
// the rest derived from it.
export function themed(theme) {
  const accent = isHex(theme && theme.accent) ? theme.accent : "#7AA2F7"
  return complete({ body: accent, cheek: "#FF8F8F" })
}

// Outline, ink and ground shadow that sit well on the current bar (the rule
// the original pets used): on a dark theme a warm darkened background, on a
// light theme the foreground.
export function themeTokens(theme) {
  const fg = parse(theme && theme.foreground) || [212, 217, 225]
  const bg = parse(theme && theme.background) || [0, 0, 0]
  const light = theme && theme.mode === "light"
  const outline = light ? fg : bg.map((c, i) => c * 0.45 + [28, 16, 14][i] * 0.55)
  return {
    outline: toHex(outline), outlineAlpha: 0.9,
    ink: toHex(fg),
    shadow: toHex(fg), shadowAlpha: 0.12
  }
}

// Tokens may carry a modifier: "tint:<token>" is that colour lifted toward its
// highlight, "tone:<token>" pushed toward its shadow (glossy shading).
export function resolve(token, palette, tokens) {
  if (typeof token !== "string" || token === "none") return "transparent"
  if (token.startsWith("tint:")) return adjust(resolve(token.slice(5), palette, tokens), 0.2, 0.05)
  if (token.startsWith("tone:")) return adjust(resolve(token.slice(5), palette, tokens), -0.16, 0.05)
  if (token.charAt(0) === "#") return token.toUpperCase()
  if (token === "white") return "#FFFFFF"
  if (token in palette) return palette[token]
  if (token === "outline") return tokens.outline
  if (token === "ink") return tokens.ink
  return "#FF00FF"
}
