// Path builders for part art. Everything is authored on a 32×32 grid (feet on
// y ≈ 30.6, centre line x = 16) and returned as SVG path strings.

const f = n => Number(n.toFixed(2))

export function circle(cx, cy, r) {
  return `M${f(cx - r)} ${f(cy)} a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z`
}

export function ellipse(cx, cy, rx, ry) {
  return `M${f(cx - rx)} ${f(cy)} a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0 a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0 Z`
}

export function rrect(x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2)
  return `M${f(x + k)} ${f(y)} L${f(x + w - k)} ${f(y)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + k)} ` +
    `L${f(x + w)} ${f(y + h - k)} Q${f(x + w)} ${f(y + h)} ${f(x + w - k)} ${f(y + h)} ` +
    `L${f(x + k)} ${f(y + h)} Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - k)} ` +
    `L${f(x)} ${f(y + k)} Q${f(x)} ${f(y)} ${f(x + k)} ${f(y)} Z`
}

export function line(x1, y1, x2, y2) {
  return `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}`
}

export function quad(x1, y1, cx, cy, x2, y2) {
  return `M${f(x1)} ${f(y1)} Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}`
}

export function star(cx, cy, R, r) {
  let d = ""
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R
    d += (i ? "L" : "M") + f(cx + rad * Math.cos(a)) + " " + f(cy + rad * Math.sin(a)) + " "
  }
  return d + "Z"
}

export function sparkle(cx, cy, s) {
  return `M${f(cx)} ${f(cy - s)} Q${f(cx)} ${f(cy)} ${f(cx + s)} ${f(cy)} Q${f(cx)} ${f(cy)} ${f(cx)} ${f(cy + s)} ` +
    `Q${f(cx)} ${f(cy)} ${f(cx - s)} ${f(cy)} Q${f(cx)} ${f(cy)} ${f(cx)} ${f(cy - s)} Z`
}

export function heart(cx, cy, s) {
  return `M${f(cx)} ${f(cy + 1.1 * s)} C${f(cx - 1.9 * s)} ${f(cy - 0.2 * s)} ${f(cx - 1.3 * s)} ${f(cy - 1.8 * s)} ${f(cx)} ${f(cy - s)} ` +
    `C${f(cx + 1.3 * s)} ${f(cy - 1.8 * s)} ${f(cx + 1.9 * s)} ${f(cy - 0.2 * s)} ${f(cx)} ${f(cy + 1.1 * s)} Z`
}

export function poly(points) {
  return points.map((p, i) => (i ? "L" : "M") + f(p[0]) + " " + f(p[1])).join(" ") + " Z"
}

// A soft arc stroke from angle a0 to a1 (degrees, 0 = right, 90 = down) on an
// ellipse: rim lights and gloss streaks.
export function arc(cx, cy, rx, ry, a0, a1) {
  const p = a => [cx + rx * Math.cos(a * Math.PI / 180), cy + ry * Math.sin(a * Math.PI / 180)]
  const [x0, y0] = p(a0), [x1, y1] = p(a1)
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 > a0 ? 1 : 0
  return `M${f(x0)} ${f(y0)} A${f(rx)} ${f(ry)} 0 ${large} ${sweep} ${f(x1)} ${f(y1)}`
}

// Deterministic speckle inside an ellipse: grain baked into the art, so it
// costs nothing at runtime. Returns [x, y, r] triples.
export function speckle(seed, cx, cy, rx, ry, count) {
  let s = (seed >>> 0) || 1
  const rnd = () => { s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return s / 4294967296 }
  const out = []
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd())
    out.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 0.16 + rnd() * 0.16])
  }
  return out
}

// A layer is one filled and/or stroked path. Colours are palette tokens
// (body, shade, light, accent, cheek, ink, outline, white, eye) or literal
// "#rrggbb" values. gradient: [fromToken, toToken] fills top → bottom, or
// { radial: [cx, cy, r], stops: [[pos, token], ...] } (up to three stops) for
// baked shading: a lit spot that falls off into the shade.
export function fill(d, color, extra) {
  return Object.assign({ d, fill: color }, extra || {})
}
export function stroke(d, color, width, extra) {
  return Object.assign({ d, fill: "none", stroke: color, width: width || 1, cap: "round" }, extra || {})
}
export function outlined(d, color, extra) {
  return Object.assign({ d, fill: color, stroke: "outline", width: 0.75 }, extra || {})
}
// A glossy fill: lit from the top left, darker toward the bottom right.
export function glossy(d, color, cx, cy, r, extra) {
  return Object.assign({ d, fill: color, stroke: "outline", width: 0.75,
    gradient: { radial: [cx, cy, r], stops: [[0, "tint:" + color], [0.5, color], [1, "tone:" + color]] } }, extra || {})
}
// A small white shine on something glossy.
export function shine(cx, cy, rx, ry, extra) {
  return Object.assign({ d: ellipse(cx, cy, rx, ry), fill: "#FFFFFF", opacity: 0.8 }, extra || {})
}
