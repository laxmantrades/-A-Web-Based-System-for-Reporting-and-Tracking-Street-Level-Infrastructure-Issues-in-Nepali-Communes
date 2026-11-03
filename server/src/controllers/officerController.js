import { randomBytes } from 'node:crypto'

import { asyncHandler } from '../middleware/errorHandler.js'
import { User } from '../models/User.js'
import { recordAuthEvent } from '../models/AuthAuditLog.js'
import { hashPassword, verifyPassword, checkPasswordRules } from '../lib/password.js'
import {
  createSession,
  destroySession,
  destroyAllSessionsFor,
} from '../lib/officerSession.js'
import { sendOfficerPasswordResetCodeEmail } from '../lib/mailer.js'
import { sha256, hashResetCode, issueResetCode } from '../lib/resetCode.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 5 fails in 15 min -> locked 15 min
const LOCK_THRESHOLD = 5
const LOCK_WINDOW_MS = 15 * 60 * 1000
const LOCK_DURATION_MS = 15 * 60 * 1000

const GENERIC_LOGIN_ERROR = 'Incorrect email or password.'
const LOCKED_ERROR = 'This account is temporarily locked. Please try again later.'
const RESET_GENERIC =
  'If that email matches an active staff account, we have sent a 6-digit verification code.'
const CODE_INVALID = 'That code is incorrect or has expired. Request a new one and try again.'
const TOKEN_INVALID = 'Your reset session has expired. Please start again.'

// reset code: 6 digits, 10 min, 5 tries, max one email a minute
const CODE_TTL_MINUTES = 10
const CODE_MAX_ATTEMPTS = 5
const CODE_RESEND_COOLDOWN_MS = 60 * 1000
// token after a correct code, used to set the new password
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000


// officer for the client, without password, reset fields or cloudinary url.
// v changes on each upload so the browser doesn't show an old photo
export function officerProfile(officer) {
  return {
    id: officer.id,
    name: officer.name,
    email: officer.email,
    role: officer.role,
    ward: officer.ward,
    jobTitle: officer.jobTitle || '',
    phone: officer.phone || '',
    avatarUrl: officer.avatarPublicId
      ? `/api/officer/profile/avatar?v=${officer.avatarUpdatedAt?.getTime() ?? 0}`
      : null,
    createdAt: officer.createdAt,
    lastLoginAt: officer.lastLoginAt,
    mustChangePassword: officer.mustChangePassword,
  }
}

// count a failed login, lock when there are too many
async function registerFailedAttempt(officer, ip) {
  const now = Date.now()
  const windowStart = officer.failedLoginWindowStart?.getTime() ?? 0

  if (now - windowStart > LOCK_WINDOW_MS) {
    officer.failedLoginWindowStart = new Date(now)
    officer.failedLoginCount = 1
  } else {
    officer.failedLoginCount += 1
  }

  let locked = false
  if (officer.failedLoginCount >= LOCK_THRESHOLD) {
    officer.lockUntil = new Date(now + LOCK_DURATION_MS)
    locked = true
  }
  await officer.save()

  if (locked) {
    await recordAuthEvent({
      event: 'account_locked',
      officer: officer._id,
      emailAttempted: officer.email,
      ip,
      reason: `${officer.failedLoginCount} failed attempts`,
    })
  }
  return locked
}

// POST /api/officer/login { identifier (email), password }
export const officerLogin = asyncHandler(async (req, res) => {
  const email = String(req.body?.identifier ?? '').trim().toLowerCase()
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const ip = req.ip || ''

  const fail = async (reason, { locked = false } = {}) => {
    await recordAuthEvent({ event: 'signin_failed', emailAttempted: email, ip, reason })
    res.status(401).json({ error: locked ? LOCKED_ERROR : GENERIC_LOGIN_ERROR })
  }

  if (!EMAIL_RE.test(email) || !password) {
    await fail('missing or malformed credentials')
    return
  }

  const officer = await User.findOne({ email }).select('+passwordHash')

  // unknown email or no password -> same error
  if (!officer || !officer.passwordHash || officer.role === 'citizen') {
    await fail('no matching staff account')
    return
  }

  // locked = always refused
  if (officer.isLocked()) {
    await fail('account locked', { locked: true })
    return
  }

  if (!officer.isActive) {
    // don't say it's disabled
    await fail('account inactive')
    return
  }

  const ok = await verifyPassword(password, officer.passwordHash)
  if (!ok) {
    const nowLocked = await registerFailedAttempt(officer, ip)
    await fail('wrong password', { locked: nowLocked })
    return
  }

  // success: reset fails, save last login, start session
  officer.failedLoginCount = 0
  officer.failedLoginWindowStart = null
  officer.lockUntil = null
  officer.lastLoginAt = new Date()
  await officer.save()

  await createSession(res, officer, req)
  await recordAuthEvent({ event: 'signin_success', officer: officer._id, ip })

  res.json({
    officer: officerProfile(officer),
    redirect: officer.mustChangePassword ? '/officer/change-password' : '/officer',
  })
})

// GET /api/officer/me - is the officer logged in
export const officerMe = asyncHandler(async (req, res) => {
  res.json({ officer: officerProfile(req.officer) })
})

