// Seeded randomness. Everything the brain decides goes through one of these,
// so a demo or a test with the same seed plays the same way twice.

// mulberry32: small, fast, good enough for choreography.
export function create(seed) {
  let state = (Number(seed) >>> 0) || 0x9e3779b9
  function next() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range(lo, hi) { return lo + (hi - lo) * next() },
    int(lo, hi) { return Math.floor(lo + (hi - lo + 1) * next()) },
    pick(list) { return list.length ? list[Math.floor(next() * list.length)] : undefined },
    chance(p) { return next() < p },
    state() { return state }
  }
}

// Stable 32-bit hash of a string (FNV-1a), for per-pet seeds and hashed hues.
export function hash(text) {
  let h = 0x811c9dc5
  const s = String(text)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}
