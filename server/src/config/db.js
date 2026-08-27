import mongoose from 'mongoose'

/**
 * Open the shared MongoDB connection.
 *
 * Mongoose keeps a single internal connection pool, so we only call this once
 * at startup (from src/index.js). Every model then reuses that pool.
 *
 * @param {string} uri - MongoDB connection string from the environment.
 */
export async function connectDatabase(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env.')
  }

  // `strictQuery` makes Mongoose ignore fields that are not in the schema
  // when building queries — a safer default.
  mongoose.set('strictQuery', true)

  await mongoose.connect(uri)

  // Log lifecycle events so problems are visible in the terminal.
  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error:', err.message)
  })
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected')
  })

  return mongoose.connection
}
