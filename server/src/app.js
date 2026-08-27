import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import reportRoutes from './routes/reportRoutes.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

/**
 * Build the Express application.
 *
 * Split from src/index.js so the app can be imported by tests without opening
 * a network port or a database connection.
 *
 * @param {object} options
 * @param {string} options.clientOrigin - allowed CORS origin (the React app).
 */
export function createApp({ clientOrigin } = {}) {
  const app = express()

  // --- Global middleware -------------------------------------------------
  app.use(cors({ origin: clientOrigin || true }))
  app.use(express.json()) // parse JSON request bodies
  app.use(morgan('dev')) // one log line per request

  // --- Health check ----------------------------------------------------
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'merosadak-api' })
  })

  // --- Feature routes -------------------------------------------------
  app.use('/api/reports', reportRoutes)
  // TODO: app.use('/api/auth', authRoutes)
  // TODO: app.use('/api/users', userRoutes)

  // --- Error handling (must be last) ---------------------------------
  app.use(notFound)
  app.use(errorHandler)

  return app
}
