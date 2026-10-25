import { test } from "node:test"
import assert from "node:assert/strict"
import { compose, LIBRARY } from "../core/compose.mjs"
import { FORMS, formFor } from "../forms/forms.mjs"
import * as Palette from "../core/palette.mjs"

const THEME = { foreground: "#D4D9E1", background: "#101315", accent: "#7AA2F7", mode: "dark" }
const PATH_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9 .,eE+-]+$/

function everyLayer(c) { return Object.values(c.groups).flat() }

function assertDrawable(c, label) {
  for (const l of everyLayer(c)) {
    assert.match(l.d, PATH_RE, `${label}: path has stray characters`)
    assert.ok(!/NaN|undefined|Infinity/.test(l.d), `${label}: bad number in ${l.d}`)
    assert.ok(/^(#[0-9A-Fa-f]{6}|transparent)$/.test(l.fill), `${label}: fill ${l.fill}`)
    assert.ok(/^(#[0-9A-Fa-f]{6}|transparent)$/.test(l.stroke), `${label}: stroke ${l.stroke}`)
    assert.notEqual(l.fill, "#FF00FF", `${label}: unresolved colour token`)
  }
}

test("the library meets the minimum part counts", () => {
  assert.ok(Object.keys(LIBRARY.bodies).length >= 8)
  assert.ok(Object.keys(LIBRARY.eyes).length >= 8)
  assert.ok(Object.keys(LIBRARY.mouths).length >= 6)
  assert.ok(Object.keys(LIBRARY.toppers).filter(k => k !== "none").length >= 10)
  assert.ok(Object.keys(LIBRARY.accessories).length >= 16)
  assert.ok(Object.keys(LIBRARY.patterns).filter(k => k !== "none").length >= 5)
  assert.ok(Object.values(LIBRARY.accessories).some(a => a.unlockLevel > 0), "some accessories are unlockable")
})

test("every part composes on every body without bad paths or colours", () => {
  const base = { eyes: "dot", mouth: "smile", topper: "none", accessories: [], pattern: "none", palette: { body: "#DE7A5A" } }
  for (const body of Object.keys(LIBRARY.bodies)) {
    for (const eyes of Object.keys(LIBRARY.eyes)) assertDrawable(compose({ ...base, body, eyes }, THEME), `${body}/${eyes}`)
    for (const mouth of Object.keys(LIBRARY.mouths)) assertDrawable(compose({ ...base, body, mouth }, THEME), `${body}/${mouth}`)
    for (const topper of Object.keys(LIBRARY.toppers)) assertDrawable(compose({ ...base, body, topper }, THEME), `${body}/${topper}`)
    for (const acc of Object.keys(LIBRARY.accessories)) assertDrawable(compose({ ...base, body, accessories: [acc] }, THEME), `${body}/${acc}`)
    for (const pattern of Object.keys(LIBRARY.patterns)) assertDrawable(compose({ ...base, body, pattern }, THEME), `${body}/${pattern}`)
  }
})

test("parts stay on the 32×32 canvas (baked groups are clipped to it)", () => {
  const nums = d => (d.match(/-?\d+(\.\d+)?/g) || []).map(Number)
  for (const body of Object.keys(LIBRARY.bodies)) {
    const all = { body, eyes: "anime", mouth: "grin", topper: "earsBunny", accessories: Object.keys(LIBRARY.accessories), pattern: "spots", palette: {} }
    for (const l of everyLayer(compose(all, THEME))) {
      // Relative arc segments carry radii, not positions; only check absolute paths.
      if (/[a-z]/.test(l.d.replace(/e/g, ""))) continue
      for (const n of nums(l.d)) assert.ok(n >= 0 && n <= 32, `${body}: ${n} off canvas in ${l.d.slice(0, 40)}`)
    }
  }
})

test("every base form composes and every provider maps to a form", () => {
  for (const [name, form] of Object.entries(FORMS)) {
    const c = compose(form.look, THEME, name)
    assertDrawable(c, name)
    for (const k of ["energy", "sociability", "mischief", "sleepiness"]) assert.ok(form.personality[k] >= 0 && form.personality[k] <= 1)
  }
  assert.equal(formFor("claude"), "ember")
  assert.equal(formFor("codex"), "slate")
  assert.equal(formFor("Gemini"), "prism")
  assert.equal(formFor("something-new"), "bit")
})

test("Bit's colour is hashed from the provider and stable", () => {
  const a = compose(FORMS.bit.look, THEME, "acme").palette.body
  assert.equal(a, compose(FORMS.bit.look, THEME, "acme").palette.body)
  assert.notEqual(a, compose(FORMS.bit.look, THEME, "zeta").palette.body)
})

test("theme following and theme tokens", () => {
  const c = compose({ body: "dumpling", followTheme: true, palette: { body: "#000000" } }, THEME)
  assert.equal(c.palette.body, "#7AA2F7")
  const light = Palette.themeTokens({ foreground: "#222222", background: "#FFFFFF", mode: "light" })
  assert.equal(light.outline, "#222222")
  const dark = Palette.themeTokens({ foreground: "#D4D9E1", background: "#101315", mode: "dark" })
  assert.notEqual(dark.outline, "#D4D9E1")
})

test("palette completion derives missing colours and readable eyes", () => {
  const p = Palette.complete({ body: "#1C1C1F" })
  assert.equal(p.gear, "#C9CED6", "glasses frames turn light on a dark body")
  for (const k of ["shade", "light", "accent", "cheek", "eye", "gear"]) assert.ok(Palette.isHex(p[k]), k)
  assert.ok(Palette.luminance(p.eye) > 0.5, "eyes on a black body are light")
})
