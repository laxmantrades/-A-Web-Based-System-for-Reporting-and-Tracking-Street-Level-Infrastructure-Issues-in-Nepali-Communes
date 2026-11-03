import { asyncHandler } from '../middleware/errorHandler.js'
import { User, STAFF_ROLES } from '../models/User.js'
import { AuthAuditLog, recordAuthEvent } from '../models/AuthAuditLog.js'
import {
  getClassifierConfig,
  updateClassifierConfig,
} from '../models/ClassifierConfig.js'
import { destroyAllSessionsFor } from '../lib/officerSession.js'
import { issueResetCode } from '../lib/resetCode.js'
import { sendStaffInviteEmail } from '../lib/mailer.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// invite codes last longer than reset codes
const INVITE_TTL_HOURS = 48

function appBaseUrl() {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.CLIENT_ORIGIN ||
    'http://localhost:5173'
  ).replace(/\/$/, '')
}

// staff account for the admin list.
// status: 'invited' (no password yet) | 'active' | 'deactivated'
function staffRow(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ward: user.ward,
    jobTitle: user.jobTitle || '',
    status: !user.isActive ? 'deactivated' : user.passwordHash ? 'active' : 'invited',
    inviteExpiresAt: user.passwordHash ? null : user.resetCodeExpiresAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  }
}

function parseWard(value) {
  if (value === undefined || value === null || value === '') return null
  const ward = Number(value)
  return Number.isInteger(ward) && ward >= 1 ? ward : NaN
}

// email a new setup code
async function sendInvite(officer, invitedBy, ip) {
  const code = await issueResetCode(officer, INVITE_TTL_HOURS * 60)
  const setupUrl = `${appBaseUrl()}/officer/setup-account?email=${encodeURIComponent(officer.email)}`

  await recordAuthEvent({
    event: 'invite_sent',
    officer: officer._id,
    emailAttempted: officer.email,
    ip,
    reason: `by ${invitedBy.email}`,
  })

  sendStaffInviteEmail({
    to: officer.email,
    name: officer.name,
    role: officer.role,
    invitedBy: invitedBy.name,
    code,
    setupUrl,
    validHours: INVITE_TTL_HOURS,
  }).catch((err) => console.error('[mail] staff invite email failed:', err.message))
}

async function findStaff(id) {
  return User.findOne({ _id: id, role: { $in: STAFF_ROLES } }).select('+passwordHash')
}

/** GET /api/officer/admin/officers */
export const listOfficers = asyncHandler(async (req, res) => {
  const officers = await User.find({ role: { $in: STAFF_ROLES } })
    .select('+passwordHash')
    .sort({ createdAt: -1 })
  res.json({ officers: officers.map(staffRow) })
})

// POST /api/officer/admin/officers { name, email, role, ward?, jobTitle? }
// creates the account without a password and emails an invite code
export const createOfficer = asyncHandler(async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const role = req.body?.role === 'admin' ? 'admin' : 'officer'
  const jobTitle = String(req.body?.jobTitle ?? '').trim().slice(0, 80)
  const ward = parseWard(req.body?.ward)

  if (!name) {
    res.status(400).json({ error: 'A name is required.' })
    return
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'A valid email is required.' })
    return
  }
  if (Number.isNaN(ward)) {
    res.status(400).json({ error: 'Ward must be a positive whole number.' })
    return
  }
  if (await User.exists({ email })) {
    res.status(409).json({ error: 'An account with that email already exists.' })
    return
  }

  const officer = await User.create({
    name,
    email,
    role,
    ward,
    jobTitle,
    passwordHash: null,
    mustChangePassword: false,
    isActive: true,
  })

  await recordAuthEvent({
    event: 'account_created',
    officer: officer._id,
    emailAttempted: officer.email,
    ip: req.ip || '',
    reason: `by ${req.officer.email} (${role})`,
  })
  await sendInvite(officer, req.officer, req.ip || '')

  res.status(201).json({ officer: staffRow(officer) })
})

/** POST /api/officer/admin/officers/:id/resend-invite */
export const resendInvite = asyncHandler(async (req, res) => {
  const officer = await findStaff(req.params.id)
  if (!officer) {
    res.status(404).json({ error: 'Staff member not found.' })
    return
  }
  if (!officer.isActive) {
    res.status(400).json({ error: 'Reactivate this account before sending an invite.' })
    return
  }
  if (officer.passwordHash) {
    res.status(400).json({
      error: 'This person has already set up their account. They can use “Forgot password” if needed.',
    })
    return
  }

  await sendInvite(officer, req.officer, req.ip || '')
  res.json({ officer: staffRow(officer) })
})

