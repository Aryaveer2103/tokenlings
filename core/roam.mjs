// Roaming (§4.4 F): plans for one pet's trip along the bar or across the
// desktop, as scenes the brain runs (the format of core/social.mjs). Pure:
// the geometry comes in as numbers, so the same seed and the same desktop give
// the same trip, and the tests run without a screen.
//
// Offsets are grid units from the pet's slot (x right, y down); positions in
// the inputs are logical pixels. Every trip ends with the pet home (0, 0).

export const STROLL_SPEED = 34        // grid units per second
export const ZOOM_SPEED = 150
export const CLIMB_SPEED = 120
export const BAR_TRIP_MS = 10000      // budget: bar-roam bursts ≤ 10 s
export const DESKTOP_TRIP_MS = 20000  // budget: desktop excursions ≤ 20 s
const HOP_MS = 520
const LEAP_MS = 900                   // leapRight/Left: airborne from 180 to 720 ms

// A trip under construction: steps on one timeline for one pet.
function trip(pet, unit, home) {
  const steps = []
  let t = 0, x = 0, y = 0, lo = 0, hi = 0, top = 0, bottom = 0
  const g = px => (px - home) / unit
  return {
    steps,
    get t() { return t },
    get x() { return x },
    get y() { return y },
    g,
    clip(name, at) { steps.push({ at: at === undefined ? t : at, pet, clip: name }) },
    wait(ms) { t += Math.max(0, Math.round(ms)) },
    // to grid offset (gx, gy) over ms
    move(gx, ms, o) {
      ms = Math.max(1, Math.round(ms))
      const off = { x: gx, ms, ease: (o && o.ease) || "linear" }
      if (o && o.y !== undefined) off.y = o.y
      if (o && o.arc) off.arc = o.arc
      steps.push({ at: t, pet, offset: off })
      t += ms
      x = gx
      if (o && o.y !== undefined) y = o.y
      lo = Math.min(lo, x); hi = Math.max(hi, x)
      top = Math.min(top, y - ((o && o.arc) || 0)); bottom = Math.max(bottom, y)
    },
    finish(name, extra) {
      steps.push({ at: t + 50, pet, rest: true })
      steps.sort((a, b) => a.at - b.at)
      return Object.assign({ name, pets: [pet], steps, duration: t + 100, extent: { lo, hi, top, bottom } }, extra || {})
    }
  }
}

const msFor = (dg, speed) => Math.abs(dg) / speed * 1000

// Walk from where the trip is to grid x `to` along the floor, hopping onto
// and off pills on the way (bar trips only). pillLift ≤ 0 lifts the pet onto
// a pill's top (bottom bars); 0 hops it across in front (top bars).
function walkAlong(tp, to, bar, speed) {
  const from = tp.x
  const dir = Math.sign(to - from)
  if (!dir) return
  const walkClip = dir > 0 ? "walkRight" : "walkLeft"
  const hopClip = dir > 0 ? "hopRight" : "hopLeft"
  const half = (bar.hopPx || 10) / bar.unit
  const arc = Math.max(1.5, Math.min(6, bar.arcRoom === undefined ? 6 : bar.arcRoom))
  // pill edges crossed, in walking order: entering lifts, leaving lowers
  const edges = []
  for (const [a, b] of bar.obstacles || []) {
    const ga = tp.g(a), gb = tp.g(b)
    for (const [e, enter] of [[ga, dir > 0], [gb, dir < 0]]) if ((e - from) * dir > half && (to - e) * dir > half) edges.push({ e, enter })
  }
  edges.sort((p, q) => (p.e - q.e) * dir)
  tp.clip(walkClip)
  let i = 0
  while (i < edges.length) {
    // edges closer than a hop merge: one hop across both, staying at the same height
    let j = i
    while (j + 1 < edges.length && (edges[j + 1].e - edges[j].e) * dir < 2 * half) j++
    const start = edges[i].e - dir * half, end = edges[j].e + dir * half
    if ((start - tp.x) * dir > 0.5) tp.move(start, msFor(start - tp.x, speed))
    const lifted = (j - i) % 2 === 0 ? (edges[j].enter ? (bar.pillLift || 0) : 0) : tp.y
    tp.clip(hopClip)
    tp.move(end, HOP_MS, { y: lifted, arc })
    tp.clip(walkClip)
    i = j + 1
  }
  if ((to - tp.x) * dir > 0.05) tp.move(to, msFor(to - tp.x, speed))
}

// The floor's usable span around home, as grid offsets.
function span(bar) {
  const reach = bar.reach || 260
  return { lo: Math.max(bar.lo, bar.home - reach), hi: Math.min(bar.hi, bar.home + reach) }
}
const inPill = (px, bar) => (bar.obstacles || []).some(([a, b]) => px > a - 4 && px < b + 4)

