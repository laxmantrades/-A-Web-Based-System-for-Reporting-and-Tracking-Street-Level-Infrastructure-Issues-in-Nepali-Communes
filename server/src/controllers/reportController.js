import { Report, CATEGORIES } from '../models/Report.js'
import { ReportAuditLog } from '../models/ReportAuditLog.js'
import { nextSequence } from '../models/Counter.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { sendTrackingEmail } from '../lib/mailer.js'
import { queueClassification } from '../lib/classifier.js'
import {
  uploadImageBuffer,
  fetchImageBuffer,
  REPORTS_FOLDER,
} from '../lib/cloudinary.js'

// Handles the report requests. Routes are in routes/reportRoutes.js.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NOTE_MAX = 200
const LOCATION_DESCRIPTION_MAX = 200

// same message for every miss, so you can't tell if an email exists
const LOOKUP_MISS =
  "We couldn't find any reports for that email. Please check it and try again."

// statuses on the public page, in two sections
const PUBLIC_LATEST_STATUSES = ['acknowledged', 'in_progress']
const PUBLIC_RESOLVED_STATUSES = ['resolved', 'closed']
const PUBLIC_STATUSES = [...PUBLIC_LATEST_STATUSES, ...PUBLIC_RESOLVED_STATUSES]
const PUBLIC_PAGE_SIZE = 20
const PUBLIC_NOT_FOUND = 'Report not found or not yet publicly available.'

// which photo the viewer gets:
//   hidden   -> none (frontend shows placeholder)
//   redacted -> redacted copy
//   else     -> original
function publicPhoto(report) {
  if (report.photoStatus === 'hidden') {
    return { photoStatus: 'hidden', photoUrl: null }
  }
  return {
    photoStatus: report.hasRedaction ? 'redacted' : 'visible',
    photoUrl: `/api/reports/public/${report.referenceId}/photo`,
  }
}

// proxy URL for a photo. The id is random so it can't be guessed.
export function reportPhotoProxyUrl(publicId) {
  if (!publicId) return null
  return `/api/reports/photo/${publicId.split('/').map(encodeURIComponent).join('/')}`
}

// photo for the citizen's tracking view
function trackingPhoto(report) {
  if (report.photoStatus === 'hidden') return { photoStatus: 'hidden', photoUrl: null }
  if (report.hasRedaction) {
    return {
      photoStatus: 'redacted',
      photoUrl: reportPhotoProxyUrl(report.redactedPhotoPublicId),
    }
  }
  return { photoStatus: 'visible', photoUrl: reportPhotoProxyUrl(report.photoPublicId) }
}

// GPS point, or null
function locationView(report) {
  if (!report.location?.coordinates?.length) return null
  return {
    coordinates: report.location.coordinates,
    address: report.location.address,
  }
}

// full report for detail pages. Leaves out email, ward, priority, officer,
// classifier result and who changed each status.
function publicReportView(report, { forPublic = false } = {}) {
  return {
    reportId: report.id,
    referenceId: report.referenceId,
    category: report.category,
    note: report.note,
    ...(forPublic ? publicPhoto(report) : trackingPhoto(report)),
    location: locationView(report),
    locationDescription: report.locationDescription || '',
    status: report.status,
    statusHistory: report.statusHistory.map((event) => ({
      status: event.status,
      note: event.note,
      changedAt: event.changedAt,
    })),
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    resolvedAt: report.resolvedAt,
  }
}

// small version for feed cards
function publicCardView(report) {
  return {
    referenceId: report.referenceId,
    category: report.category,
    ...publicPhoto(report),
    location: locationView(report),
    locationDescription: report.locationDescription || '',
    status: report.status,
    createdAt: report.createdAt,
    resolvedAt: report.resolvedAt,
  }
}

// 30 second cache for the feed, cleared when a status changes
const feedCache = new Map()
const FEED_TTL_MS = 30_000

export function clearPublicReportsCache() {
  feedCache.clear()
}

// GET /api/reports - newest first, ?ward=&status=&category=
export const listReports = asyncHandler(async (req, res) => {
  const { ward, status, category } = req.query

  const filter = {}
  if (ward) filter.ward = Number(ward)
  if (status) filter.status = status
  if (category) filter.category = category

  const reports = await Report.find(filter).sort({ createdAt: -1 }).limit(100)
  res.json({ count: reports.length, reports })
})

// GET /api/reports/:id - one report with its history
export const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
  if (!report) {
    res.status(404).json({ error: 'Report not found' })
    return
  }
  res.json({ report })
})

