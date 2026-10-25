// Social scenes (§4.4 E): who walks where and plays what, as a timeline.
// A scene is { name, pets: [index], steps: [{ at, pet, clip | action | rest,
// offset?: { x, ms } }], duration }. Offsets are along the bar in grid units
// from each pet's own slot; every scene ends with everyone home (offset 0).
//
// Positions: pet i stands at i × spacing (grid units of a medium pet), or at
// spacing(i) when spacing is a function (pets split over several bars stand
// at their own row's slots).

export const WALK_SPEED = 22     // grid units per second
export const RUN_SPEED = 48

const apart = (spacing, a, b) => (typeof spacing === "function" ? spacing(a) - spacing(b) : (a - b) * spacing)
const walkMs = d => Math.max(250, Math.round(Math.abs(d) / WALK_SPEED * 1000))
const runMs = d => Math.max(200, Math.round(Math.abs(d) / RUN_SPEED * 1000))

// Steps that walk pet `p` by `dx` starting at `at`; returns [steps, arrival].
function walk(p, at, from, to, run) {
  const d = to - from
  if (Math.abs(d) < 0.5) return [[], at]
  const ms = run ? runMs(d) : walkMs(d)
  const clip = (run ? "run" : "walk") + (d > 0 ? "Right" : "Left")
  return [[{ at, pet: p, clip }, { at, pet: p, offset: { x: to, ms } }], at + ms]
}

function finish(name, pets, steps) {
  let end = 0
  for (const s of steps) end = Math.max(end, s.at + (s.offset ? s.offset.ms : 0))
  steps.push(...pets.map(p => ({ at: end + 50, pet: p, rest: true })))
  steps.sort((a, b) => a.at - b.at)
  return { name, pets, steps, duration: end + 100 }
}

// Meet in the middle, `gap` apart; returns { ma, mb } offsets for a (left) and b.
function meet(a, b, spacing, gap) {
  const dist = apart(spacing, b, a)
  const half = (dist - gap) / 2
  return { ma: half, mb: -half }
}

