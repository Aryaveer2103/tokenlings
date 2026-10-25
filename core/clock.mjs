// Timing shared by the engine and the shell's clock: the power modes' frame
// caps and the easing curves clips use. (The clock itself is a single-shot
// Timer in Service.qml, re-armed for whenever the engine's next visible
// change is due, and never armed at all when nothing is.)

export const POWER_FPS = { showoff: 30, balanced: 24, battery: 12, still: 0 }

export function frameInterval(fps) {
  const f = Math.max(1, Math.min(60, Math.round(Number(fps) || 0)))
  return Math.round(1000 / f)
}

export const EASE = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => t * (2 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outBack: t => { const c = 1.70158; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u },
  outBounce: t => {
    const n = 7.5625, d = 2.75
    if (t < 1 / d) return n * t * t
    if (t < 2 / d) { t -= 1.5 / d; return n * t * t + 0.75 }
    if (t < 2.5 / d) { t -= 2.25 / d; return n * t * t + 0.9375 }
    t -= 2.625 / d; return n * t * t + 0.984375
  }
}
