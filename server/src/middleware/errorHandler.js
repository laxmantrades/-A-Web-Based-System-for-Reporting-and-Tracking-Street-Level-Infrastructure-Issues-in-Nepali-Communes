/**
 * Fallback for URLs that match no route -> 404 JSON instead of HTML.
 */
export function notFound(req, res, next) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` })
}

/**
 * Central error handler. Express recognises it as an error handler because it
 * takes four arguments. Any `next(err)` or throw inside an async route wrapped
 * with `asyncHandler` ends up here, so we format errors in one place.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500

  if (status >= 500) {
    console.error('[error]', err)
  }

  res.status(status).json({
    error: err.message || 'Internal Server Error',
  })
}

/**
 * Wrap an async route handler so rejected promises are forwarded to
 * errorHandler instead of crashing the process.
 *
 *   router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}