// GET /api/reports/public - the public page.
//   latest:   in review / in progress
//   resolved: resolved / closed
// ?category= and ?status= filter both
export const listPublicReports = asyncHandler(async (req, res) => {
  const category = CATEGORIES.includes(req.query.category) ? req.query.category : null
  const status = PUBLIC_STATUSES.includes(req.query.status) ? req.query.status : null

  const cacheKey = `${category || ''}|${status || ''}`
  const cached = feedCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    res.set('Cache-Control', 'public, max-age=30')
    res.json(cached.body)
    return
  }

  const base = category ? { category } : {}
  const take = PUBLIC_PAGE_SIZE + 1 // one extra to know if there's more

  const latestStatuses = status
    ? PUBLIC_LATEST_STATUSES.filter((s) => s === status)
    : PUBLIC_LATEST_STATUSES
  const resolvedStatuses = status
    ? PUBLIC_RESOLVED_STATUSES.filter((s) => s === status)
    : PUBLIC_RESOLVED_STATUSES

  const [latestDocs, resolvedDocs, totalPublic] = await Promise.all([
    latestStatuses.length
      ? Report.find({ ...base, status: { $in: latestStatuses } })
          .sort({ createdAt: -1 })
          .limit(take)
      : [],
    resolvedStatuses.length
      ? Report.find({ ...base, status: { $in: resolvedStatuses } })
          .sort({ resolvedAt: -1, updatedAt: -1 })
          .limit(take)
      : [],
    Report.countDocuments({ status: { $in: PUBLIC_STATUSES } }),
  ])

  const body = {
    latest: latestDocs.slice(0, PUBLIC_PAGE_SIZE).map(publicCardView),
    resolved: resolvedDocs.slice(0, PUBLIC_PAGE_SIZE).map(publicCardView),
    hasMoreLatest: latestDocs.length > PUBLIC_PAGE_SIZE,
    hasMoreResolved: resolvedDocs.length > PUBLIC_PAGE_SIZE,
    totalPublic,
  }
  feedCache.set(cacheKey, { body, expires: Date.now() + FEED_TTL_MS })

  res.set('Cache-Control', 'public, max-age=30')
  res.json(body)
})

