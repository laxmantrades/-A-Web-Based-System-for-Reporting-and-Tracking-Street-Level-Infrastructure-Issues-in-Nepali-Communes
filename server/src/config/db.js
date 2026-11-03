import mongoose from 'mongoose'

// Connects to MongoDB once at startup. All models share this connection.
export async function connectDatabase(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env.')
  }

  // ignore fields not in the schema when querying
  mongoose.set('strictQuery', true)

  await mongoose.connect(uri)

  // log connection events
  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error:', err.message)
  })
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected')
  })

  return mongoose.connection
}
