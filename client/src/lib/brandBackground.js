// Navy background with red/blue glow and a faint grid. Use with bg-slate-950.
// grid = cell size in px, glow = red strength (0-1)
export function navyGlow({ grid = 40, glow = 0.4 } = {}) {
  return {
    backgroundImage: [
      `radial-gradient(ellipse 55% 75% at 85% 0%, rgba(200,16,46,${glow}), transparent 60%)`,
      'radial-gradient(ellipse 45% 65% at 0% 100%, rgba(42,120,214,0.22), transparent 60%)',
      'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
      'linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
    ].join(','),
    backgroundSize: `auto, auto, ${grid}px ${grid}px, ${grid}px ${grid}px`,
  }
}
