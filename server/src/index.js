import 'dotenv/config' // loads variables from .env into process.env

import { createApp } from './app.js'
import { connectDatabase } from './config/db.js'

/**
 * Process entry point: connect to MongoDB, then start the HTTP server.
 */
async function start() {
  const port = process.env.PORT || 5000
  const app = createApp({ clientOrigin: process.env.CLIENT_ORIGIN })

  try {
    await connectDatabase(process.env.MONGODB_URI)
    console.log('[db] connected')
  } catch (err) {
    // For this prototype we keep the API up even if Mongo is unreachable, so
    // the frontend team can work against the health check and see clear 500s
    // on data routes. In production you would exit here instead.
    console.error('[db] could not connect:', err.message)
  }

  app.listen(port, () => {
    console.log(`[api] listening on http://localhost:${port}`)
  })
}

start()