// PATCH /api/officer/admin/officers/:id { role?, ward? }
// can't change your own role or demote the last admin
export const updateOfficer = asyncHandler(async (req, res) => {
  const officer = await findStaff(req.params.id)
  if (!officer) {
    res.status(404).json({ error: 'Staff member not found.' })
    return
  }

  const ip = req.ip || ''

  if (req.body?.ward !== undefined) {
    const ward = parseWard(req.body.ward)
    if (Number.isNaN(ward)) {
      res.status(400).json({ error: 'Ward must be a positive whole number.' })
      return
    }
    officer.ward = ward
  }

  if (req.body?.role !== undefined) {
    const role = req.body.role
    if (!STAFF_ROLES.includes(role)) {
      res.status(400).json({ error: 'Role must be officer or admin.' })
      return
    }
    if (role !== officer.role) {
      if (String(officer._id) === String(req.officer._id)) {
        res.status(400).json({ error: 'You cannot change your own role.' })
        return
      }
      if (officer.role === 'admin') {
        const otherAdmins = await User.countDocuments({
          role: 'admin',
          isActive: true,
          _id: { $ne: officer._id },
        })
        if (otherAdmins === 0) {
          res.status(400).json({ error: 'There must always be at least one active admin.' })
          return
        }
      }
      await recordAuthEvent({
        event: 'role_changed',
        officer: officer._id,
        emailAttempted: officer.email,
        ip,
        reason: `${officer.role} → ${role} by ${req.officer.email}`,
      })
      officer.role = role
    }
  }

  await officer.save()
  res.json({ officer: staffRow(officer) })
})

/** PATCH /api/officer/admin/officers/:id/reactivate */
export const reactivateOfficer = asyncHandler(async (req, res) => {
  const officer = await findStaff(req.params.id)
  if (!officer) {
    res.status(404).json({ error: 'Staff member not found.' })
    return
  }

  officer.isActive = true
  officer.failedLoginCount = 0
  officer.lockUntil = null
  await officer.save()

  await recordAuthEvent({
    event: 'account_reactivated',
    officer: officer._id,
    emailAttempted: officer.email,
    ip: req.ip || '',
    reason: `by ${req.officer.email}`,
  })
  res.json({ officer: staffRow(officer) })
})

/** PATCH /api/officer/admin/officers/:id/deactivate */
export const deactivateOfficer = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.officer._id)) {
    res.status(400).json({ error: 'You cannot deactivate your own account.' })
    return
  }

  const officer = await findStaff(req.params.id)
  if (!officer) {
    res.status(404).json({ error: 'Staff member not found.' })
    return
  }

  officer.isActive = false
  await officer.save()
  await destroyAllSessionsFor(officer._id) // log them out everywhere

  await recordAuthEvent({
    event: 'account_deactivated',
    officer: officer._id,
    emailAttempted: officer.email,
    ip: req.ip || '',
    reason: `by ${req.officer.email}`,
  })
  res.json({ officer: staffRow(officer) })
})

/** GET /api/officer/admin/audit-logs?limit=100&event= */
export const listAuditLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500)
  const filter = {}
  if (req.query.event) filter.event = req.query.event

  const logs = await AuthAuditLog.find(filter)
    .sort({ at: -1 })
    .limit(limit)
    .populate('officer', 'name email role')

  res.json({
    count: logs.length,
    logs: logs.map((log) => ({
      event: log.event,
      officer: log.officer
        ? { id: log.officer.id, name: log.officer.name, email: log.officer.email }
        : null,
      emailAttempted: log.emailAttempted || null,
      ip: log.ip || null,
      reason: log.reason || null,
      at: log.at,
    })),
  })
})

/* Classifier settings */

function classifierConfigView(cfg) {
  return {
    enabled: cfg.enabled,
    activeVersion: cfg.activeVersion,
    thresholds: { high: cfg.thresholds.high, medium: cfg.thresholds.medium },
  }
}

/** GET /api/officer/admin/classifier-config */
export const getClassifierConfigHandler = asyncHandler(async (req, res) => {
  const cfg = await getClassifierConfig({ fresh: true })
  res.json({ config: classifierConfigView(cfg) })
})

// PATCH /api/officer/admin/classifier-config
// { enabled?, activeVersion?, thresholds?: { high?, medium? } }
export const updateClassifierConfigHandler = asyncHandler(async (req, res) => {
  const { enabled, activeVersion, thresholds } = req.body ?? {}

  if (thresholds && typeof thresholds === 'object') {
    const { high, medium } = thresholds
    if (high !== undefined && medium !== undefined && Number(medium) > Number(high)) {
      res.status(400).json({ error: 'The medium threshold cannot exceed the high threshold.' })
      return
    }
  }

  const cfg = await updateClassifierConfig({ enabled, activeVersion, thresholds })
  console.warn(
    `[classifier] config updated by ${req.officer.email}:`,
    JSON.stringify(classifierConfigView(cfg)),
  )
  res.json({ config: classifierConfigView(cfg) })
})
