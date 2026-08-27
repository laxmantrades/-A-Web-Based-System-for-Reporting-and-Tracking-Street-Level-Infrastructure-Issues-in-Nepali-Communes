import mongoose from 'mongoose'

const { Schema } = mongoose

/**
 * User = a person who signs in to the system.
 *
 * Two roles for now:
 *   - 'citizen': can create reports and comment on their own.
 *   - 'officer': works a ward, triages and updates reports.
 *
 * NOTE: citizens can also submit a report without an account (anonymous),
 * so `Report.reporter` is optional. This model is only for signed-in users.
 *
 * TODO (auth sprint): add passwordHash, email verification, and a
 * pre-save hook that hashes the password with bcrypt.
 */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['citizen', 'officer'],
      default: 'citizen',
    },
    // Which ward an officer is responsible for (null for citizens).
    ward: { type: Number, min: 1, default: null },
  },
  { timestamps: true }, // adds createdAt / updatedAt automatically
)

export const User = mongoose.model('User', userSchema)
