import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'

import reportRoutes from './routes/reportRoutes.js'
import officerRoutes from './routes/officerRoutes.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

// turns CLIENT_ORIGIN into clean origins for cors (comma separated, can have
// stray spaces, quotes or trailing slashes)
function parseOrigins(raw) {
  if (!raw) return true // not set: allow any origin

  const origins = raw
    .split(',')
    .map((entry) =>
      entry
        .trim()
        .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
        .trim()
        .replace(/\/+$/, ''),
    )
    // only visible ASCII is safe in a header, so bad entries get dropped
    .filter((entry) => /^[\x21-\x7e]+$/.test(entry))

  if (origins.length === 0) {
    console.warn('[cors] CLIENT_ORIGIN has no valid origin, cross-site requests are off')
    return false
  }
  return origins.length === 1 ? origins[0] : origins
}

// Builds the express app. Separate from index.js so tests can use it
// without opening a port or a db connection.
export function createApp({ clientOrigin } = {}) {
  const app = express()

  // --- middleware ---
  // credentials: lets the browser send the officer cookie
  app.use(cors({ origin: parseOrigins(clientOrigin), credentials: true }))
  app.use(express.json()) // read JSON bodies
  app.use(cookieParser()) // read cookies
  app.use(morgan('dev')) // log each request

  // how many proxies are in front, so req.ip is the real client
  // (1 locally, 2 on Render behind Vercel, see DEPLOY.md)
  app.set('trust proxy', Number(process.env.TRUST_PROXY || 1))

  // --- health check ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'merosadak-api' })
  })

  // --- routes ---
  app.use('/api/reports', reportRoutes)
  app.use('/api/officer', officerRoutes)
  // TODO: app.use('/api/users', userRoutes)

  // --- errors (must be last) ---
  app.use(notFound)
  app.use(errorHandler)

  return app
}
