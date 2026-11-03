import mongoose from 'mongoose'

const { Schema } = mongoose

export const AUTH_EVENTS = [
  'signin_success',
  'signin_failed',
  'signout',
  'password_changed',
  'password_reset',
  'reset_code_sent',
  'reset_code_failed',
  'account_locked',
  'account_created',
  'account_deactivated',
  'account_reactivated',
  'invite_sent',
  'role_changed',
]

// Log of every login event. Never saves passwords or tokens.
const authAuditLogSchema = new Schema(
  {
    event: { type: String, enum: AUTH_EVENTS, required: true },
    officer: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    emailAttempted: { type: String, default: '', lowercase: true, trim: true },
    ip: { type: String, default: '' },
    reason: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { versionKey: false },
)

authAuditLogSchema.index({ at: -1 })
authAuditLogSchema.index({ event: 1, at: -1 })

export const AuthAuditLog = mongoose.model('AuthAuditLog', authAuditLogSchema)

// Save one audit entry and print it. Errors don't break the login.
export async function recordAuthEvent(entry) {
  const line =
    `[auth] ${entry.event} ip=${entry.ip || '-'} ` +
    `${entry.officer ? `officer=${entry.officer} ` : ''}` +
    `${entry.emailAttempted ? `email=${entry.emailAttempted} ` : ''}` +
    `${entry.reason ? `reason=${entry.reason}` : ''}`
  console.warn(line.trimEnd())

  try {
    await AuthAuditLog.create(entry)
  } catch (err) {
    console.error('[auth] failed to persist audit entry:', err.message)
  }
}
