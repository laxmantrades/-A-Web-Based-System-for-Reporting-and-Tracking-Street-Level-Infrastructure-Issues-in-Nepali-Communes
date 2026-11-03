import mongoose from 'mongoose'

const { Schema } = mongoose

// Officer login session. Browser keeps a random token in a cookie,
// we only save its SHA-256 hash (so a db leak can't log anyone in).
//   expiresAt         - now + 8h, pushed forward on each request
//   absoluteExpiresAt - 24h after login, never pushed
// Valid only while both are in the future.
const sessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    officer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    lastSeenAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    absoluteExpiresAt: { type: Date, required: true },
  },
  { timestamps: true },
)

// mongo deletes it after absoluteExpiresAt (always the later one)
sessionSchema.index({ absoluteExpiresAt: 1 }, { expireAfterSeconds: 0 })

export const Session = mongoose.model('Session', sessionSchema)
