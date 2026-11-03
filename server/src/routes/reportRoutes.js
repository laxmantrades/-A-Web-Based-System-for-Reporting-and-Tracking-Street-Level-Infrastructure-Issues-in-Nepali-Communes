import { Router } from 'express'

import {
  listReports,
  getReport,
  listPublicReports,
  getPublicReport,
  getPublicReportPhoto,
  getReportPhotoAsset,
  getPublicReportAudit,
  lookupReport,
  createReport,
} from '../controllers/reportController.js'
import { uploadReportPhoto } from '../middleware/upload.js'
import { createRateLimiter } from '../middleware/rateLimit.js'
import { requireOfficer } from '../middleware/officerAuth.js'

// Routes under /api/reports.
const router = Router()

// limit lookups per IP so nobody can try lots of emails
const lookupLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 8,
  message: 'Too many attempts. Please wait a minute and try again.',
})

// feed list has no limit, detail and photo are limited so nobody can scrape every report
const publicDetailLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 40,
  message: 'Too many requests. Please slow down and try again shortly.',
})
const publicPhotoLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 200,
  message: 'Too many requests. Please slow down and try again shortly.',
})

// raw report reads, officer only (they include the classifier result)
router.get('/', requireOfficer, listReports)
router.post('/', uploadReportPhoto, createReport)

// before "/:id" so "public" isn't read as an id
router.get('/public', listPublicReports)
router.get('/public/:referenceId/photo', publicPhotoLimiter, getPublicReportPhoto)
// photo proxy, before "/:id" so "photo" isn't read as an id
router.get('/photo/:assetId(*)', publicPhotoLimiter, getReportPhotoAsset)
router.get('/public/:referenceId/audit', publicDetailLimiter, getPublicReportAudit)
router.get('/public/:referenceId', publicDetailLimiter, getPublicReport)

// tracking: find reports by email
router.post('/lookup', lookupLimiter, lookupReport)

router.get('/:id', requireOfficer, getReport)

export default router
