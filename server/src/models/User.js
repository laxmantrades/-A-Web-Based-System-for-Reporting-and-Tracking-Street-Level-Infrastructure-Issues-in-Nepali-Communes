import mongoose from 'mongoose'

const { Schema } = mongoose

export const ROLES = ['citizen', 'officer', 'admin']
export const STAFF_ROLES = ['officer', 'admin']

// A user who logs in.
//   citizen - makes reports (can also be anonymous), no password
//   officer - ward staff, handles reports
//   admin   - officer who can also manage staff
// Staff accounts are made by an admin and always have a password.
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
      enum: ROLES,
      default: 'citizen',
    },

    // --- staff login ---
    // bcrypt hash, select:false hides it from normal queries
    passwordHash: { type: String, default: null, select: false },
    // must change password on first login
    mustChangePassword: { type: Boolean, default: false },
    // deactivate instead of delete
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },

    // failed logins / lockout
    failedLoginCount: { type: Number, default: 0 },
    failedLoginWindowStart: { type: Date, default: null },
    lockUntil: { type: Date, default: null },

    // forgot password step 1: 6-digit code (hashed, 10 min, 5 tries)
    resetCodeHash: { type: String, default: null, select: false },
    resetCodeExpiresAt: { type: Date, default: null },
    resetCodeAttempts: { type: Number, default: 0 },
    resetCodeSentAt: { type: Date, default: null },

    // forgot password step 2: short token to set the new password (hashed)
    resetTokenHash: { type: String, default: null, select: false },
    resetTokenExpiresAt: { type: Date, default: null },

    // officer's ward (null = whole municipality)
    ward: { type: Number, min: 1, default: null },

    // --- staff profile ---
    jobTitle: { type: String, trim: true, maxlength: 80, default: '' },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    // profile photo in cloudinary, served through the API
    avatarUrl: { type: String, default: '' },
    avatarPublicId: { type: String, default: '' },
    avatarUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true }, // createdAt / updatedAt
)

// true if account is locked right now
userSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil.getTime() > Date.now())
}

export const User = mongoose.model('User', userSchema)
