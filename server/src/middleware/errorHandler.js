// unknown URL -> 404 JSON
export function notFound(req, res, next) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` })
}

// Handles all errors in one place (express knows it's an error handler
// because it has 4 arguments).
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

// Wraps async routes so errors go to errorHandler instead of crashing.
//   router.get('/', asyncHandler(async (req, res) => { ... }))
export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}
