import 'dotenv/config' // load .env

import { createApp } from './app.js'
import { connectDatabase } from './config/db.js'
import { assertCloudinaryConfigured } from './lib/cloudinary.js'
import { verifyMailer } from './lib/mailer.js'

// Starts the app: connect to MongoDB, then start the server.
async function start() {
  const port = process.env.PORT || 5000

  // no photo storage = don't start
  try {
    assertCloudinaryConfigured()
  } catch (err) {
    console.error('[cloudinary]', err.message)
    process.exit(1)
  }

  const app = createApp({ clientOrigin: process.env.CLIENT_ORIGIN })

  try {
    await connectDatabase(process.env.MONGODB_URI)
    console.log('[db] connected')
  } catch (err) {
    // keep the API running even if mongo is down (prototype only, would exit in production)
    console.error('[db] could not connect:', err.message)
  }

  verifyMailer()

  app.listen(port, () => {
    console.log(`[api] listening on http://localhost:${port}`)
  })
}

start()