/** POST /api/officer/logout */
export const officerLogout = asyncHandler(async (req, res) => {
  const officerId = req.officer?._id
  await destroySession(req, res)
  if (officerId) {
    await recordAuthEvent({ event: 'signout', officer: officerId, ip: req.ip || '' })
  }
  res.json({ ok: true })
})

// POST /api/officer/change-password { currentPassword, newPassword }
// keeps this session, logs out all others
export const officerChangePassword = asyncHandler(async (req, res) => {
  const officer = req.officer
  const currentPassword = String(req.body?.currentPassword ?? '')
  const newPassword = String(req.body?.newPassword ?? '')

  const ok = await verifyPassword(currentPassword, officer.passwordHash)
  if (!ok) {
    res.status(400).json({ error: 'Your current password is incorrect.' })
    return
  }

  const ruleError = checkPasswordRules(newPassword)
  if (ruleError) {
    res.status(400).json({ error: ruleError })
    return
  }
  if (newPassword === currentPassword) {
    res.status(400).json({ error: 'Choose a password you have not used before.' })
    return
  }

  officer.passwordHash = await hashPassword(newPassword)
  officer.mustChangePassword = false
  await officer.save()

  // log out other sessions
  await destroyAllSessionsFor(officer._id)
  await createSession(res, officer, req)

  await recordAuthEvent({
    event: 'password_changed',
    officer: officer._id,
    ip: req.ip || '',
  })
  res.json({ ok: true, officer: officerProfile(officer) })
})

// POST /api/officer/forgot-password { email }
// emails a code, always same reply so you can't check which emails exist
export const officerForgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  res.json({ message: RESET_GENERIC })

  if (!EMAIL_RE.test(email)) return

  const officer = await User.findOne({ email })
  if (!officer || !officer.isActive || officer.role === 'citizen') return

  // one email per minute
  if (officer.resetCodeSentAt && Date.now() - officer.resetCodeSentAt.getTime() < CODE_RESEND_COOLDOWN_MS) {
    return
  }

  const code = await issueResetCode(officer, CODE_TTL_MINUTES)

  await recordAuthEvent({ event: 'reset_code_sent', officer: officer._id, ip: req.ip || '' })

  sendOfficerPasswordResetCodeEmail({
    to: officer.email,
    code,
    validMinutes: CODE_TTL_MINUTES,
  }).catch((err) => console.error('[mail] officer reset code email failed:', err.message))
})

// POST /api/officer/verify-reset-code { email, code }
// right code -> resetToken. 5 wrong guesses kill the code.
export const officerVerifyResetCode = asyncHandler(async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const code = String(req.body?.code ?? '').replace(/\s/g, '')
  const ip = req.ip || ''

  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    res.status(400).json({ error: CODE_INVALID })
    return
  }

  const officer = await User.findOne({ email }).select('+resetCodeHash')
  const live =
    officer &&
    officer.isActive &&
    officer.role !== 'citizen' &&
    officer.resetCodeHash &&
    officer.resetCodeExpiresAt?.getTime() > Date.now() &&
    officer.resetCodeAttempts < CODE_MAX_ATTEMPTS

  if (!live) {
    res.status(400).json({ error: CODE_INVALID })
    return
  }

  if (hashResetCode(officer.id, code) !== officer.resetCodeHash) {
    officer.resetCodeAttempts += 1
    if (officer.resetCodeAttempts >= CODE_MAX_ATTEMPTS) {
      officer.resetCodeHash = null
      officer.resetCodeExpiresAt = null
    }
    await officer.save()
    await recordAuthEvent({
      event: 'reset_code_failed',
      officer: officer._id,
      ip,
      reason: `attempt ${officer.resetCodeAttempts} of ${CODE_MAX_ATTEMPTS}`,
    })
    res.status(400).json({ error: CODE_INVALID })
    return
  }

  const resetToken = randomBytes(32).toString('base64url')
  officer.resetCodeHash = null
  officer.resetCodeExpiresAt = null
  officer.resetCodeAttempts = 0
  officer.resetTokenHash = sha256(resetToken)
  officer.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)
  await officer.save()

  res.json({ resetToken })
})

// POST /api/officer/reset-password { token, newPassword }
// sets password and logs out everywhere
export const officerResetPassword = asyncHandler(async (req, res) => {
  const token = String(req.body?.token ?? '')
  const newPassword = String(req.body?.newPassword ?? '')

  if (!token) {
    res.status(400).json({ error: TOKEN_INVALID })
    return
  }

  const officer = await User.findOne({
    resetTokenHash: sha256(token),
    resetTokenExpiresAt: { $gt: new Date() },
  }).select('+passwordHash +resetTokenHash')

  if (!officer || !officer.isActive) {
    res.status(400).json({ error: TOKEN_INVALID })
    return
  }

  const ruleError = checkPasswordRules(newPassword)
  if (ruleError) {
    res.status(400).json({ error: ruleError })
    return
  }

  officer.passwordHash = await hashPassword(newPassword)
  officer.resetTokenHash = null
  officer.resetTokenExpiresAt = null
  officer.resetCodeSentAt = null
  officer.mustChangePassword = false
  officer.failedLoginCount = 0
  officer.lockUntil = null
  await officer.save()

  await destroyAllSessionsFor(officer._id)
  await recordAuthEvent({
    event: 'password_reset',
    officer: officer._id,
    ip: req.ip || '',
  })

  res.json({ ok: true })
})