// bar: { pet, unit, home, lo, hi, obstacles, pillLift, arcRoom, reach, hopPx }
// kind: stroll | perch | zoomies. Returns a scene, or null when there is no room.
export function planBarRoam(kind, bar, rng) {
  if (!bar || !(bar.unit > 0) || !(bar.hi > bar.lo)) return null
  const s = span(bar)
  const tp = trip(bar.pet, bar.unit, bar.home)
  const minAway = 50
  // as far as a walk there and back fits the budget (pauses and hops included)
  const pause = kind === "perch" ? 3800 : 1600
  const maxAway = (BAR_TRIP_MS - 300 - pause - 1400) / 2000 * STROLL_SPEED * bar.unit
  const pickTarget = (avoidPills) => {
    for (let k = 0; k < 12; k++) {
      const side = rng.next() < 0.5 ? -1 : 1
      const room = Math.min(maxAway, side < 0 ? bar.home - s.lo : s.hi - bar.home)
      if (room < minAway) continue
      const px = bar.home + side * (minAway + rng.next() * (room - minAway))
      if (avoidPills && inPill(px, bar)) continue
      return px
    }
    return null
  }

  if (kind === "zoomies") {
    const sideA = (bar.home - s.lo) > (s.hi - bar.home) ? -1 : 1
    const a = sideA < 0 ? s.lo : s.hi
    const b = sideA < 0 ? Math.min(s.hi, bar.home + (bar.home - s.lo) * 0.5) : Math.max(s.lo, bar.home - (s.hi - bar.home) * 0.5)
    if (Math.abs(a - bar.home) < 80) return null
    const run = (px) => {
      const to = tp.g(px), d = to - tp.x
      tp.clip(d > 0 ? "zoomRight" : "zoomLeft")
      tp.move(to, msFor(d, ZOOM_SPEED))
      tp.clip(d > 0 ? "skidRight" : "skidLeft")
      tp.wait(460)
    }
    tp.clip("perk")
    tp.wait(380)
    run(a)
    if (Math.abs(b - bar.home) > 30) run(b)
    const back = tp.x
    tp.clip(back > 0 ? "zoomLeft" : "zoomRight")
    tp.move(0, msFor(back, ZOOM_SPEED))
    tp.clip("pant")
    tp.wait(1500)
    if (tp.t > BAR_TRIP_MS) return null
    return tp.finish("roam.zoomies")
  }

  const target = pickTarget(kind === "perch")
  if (target === null) return null
  const to = tp.g(target)
  // a beat in place first: the stage widens for the trip while it stands still
  tp.clip("perk")
  tp.wait(300)
  walkAlong(tp, to, bar, STROLL_SPEED)
  if (kind === "perch") {
    tp.clip("perchSit")
    tp.wait(3800)
  } else {
    tp.clip("lookAround")
    tp.wait(1600)
  }
  walkAlong(tp, 0, bar, STROLL_SPEED)
  // over budget: a shorter walk next time (the brain tries again later)
  if (tp.t > BAR_TRIP_MS) return null
  return tp.finish(kind === "perch" ? "roam.perch" : "roam.stroll")
}

