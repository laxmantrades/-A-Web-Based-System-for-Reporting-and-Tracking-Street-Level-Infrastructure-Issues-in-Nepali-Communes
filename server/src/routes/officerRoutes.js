import { Router } from 'express'

import {
  officerLogin,
  officerLogout,
  officerMe,
  officerChangePassword,
  officerForgotPassword,
  officerVerifyResetCode,
  officerResetPassword,
} from '../controllers/officerController.js'
import {
  listOfficers,
  createOfficer,
  resendInvite,
  updateOfficer,
  deactivateOfficer,
  reactivateOfficer,
  listAuditLogs,
  getClassifierConfigHandler,
  updateClassifierConfigHandler,
} from '../controllers/officerAdminController.js'
import {
  listOfficerReports,
  getOfficerReport,
  getOfficerReportAudit,
  getOriginalPhoto,
  reclassifyReport,
  changeReportState,
  rejectReport,
  setReportPriority,
  togglePhotoHide,
  redactReport,
  removeRedaction,
  addReportNote,
  bulkRejectReports,
} from '../controllers/officerReportController.js'
import { getOfficerAnalytics } from '../controllers/officerAnalyticsController.js'
import {
  updateOfficerProfile,
  uploadOfficerAvatar,
  removeOfficerAvatar,
  getOfficerAvatar,
  getStaffAvatar,
} from '../controllers/officerProfileController.js'
import { uploadAvatar } from '../middleware/upload.js'
import { requireOfficer, requireRole } from '../middleware/officerAuth.js'
import { createRateLimiter } from '../middleware/rateLimit.js'

// Staff login + admin routes, at /api/officer.
const router = Router()

// limit per IP so nobody can try lots of emails (account lockout is in the controller)
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 30,
  message: 'Too many sign-in attempts from this network. Please try again later.',
})
const resetLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 5,
  message: 'Too many requests. Please try again later.',
})
// code checks have their own limit so a typo doesn't block resending
const verifyCodeLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 20,
  message: 'Too many attempts. Please try again later.',
})

// --- no login needed ---
router.post('/login', loginLimiter, officerLogin)
router.post('/forgot-password', resetLimiter, officerForgotPassword)
router.post('/verify-reset-code', verifyCodeLimiter, officerVerifyResetCode)
router.post('/reset-password', resetLimiter, officerResetPassword)

// --- login needed ---
router.get('/me', requireOfficer, officerMe)
router.post('/logout', requireOfficer, officerLogout)
router.post('/change-password', requireOfficer, officerChangePassword)

// own profile
router.patch('/profile', requireOfficer, updateOfficerProfile)
router.get('/profile/avatar', requireOfficer, getOfficerAvatar)
router.post('/profile/avatar', requireOfficer, uploadAvatar, uploadOfficerAvatar)
router.delete('/profile/avatar', requireOfficer, removeOfficerAvatar)
router.get('/staff/:id/avatar', requireOfficer, getStaffAvatar)

// --- review queue + report actions ---
router.get('/analytics', requireOfficer, getOfficerAnalytics)
router.get('/reports', requireOfficer, listOfficerReports)
router.post('/reports/bulk-reject', requireOfficer, bulkRejectReports)
router.get('/reports/:id', requireOfficer, getOfficerReport)
router.get('/reports/:id/audit', requireOfficer, getOfficerReportAudit)
router.get('/reports/:id/photo/original', requireOfficer, getOriginalPhoto)
router.post('/reports/:id/reclassify', requireOfficer, reclassifyReport)
router.post('/reports/:id/state', requireOfficer, changeReportState)
router.post('/reports/:id/reject', requireOfficer, rejectReport)
router.post('/reports/:id/priority', requireOfficer, setReportPriority)
router.post('/reports/:id/photo/hide', requireOfficer, togglePhotoHide)
router.post('/reports/:id/redact', requireOfficer, redactReport)
router.delete('/reports/:id/redact', requireOfficer, removeRedaction)
router.post('/reports/:id/notes', requireOfficer, addReportNote)

// --- admin only ---
router.get('/admin/officers', requireOfficer, requireRole('admin'), listOfficers)
router.post('/admin/officers', requireOfficer, requireRole('admin'), createOfficer)
router.patch('/admin/officers/:id', requireOfficer, requireRole('admin'), updateOfficer)
router.post(
  '/admin/officers/:id/resend-invite',
  requireOfficer,
  requireRole('admin'),
  resendInvite,
)
router.patch(
  '/admin/officers/:id/deactivate',
  requireOfficer,
  requireRole('admin'),
  deactivateOfficer,
)
router.patch(
  '/admin/officers/:id/reactivate',
  requireOfficer,
  requireRole('admin'),
  reactivateOfficer,
)
router.get('/admin/audit-logs', requireOfficer, requireRole('admin'), listAuditLogs)

// classifier settings: staff can read, admins can change
router.get('/admin/classifier-config', requireOfficer, getClassifierConfigHandler)
router.patch(
  '/admin/classifier-config',
  requireOfficer,
  requireRole('admin'),
  updateClassifierConfigHandler,
)

export default router
