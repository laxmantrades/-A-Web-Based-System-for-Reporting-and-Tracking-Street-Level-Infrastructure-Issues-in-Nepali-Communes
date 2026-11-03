// Simple in-memory rate limiter by IP. Each limiter has its own counters.
// Too many requests -> 429 with Retry-After.
// (only works for one server, would need Redis for more)
export function createRateLimiter({ windowMs, max, message }) {
  const buckets = new Map()

  // remove old buckets so memory doesn't grow; unref so it doesn't keep node running
  const sweep = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(key)
    }
  }, 60_000)
  sweep.unref()

  return function rateLimit(req, res, next) {
    const now = Date.now()
    const key = req.ip || req.socket?.remoteAddress || 'unknown'

    let entry = buckets.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      buckets.set(key, entry)
    }
    entry.count += 1

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      res.status(429).json({ error: message })
      return
    }
    next()
  }
}