// GET /api/reports/public/:referenceId - public detail.
// Not public or unknown -> same 404.
export const getPublicReport = asyncHandler(async (req, res) => {
  const referenceId = Number.parseInt(String(req.params.referenceId).replace(/^#/, ''), 10)
  if (!Number.isInteger(referenceId) || referenceId <= 0) {
    res.status(404).json({ error: PUBLIC_NOT_FOUND })
    return
  }

  const report = await Report.findOne({ referenceId })
  if (!report || !PUBLIC_STATUSES.includes(report.status)) {
    res.status(404).json({ error: PUBLIC_NOT_FOUND })
    return
  }

  res.json({ report: publicReportView(report, { forPublic: true }) })
})

// download from cloudinary and send to the client
async function proxyImage(res, sourceUrl, { cacheControl }) {
  try {
    const { buffer, contentType } = await fetchImageBuffer(sourceUrl)
    res.set('Cache-Control', cacheControl)
    res.set('Content-Type', contentType)
    res.send(buffer)
  } catch (err) {
    console.error('[photo] proxy fetch failed:', err.message)
    res.status(502).json({ error: 'Photo temporarily unavailable.' })
  }
}

// GET /api/reports/public/:referenceId/photo
//   hidden -> 404, redacted -> redacted copy, visible -> original
// not public -> 404
export const getPublicReportPhoto = asyncHandler(async (req, res) => {
  const referenceId = Number.parseInt(String(req.params.referenceId).replace(/^#/, ''), 10)
  if (!Number.isInteger(referenceId) || referenceId <= 0) {
    res.status(404).json({ error: PUBLIC_NOT_FOUND })
    return
  }

  const report = await Report.findOne({ referenceId })
  if (!report || !PUBLIC_STATUSES.includes(report.status)) {
    res.status(404).json({ error: PUBLIC_NOT_FOUND })
    return
  }

  const source =
    report.photoStatus === 'hidden'
      ? null
      : report.hasRedaction
        ? report.redactedPhotoUrl
        : report.photoUrl

  if (!source) {
    res.status(404).json({ error: 'Photo not available.' })
    return
  }

  await proxyImage(res, source, { cacheControl: 'public, max-age=60' })
})

// GET /api/reports/photo/:assetId - photo by cloudinary id
// (tracking view and officer UI). Hidden -> 404, redacted original -> 404.
export const getReportPhotoAsset = asyncHandler(async (req, res) => {
  const assetId = String(req.params.assetId || req.params[0] || '')

  // only our report photos
  if (!assetId.startsWith(`${REPORTS_FOLDER}/`)) {
    res.status(404).json({ error: 'Photo not found.' })
    return
  }

  const report = await Report.findOne({
    $or: [{ photoPublicId: assetId }, { redactedPhotoPublicId: assetId }],
  })
  if (!report || report.photoStatus === 'hidden') {
    res.status(404).json({ error: 'Photo not found.' })
    return
  }

  const isOriginal = assetId === report.photoPublicId
  if (isOriginal && report.hasRedaction) {
    // original of a redacted photo is officer-only
    res.status(404).json({ error: 'Photo not found.' })
    return
  }

  const source = isOriginal ? report.photoUrl : report.redactedPhotoUrl
  await proxyImage(res, source, { cacheControl: 'public, max-age=300' })
})

// POST /api/reports/lookup - get all reports for an email.
// Any miss -> same 404.
export const lookupReport = asyncHandler(async (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase()

  if (!EMAIL_RE.test(email)) {
    res.status(404).json({ error: LOOKUP_MISS })
    return
  }

  const reports = await Report.find({ reporterEmail: email })
    .sort({ createdAt: -1 })
    .limit(50)

  if (reports.length === 0) {
    res.status(404).json({ error: LOOKUP_MISS })
    return
  }

  res.json({ reports: reports.map(publicReportView) })
})

// POST /api/reports (form data) - create a report.
// Needs GPS, a written location, or both. Returns { reportId, referenceId }.
// Also emails the citizen.
export const createReport = asyncHandler(async (req, res) => {
  const fail = (message) => res.status(400).json({ error: message })

  const { category, address = '', note = '', email = '' } = req.body
  const locationDescription = String(req.body.locationDescription ?? '').trim()
  const hasCoords = req.body.lat !== undefined && req.body.lat !== ''
  const lat = Number(req.body.lat)
  const lng = Number(req.body.lng)

  if (!req.file) return fail('A photo of the problem is required.')
  if (!CATEGORIES.includes(category)) return fail('Choose a valid category.')
  if (hasCoords) {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return fail('Your location is invalid. Try "Use my location" again.')
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return fail('Your location is invalid. Try "Use my location" again.')
    }
  } else if (!locationDescription) {
    return fail('Tell us where the problem is — use your location or describe it.')
  }
  if (locationDescription.length > LOCATION_DESCRIPTION_MAX) {
    return fail(`Keep the location description under ${LOCATION_DESCRIPTION_MAX} characters.`)
  }
  if (!EMAIL_RE.test(email.trim())) return fail('Enter a valid email address.')
  if (note.length > NOTE_MAX) {
    return fail(`Keep the note under ${NOTE_MAX} characters.`)
  }

  // upload the photo first, so a failed upload doesn't use a report number
  let photo
  try {
    photo = await uploadImageBuffer(req.file.buffer, { folder: REPORTS_FOLDER })
  } catch (err) {
    console.error('[cloudinary] report photo upload failed:', err.message)
    return res.status(502).json({
      error: 'We could not store your photo. Please try again in a moment.',
    })
  }

  const referenceId = await nextSequence('report')

  const report = await Report.create({
    category,
    note: note.trim(),
    description: note.trim(),
    photoUrl: photo.url,
    photoPublicId: photo.publicId,
    location: hasCoords
      ? { type: 'Point', coordinates: [lng, lat], address: String(address).trim() }
      : undefined,
    locationDescription,
    reporterEmail: email.trim().toLowerCase(),
    referenceId,
  })

  // don't fail the request if email fails
  sendTrackingEmail({ to: report.reporterEmail, referenceId }).catch((err) =>
    console.error('[mail] confirmation email failed:', err.message),
  )

  // start classifying in the background
  queueClassification(report.id)

  res.status(201).json({ reportId: report.id, referenceId })
})

// GET /api/reports/public/:referenceId/audit - public history, no officer names
export const getPublicReportAudit = asyncHandler(async (req, res) => {
  const referenceId = Number.parseInt(String(req.params.referenceId).replace(/^#/, ''), 10)
  if (!Number.isInteger(referenceId) || referenceId <= 0) {
    res.status(404).json({ error: PUBLIC_NOT_FOUND })
    return
  }

  const report = await Report.findOne({ referenceId })
  if (!report || !PUBLIC_STATUSES.includes(report.status)) {
    res.status(404).json({ error: PUBLIC_NOT_FOUND })
    return
  }

  const rows = await ReportAuditLog.find({ report: report._id, publicVisible: true })
    .sort({ at: 1 })
    .lean()

  res.json({
    referenceId,
    entries: rows.map((row) => ({
      at: row.at,
      action: row.action,
      statusAfter: row.statusAfter || null,
      note: row.noteType === 'internal' ? '' : row.note || '',
      reason: row.action === 'report_rejected' ? row.reason || '' : '',
    })),
  })
})