// ex: { pet, unit, home: { x, y } (the pet's feet at its slot), area: { x, y, w, h },
//       edge: top | bottom, windows: [{ id, x, y, w, h, focused }], sizePx }
// All in logical pixels on one monitor. Returns a scene with the window it
// stands on (`window`), or null when no window has a usable top edge.
export function planExcursion(ex, rng) {
  if (!ex || !(ex.unit > 0) || (ex.edge !== "top" && ex.edge !== "bottom")) return null
  const size = ex.sizePx || 28
  const a = ex.area
  // a window whose top edge is in reach: near the pet along the bar, not too far up or down
  const near = w => Math.max(0, w.x + size - ex.home.x, ex.home.x - (w.x + w.w - size)) < 220
  const usable = (ex.windows || []).filter(w => w.w >= 4 * size && w.y > a.y + size * 0.5 && w.y < a.y + a.h - size * 2 && near(w) &&
    (ex.edge === "top" ? w.y - ex.home.y < 420 : ex.home.y - w.y < 380))
  if (!usable.length) return null
  // the focused window first (that is where you are looking), else a wide one
  let total = 0
  const weight = w => (w.focused ? 3 : 1) * Math.sqrt(w.w)
  for (const w of usable) total += weight(w)
  let r = rng.next() * total, win = usable[0]
  for (const w of usable) { r -= weight(w); if (r <= 0) { win = w; break } }

  const gy = py => (py - ex.home.y) / ex.unit
  const topY = gy(win.y)
  const left = win.x + size, right = win.x + win.w - size
  const clampX = px => Math.max(left, Math.min(right, px))
  const sideX = Math.abs(win.x - ex.home.x) < Math.abs(win.x + win.w - ex.home.x) ? win.x + size * 0.5 : win.x + win.w - size * 0.5
  const landX = clampX(ex.edge === "top" ? ex.home.x : sideX)
  // a spot to sit a little way in from where it lands, toward the middle
  const inward = landX < win.x + win.w / 2 ? 1 : -1
  const spot = clampX(landX + inward * (30 + 80 * rng.next()))
  const watchMs = 3500 + rng.next() * 2500

  const build = (watch) => {
    const tp = trip(ex.pet, ex.unit, ex.home.x)
    const walkTo = (gx, y) => {
      const d = gx - tp.x
      if (Math.abs(d) < 0.5) return
      tp.clip(d > 0 ? "walkRight" : "walkLeft")
      tp.move(gx, msFor(d, STROLL_SPEED * 1.4), { y })
    }
    const leapTo = (gx, y, arc) => {
      tp.clip(gx >= tp.x ? "leapRight" : "leapLeft")
      tp.wait(180)
      tp.move(gx, 540, { y, arc, ease: "linear" })
      tp.wait(LEAP_MS - 720)
    }
    tp.clip("lookAround")
    tp.wait(900)
    if (ex.edge === "top") {
      // walk along the bar until the window is below, then leap down onto it
      const takeoff = landX + (landX > ex.home.x ? -size : landX < ex.home.x ? size : 0)
      walkTo(tp.g(takeoff), 0)
      leapTo(tp.g(landX), topY, 4)
    } else {
      // bottom bar: walk to the window's nearer side and climb its border
      walkTo(tp.g(sideX), 0)
      tp.clip("climb")
      tp.move(tp.x, msFor(topY, CLIMB_SPEED), { y: topY })
      leapTo(tp.g(landX), topY, 3)
    }
    // along the top edge to a spot to sit, then watch you for a while
    walkTo(tp.g(spot), topY)
    tp.clip("sitDown")
    tp.wait(460)
    tp.clip("watch")
    tp.wait(watch)
    tp.clip("standUp")
    tp.wait(420)
    // back to the bar
    if (ex.edge === "top") {
      const exit = clampX(ex.home.x)
      walkTo(tp.g(exit), topY)
      leapTo(tp.g(exit + (ex.home.x > exit ? size : ex.home.x < exit ? -size : 0)), 0, 4)
    } else {
      tp.clip("parachute")
      tp.move(tp.x, Math.max(1500, msFor(-topY, 90)), { y: 0, ease: "out" })
      tp.clip("landSoft")
      tp.wait(520)
    }
    walkTo(0, 0)
    return tp
  }
  let tp = build(watchMs)
  // a long way round: a shorter watch, or no trip at all
  if (tp.t > DESKTOP_TRIP_MS) {
    const watch = watchMs - (tp.t - DESKTOP_TRIP_MS)
    if (watch < 1500) return null
    tp = build(watch)
  }
  return tp.finish("roam.explore", { window: win.id })
}

// The window under a pet moved or closed: it floats down under a parachute,
// climbs back to the bar's level and walks home. from: the pet's offset now.
// ex as for planExcursion (area, edge, unit, home); returns a scene.
export function planParachute(ex, from) {
  const tp = trip(ex.pet, ex.unit, ex.home.x)
  const unit = ex.unit
  // start where the pet is: a zero-length move pins the trip's position
  tp.move(from.x, 1, { y: from.y })
  const gy = py => (py - ex.home.y) / unit
  const floorY = gy(ex.area.y + ex.area.h - (ex.sizePx || 28))
  if (ex.edge === "top") {
    const down = Math.min(floorY, from.y + 60 / unit)
    tp.clip("parachute")
    tp.move(from.x, 2200, { y: down, ease: "out" })
    tp.clip("landSoft")
    tp.wait(520)
    tp.clip("climb")
    tp.move(from.x, msFor(down, CLIMB_SPEED), { y: 0 })
    tp.clip(from.x > 0 ? "hopLeft" : "hopRight")
    tp.wait(HOP_MS)
  } else {
    tp.clip("parachute")
    tp.move(from.x, Math.min(6000, Math.max(1500, msFor(-from.y, 90))), { y: 0, ease: "out" })
    tp.clip("landSoft")
    tp.wait(520)
  }
  const d = -tp.x
  if (Math.abs(d) > 0.5) {
    tp.clip(d > 0 ? "walkRight" : "walkLeft")
    tp.move(0, msFor(d, STROLL_SPEED * 1.4), { y: 0 })
  }
  return tp.finish("roam.parachute")
}

// After a fling: a moment where it landed (dizzy after a hard throw), then
// a walk back to the slot. from: the grid x it settled at.
export function planWalkHome(pet, from, delay) {
  const steps = [], t0 = Math.max(0, Math.round(delay || 0))
  if (Math.abs(from) < 0.5) return null
  const ms = Math.round(msFor(from, STROLL_SPEED * 1.4))
  steps.push({ at: t0, pet, clip: from > 0 ? "walkLeft" : "walkRight" }, { at: t0, pet, offset: { x: 0, y: 0, ms, ease: "linear" } }, { at: t0 + ms + 50, pet, rest: true })
  return { name: "walkHome", pets: [pet], steps, duration: t0 + ms + 100 }
}

// Going home from wherever a trip was cut short: a run along the floor (or a
// slide through the air from a window), at a speed that never takes long.
export function homeRun(pet, from) {
  const d = Math.hypot(from.x, from.y)
  if (d < 1) return null
  return { pet, offset: { x: 0, y: 0, ms: Math.max(300, Math.min(1500, d / 160 * 1000)), ease: "smooth" } }
}