export const SCENES = {
  // two pets that finished within 4 s: high-five in the middle
  highFive(pets, spacing) {
    const [a, b] = pets[0] < pets[1] ? pets : [pets[1], pets[0]]
    const { ma, mb } = meet(a, b, spacing, 26)
    const [wa, ta] = walk(a, 0, 0, ma), [wb, tb] = walk(b, 0, 0, mb)
    const t = Math.max(ta, tb)
    const [ra] = walk(a, t + 1300, ma, 0), [rb] = walk(b, t + 1300, mb, 0)
    return finish("highFive", [a, b], [...wa, ...wb, { at: t, pet: a, clip: "highFiveLeft" }, { at: t, pet: b, clip: "highFiveRight" }, ...ra, ...rb])
  },
  // idle friends walk to a working pet, cheer with pom-poms, walk back
  cheerSquad(pets, spacing, worker) {
    const steps = []
    const out = pets.filter(p => p !== worker)
    let t = 0
    for (const p of out) {
      const side = p < worker ? -1 : 1
      const target = apart(spacing, worker, p) + side * 22
      const [w, arrive] = walk(p, 0, 0, target)
      steps.push(...w, { at: arrive, pet: p, clip: "cheer" })
      const [back] = walk(p, arrive + 2800, target, 0)
      steps.push(...back)
      t = Math.max(t, arrive)
    }
    return finish("cheerSquad", out, steps)
  },
  // tag: one taps the other and runs; the other chases; back home
  tagChase(pets, spacing) {
    const [a, b] = pets
    const dirAB = b > a ? 1 : -1
    const { ma } = meet(Math.min(a, b), Math.max(a, b), spacing, 24)
    const near = dirAB > 0 ? ma : -ma
    const [w1, t1] = walk(a, 0, 0, near)
    const tap = { at: t1, pet: a, clip: dirAB > 0 ? "tapRight" : "tapLeft" }
    const startle = { at: t1 + 300, pet: b, clip: "startled" }
    const [r1, t2] = walk(a, t1 + 600, near, -dirAB * 14, true)
    const [c1, t3] = walk(b, t1 + 900, 0, apart(spacing, a, b) - dirAB * 14 + dirAB * 20, true)
    const [h1] = walk(a, Math.max(t2, t3) + 200, -dirAB * 14, 0, true)
    const [h2] = walk(b, Math.max(t2, t3) + 400, apart(spacing, a, b) - dirAB * 14 + dirAB * 20, 0)
    return finish("tagChase", [a, b], [...w1, tap, startle, ...r1, ...c1, ...h1, ...h2])
  },
  // leapfrog: a runs up and leaps over b, b ducks, a comes back round
  leapfrog(pets, spacing) {
    const [a, b] = pets
    const d = apart(spacing, b, a)
    const s = d > 0 ? 1 : -1
    const [w1, t1] = walk(a, 0, 0, d - s * 18, true)
    const steps = [...w1, { at: t1, pet: b, clip: "duck" }, { at: t1, pet: a, clip: "leap" }, { at: t1, pet: a, offset: { x: d + s * 18, ms: 900 } }]
    const [back] = walk(a, t1 + 1000, d + s * 18, 0)
    return finish("leapfrog", [a, b], [...steps, ...back])
  },
  // catch: 48 apart, three throws
  catchBall(pets, spacing) {
    const [a, b] = pets[0] < pets[1] ? pets : [pets[1], pets[0]]
    const { ma, mb } = meet(a, b, spacing, 48)
    const [wa, ta] = walk(a, 0, 0, ma), [wb, tb] = walk(b, 0, 0, mb)
    let t = Math.max(ta, tb) + 100
    const steps = [...wa, ...wb]
    for (let i = 0; i < 3; i++) {
      const thrower = i % 2 ? b : a, catcher = i % 2 ? a : b
      steps.push({ at: t, pet: thrower, clip: i % 2 ? "throwLeft" : "throwRight" }, { at: t + 300, pet: catcher, clip: "catchBall" })
      t += 1500
    }
    const [ra] = walk(a, t, ma, 0), [rb] = walk(b, t, mb, 0)
    return finish("catchBall", [a, b], [...steps, ...ra, ...rb])
  },
  // tug-of-war: a rope between them, a few pulls, the loser tumbles
  tugOfWar(pets, spacing, rng) {
    const [a, b] = pets[0] < pets[1] ? pets : [pets[1], pets[0]]
    const { ma, mb } = meet(a, b, spacing, 40)
    const [wa, ta] = walk(a, 0, 0, ma), [wb, tb] = walk(b, 0, 0, mb)
    const t = Math.max(ta, tb) + 100
    const loser = rng && rng.next() < 0.5 ? a : b, winner = loser === a ? b : a
    const steps = [...wa, ...wb, { at: t, pet: a, clip: "tugLeft" }, { at: t, pet: b, clip: "tugRight" },
                   { at: t + 3000, pet: loser, clip: "tumble" }, { at: t + 3000, pet: winner, action: "done.short" }]
    const [ra] = walk(a, t + 4500, ma, 0), [rb] = walk(b, t + 4500, mb, 0)
    return finish("tugOfWar", [a, b], [...steps, ...ra, ...rb])
  },
  // whisper gossip: one leans in and whispers, the other gasps then giggles
  whisper(pets, spacing) {
    const [a, b] = pets[0] < pets[1] ? pets : [pets[1], pets[0]]
    const { ma, mb } = meet(a, b, spacing, 24)
    const [wa, ta] = walk(a, 0, 0, ma), [wb, tb] = walk(b, 0, 0, mb)
    const t = Math.max(ta, tb)
    const steps = [...wa, ...wb, { at: t, pet: a, clip: "whisperRight" }, { at: t, pet: b, clip: "listenLeft" }, { at: t + 2400, pet: a, clip: "giggle" }, { at: t + 2400, pet: b, clip: "giggle" }]
    const [ra] = walk(a, t + 3700, ma, 0), [rb] = walk(b, t + 3700, mb, 0)
    return finish("whisper", [a, b], [...steps, ...ra, ...rb])
  },
  // group nap pile: everyone gathers in the middle; one naps on top. Stays
  // until something wakes them (the scene holds; see the brain's napPile).
  napPile(pets, spacing) {
    const sorted = pets.slice().sort((x, y) => x - y)
    const mid = sorted[Math.floor(sorted.length / 2)]
    const steps = []
    let t = 0
    sorted.forEach((p, k) => {
      const target = apart(spacing, mid, p) + (k - Math.floor(sorted.length / 2)) * 20
      const [w, arrive] = walk(p, 0, 0, target)
      steps.push(...w)
      t = Math.max(t, arrive)
    })
    sorted.forEach((p, k) => {
      const clip = k === sorted.length - 1 && sorted.length > 2 ? "napOnTop" : (p <= mid ? "napLeanRight" : "napLeanLeft")
      steps.push({ at: t + 100, pet: p, clip })
    })
    steps.sort((x, y) => x.at - y.at)
    return { name: "napPile", pets: sorted, steps, duration: Infinity, hold: true,
             home: sorted.map((p, k) => ({ pet: p, x: apart(spacing, mid, p) + (k - Math.floor(sorted.length / 2)) * 20 })) }
  },
  // waking from the pile: everyone walks home; the one on top is carried
  carryHome(pets, spacing, rng, from) {
    const home = from || []
    const top = home.length > 2 ? home[home.length - 1] : null
    const carrier = top ? home[home.length - 2] : null
    const steps = []
    for (const h of home) {
      if (h === top || h === carrier) continue
      steps.push({ at: 0, pet: h.pet, action: "wake" })
      const [w] = walk(h.pet, 900, h.x, 0)
      steps.push(...w)
    }
    if (top) {
      const ms = walkMs(Math.max(Math.abs(carrier.x), 8))
      steps.push({ at: 0, pet: carrier.pet, action: "wake" }, { at: 0, pet: top.pet, clip: "carried" },
                 { at: 0, pet: top.pet, offset: { x: carrier.x, ms: 300 } },
                 { at: 900, pet: carrier.pet, clip: "carry" },
                 { at: 1000, pet: carrier.pet, offset: { x: 0, ms } }, { at: 1000, pet: top.pet, offset: { x: 0, ms } },
                 { at: 1000 + ms, pet: top.pet, action: "wake" })
    }
    return finish("carryHome", home.map(h => h.pet), steps)
  },
  // after a big celebration, idle friends conga behind the star
  conga(pets, spacing, rng, star) {
    const line = pets.filter(p => p !== star)
    const steps = []
    const all = [star, ...line]
    let t = 0
    line.forEach((p, k) => {
      const target = apart(spacing, star, p) - (k + 1) * 22
      const [w, arrive] = walk(p, 0, 0, target)
      steps.push(...w)
      t = Math.max(t, arrive)
    })
    for (const p of all) steps.push({ at: t, pet: p, clip: "conga" })
    const swing = 10
    all.forEach((p, k) => {
      const base = k === 0 ? 0 : apart(spacing, star, p) - k * 22
      steps.push({ at: t, pet: p, offset: { x: base + swing, ms: 1500 } }, { at: t + 1500, pet: p, offset: { x: base - swing, ms: 2000 } }, { at: t + 3500, pet: p, offset: { x: base, ms: 1000 } })
    })
    line.forEach((p, k) => {
      const [w] = walk(p, t + 4600, apart(spacing, star, p) - (k + 1) * 22, 0)
      steps.push(...w)
    })
    steps.push({ at: t + 4600, pet: star, rest: true })
    return finish("conga", all, steps)
  },
  // one session ends as another starts: the baton changes hands
  batonHandoff(pets, spacing) {
    const [from, to] = pets
    const s = to > from ? 1 : -1
    const target = apart(spacing, to, from) - s * 24
    const [w, t] = walk(from, 0, 0, target)
    const steps = [...w, { at: t, pet: from, clip: "batonGive" }, { at: t, pet: to, clip: "batonTake" }]
    const [back] = walk(from, t + 1500, target, 0)
    return finish("batonHandoff", [from, to], [...steps, ...back])
  },
  // pets of the same provider dance in sync
  syncDance(pets) {
    return finish("syncDance", pets, pets.map(p => ({ at: 0, pet: p, clip: "dance" })))
  },
  // Jinx: tiptoes over, taps, raspberry, scarpers
  prank(pets, spacing) {
    const [a, b] = pets
    const d = apart(spacing, b, a)
    const s = d > 0 ? 1 : -1
    const near = d - s * 22
    const ms = Math.max(600, Math.round(Math.abs(near) / 12 * 1000))
    const steps = [{ at: 0, pet: a, clip: s > 0 ? "sneakRight" : "sneakLeft" }, { at: 0, pet: a, offset: { x: near, ms } },
                   { at: ms, pet: a, clip: s > 0 ? "tapRight" : "tapLeft" }, { at: ms + 250, pet: b, clip: "startled", ifIdle: true },
                   { at: ms + 700, pet: a, clip: "raspberry" }]
    const [back] = walk(a, ms + 2100, near, 0, true)
    return finish("prank", [a, b], [...steps, ...back])
  },
  // Ember: walks over after a friend's celebration and sweeps up
  tidyAfter(pets, spacing, rng, friend) {
    const [a] = pets
    const s = friend > a ? 1 : -1
    const target = apart(spacing, friend, a) - s * 20
    const [w, t] = walk(a, 0, 0, target)
    const [back] = walk(a, t + 3400, target, 0)
    return finish("tidyAfter", [a], [...w, { at: t, pet: a, clip: "tidyUp" }, ...back])
  }
}

// Point at a pet that needs you: every listed pet turns toward it.
export function pointSteps(pets, needy) {
  return pets.filter(p => p !== needy).map(p => ({ at: 0, pet: p, clip: p < needy ? "pointRight" : "pointLeft" }))
}
