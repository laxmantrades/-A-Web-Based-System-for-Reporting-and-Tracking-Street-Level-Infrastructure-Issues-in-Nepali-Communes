import mongoose from 'mongoose'

import { Report, CATEGORIES, PRIORITIES } from '../models/Report.js'
import { User } from '../models/User.js'
import { ReportAuditLog, recordReportAudit } from '../models/ReportAuditLog.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { clearPublicReportsCache, reportPhotoProxyUrl } from './reportController.js'
import { sendStatusUpdateEmail, sendRejectionEmail } from '../lib/mailer.js'
import { runClassification } from '../lib/classifier.js'
import { renderRedactedImage } from '../lib/redact.js'
import {
  REDACTION_LOCKED,
  retireOriginalIfFinal,
  finishRetiringOriginal,
} from '../lib/photoRetention.js'
import {
  uploadImageBuffer,
  fetchImageBuffer,
  deleteImage,
  REDACTED_FOLDER,
} from '../lib/cloudinary.js'
import {
  canTransition,
  canReject,
  isPublicStatus,
  emailsCitizen,
  becomesPublic,
  REJECTION_REASONS,
  rejectionMessage,
} from '../lib/reportWorkflow.js'

// Officer review. Every change here:
// 1. needs officer login  2. checks allowed status moves
// 3. checks expectedStatus (someone else may have changed it)
// 4. writes an audit log  5. returns the full report

const PAGE_SIZE = 25

const TAB_STATUS = {
  needs_review: 'submitted',
  in_review: 'acknowledged',
  in_progress: 'in_progress',
  resolved: 'resolved',
  closed: 'closed',
  rejected: { $in: ['rejected', 'duplicate'] },
  all_active: { $in: ['submitted', 'acknowledged', 'in_progress'] },
}

const CONCURRENCY_MESSAGE =
  'This report was updated by another officer. Refresh to see the current state.'

function appBaseUrl() {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.CLIENT_ORIGIN ||
    'http://localhost:5173'
  ).replace(/\/$/, '')
}

// queue thumbnail (never the original)
function queueThumb(row) {
  if (row.photoStatus === 'hidden') return null
  if (row.photoStatus === 'redacted') {
    return reportPhotoProxyUrl(row.redactedPhotoPublicId)
  }
  return reportPhotoProxyUrl(row.photoPublicId)
}

function actorSnapshot(officer) {
  return {
    actorId: officer._id,
    actorName: officer.name,
    actorRole: officer.role,
  }
}

// audit row for the UI
function officerAuditEntry(row) {
  return {
    id: String(row._id),
    action: row.action,
    at: row.at,
    actor: row.actorId
      ? { id: String(row.actorId), name: row.actorName, role: row.actorRole }
      : null,
    before: row.before ?? null,
    after: row.after ?? null,
    reason: row.reason || '',
    spamType: row.spamType || null,
    note: row.note || '',
    noteType: row.noteType || null,
    statusAfter: row.statusAfter || null,
  }
}

// staff who worked on this report, newest first, with first/last time
async function handledBy(rows) {
  const byActor = new Map()
  for (const row of rows) {
    if (!row.actorId) continue // system events (like the classifier)
    const key = String(row.actorId)
    const entry = byActor.get(key) ?? {
      id: key,
      snapshotName: row.actorName,
      firstAt: row.at,
      lastAt: row.at,
      changes: 0,
    }
    entry.lastAt = row.at
    entry.changes += 1
    byActor.set(key, entry)
  }
  if (byActor.size === 0) return []

  const users = await User.find(
    { _id: { $in: [...byActor.keys()] } },
    {
      name: 1,
      role: 1,
      jobTitle: 1,
      email: 1,
      phone: 1,
      isActive: 1,
      avatarPublicId: 1,
      avatarUpdatedAt: 1,
    },
  ).lean()
  const userById = new Map(users.map((u) => [String(u._id), u]))

  return [...byActor.values()]
    .map((e) => {
      const u = userById.get(e.id)
      return {
        id: e.id,
        name: u?.name ?? e.snapshotName,
        role: u?.role ?? null,
        jobTitle: u?.jobTitle || '',
        email: u?.email ?? null,
        phone: u?.phone || '',
        active: u ? u.isActive !== false : false,
        avatarUrl: u?.avatarPublicId
          ? `/api/officer/staff/${e.id}/avatar?v=${u.avatarUpdatedAt?.getTime() ?? 0}`
          : null,
        firstAt: e.firstAt,
        lastAt: e.lastAt,
        changes: e.changes,
      }
    })
    .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
}

// full officer view with audit trail
async function officerReportPayload(report) {
  const rows = await ReportAuditLog.find({ report: report._id }).sort({ at: 1 }).lean()
  return {
    id: report.id,
    referenceId: report.referenceId,
    category: report.category,
    status: report.status,
    priority: report.priority ?? null,
    suggestedPriority: report.suggestedPriority,
    note: report.note,
    reporterEmail: report.reporterEmail,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    resolvedAt: report.resolvedAt,
    rejection: report.rejection?.reason
      ? {
          reason: report.rejection.reason,
          detail: report.rejection.detail || '',
          at: report.rejection.at || null,
        }
      : null,
    location: report.location?.coordinates?.length
      ? { coordinates: report.location.coordinates, address: report.location.address }
      : null,
    locationDescription: report.locationDescription || '',
    photo: {
      photoStatus: report.photoStatus,
      photoHidden: report.photoStatus === 'hidden',
      hasRedaction: Boolean(report.hasRedaction),
      // final + redacted: original is gone, no more editing
      originalDeleted: Boolean(report.originalDeletedAt),
      // login needed, original never has a public URL
      originalUrl: `/api/officer/reports/${report.id}/photo/original`,
      redactedUrl: reportPhotoProxyUrl(report.redactedPhotoPublicId),
      // boxes in original image pixels, for the tool
      redactionRects: (report.redaction?.rects ?? []).map((r) => ({
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      })),
      redactedAt: report.redaction?.updatedAt ?? null,
    },
    classifier: {
      result: report.classifier?.result ?? null, // HIGH | MEDIUM | LOW | UNCLASSIFIED | null
      spamType: report.classifier?.spamType ?? null, // e.g. 'chart', 'furniture'
      runAt: report.classifier?.runAt ?? null,
      version: report.classifier?.version ?? null,
    },
    auditTrail: rows.map(officerAuditEntry),
    handledBy: await handledBy(rows),
  }
}

function respondPayload(res, report, extra = {}) {
  return officerReportPayload(report).then((report_) =>
    res.json({ report: report_, ...extra }),
  )
}

/* READ */

const CLASSIFIER_FILTER = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
}

// GET /api/officer/reports
// ?tab, category, priority, classifier, sort (newest|oldest|priority), page
export const listOfficerReports = asyncHandler(async (req, res) => {
  const tab = Object.prototype.hasOwnProperty.call(TAB_STATUS, req.query.tab)
    ? req.query.tab
    : 'needs_review'
  const category = CATEGORIES.includes(req.query.category) ? req.query.category : null
  const priorityFilter = req.query.priority
  const classifierFilter = req.query.classifier
  const sort = ['newest', 'oldest', 'priority'].includes(req.query.sort)
    ? req.query.sort
    : 'newest'
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)

  const match = { status: TAB_STATUS[tab] }
  if (category) match.category = category
  if (priorityFilter === 'none') match.priority = null
  else if (PRIORITIES.includes(priorityFilter)) match.priority = priorityFilter
  if (classifierFilter === 'unclassified') {
    match['classifier.result'] = { $in: [null, 'UNCLASSIFIED'] }
  } else if (CLASSIFIER_FILTER[classifierFilter]) {
    match['classifier.result'] = CLASSIFIER_FILTER[classifierFilter]
  }

  const sortStage =
    sort === 'oldest'
      ? { createdAt: 1 }
      : sort === 'priority'
        ? { priorityRank: 1, createdAt: -1 }
        : { createdAt: -1 }

  const [facet] = await Report.aggregate([
    { $match: match },
    {
      $addFields: {
        priorityRank: {
          $switch: {
            branches: [
              { case: { $eq: ['$priority', 'high'] }, then: 0 },
              { case: { $eq: ['$priority', 'medium'] }, then: 1 },
              { case: { $eq: ['$priority', 'low'] }, then: 2 },
            ],
            default: 3,
          },
        },
      },
    },
    { $sort: sortStage },
    {
      $facet: {
        rows: [
          { $skip: (page - 1) * PAGE_SIZE },
          { $limit: PAGE_SIZE },
          {
            $project: {
              referenceId: 1,
              category: 1,
              status: 1,
              priority: 1,
              createdAt: 1,
              address: '$location.address',
              locationDescription: 1,
              photoStatus: 1,
              photoPublicId: 1,
              redactedPhotoPublicId: 1,
              classifier: { $ifNull: ['$classifier.result', null] },
            },
          },
        ],
        meta: [{ $count: 'total' }],
      },
    },
  ])

  const total = facet?.meta?.[0]?.total ?? 0
  const reports = (facet?.rows ?? []).map((row) => ({
    id: String(row._id),
    referenceId: row.referenceId,
    category: row.category,
    status: row.status,
    priority: row.priority ?? null,
    createdAt: row.createdAt,
    address: row.address || '',
    locationDescription: row.locationDescription || '',
    classifier: row.classifier ?? null,
    photoStatus: row.photoStatus,
    thumbUrl: queueThumb(row),
  }))

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [statFacet] = await Report.aggregate([
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', n: { $sum: 1 } } }],
        needsReview: [{ $match: { status: 'submitted' } }, { $count: 'n' }],
        inProgress: [{ $match: { status: 'in_progress' } }, { $count: 'n' }],
        resolvedThisWeek: [
          {
            $match: {
              status: { $in: ['resolved', 'closed'] },
              resolvedAt: { $gte: weekAgo },
            },
          },
          { $count: 'n' },
        ],
      },
    },
  ])

  // count per tab for the badges
  const statusCount = new Map((statFacet?.byStatus ?? []).map((s) => [s._id, s.n]))
  const countFor = (statuses) => statuses.reduce((sum, st) => sum + (statusCount.get(st) ?? 0), 0)
  const tabCounts = Object.fromEntries(
    Object.entries(TAB_STATUS).map(([key, match]) => [
      key,
      countFor(typeof match === 'string' ? [match] : match.$in),
    ]),
  )

  res.json({
    reports,
    page,
    pageSize: PAGE_SIZE,
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    stats: {
      needsReview: statFacet?.needsReview?.[0]?.n ?? 0,
      inProgress: statFacet?.inProgress?.[0]?.n ?? 0,
      resolvedThisWeek: statFacet?.resolvedThisWeek?.[0]?.n ?? 0,
    },
    tabCounts,
  })
})

async function loadReportOr404(id, res) {
  if (!mongoose.isValidObjectId(id)) {
    res.status(404).json({ error: 'Report not found.' })
    return null
  }
  const report = await Report.findById(id)
  if (!report) {
    res.status(404).json({ error: 'Report not found.' })
    return null
  }
  return report
}

// GET /api/officer/reports/:id
export const getOfficerReport = asyncHandler(async (req, res) => {
  const report = await loadReportOr404(req.params.id, res)
  if (!report) return
  await respondPayload(res, report)
})

// GET /api/officer/reports/:id/audit - full audit trail
export const getOfficerReportAudit = asyncHandler(async (req, res) => {
  const report = await loadReportOr404(req.params.id, res)
  if (!report) return
  const rows = await ReportAuditLog.find({ report: report._id }).sort({ at: 1 }).lean()
  res.json({ referenceId: report.referenceId, entries: rows.map(officerAuditEntry) })
})

// POST /api/officer/reports/:id/reclassify - run the classifier again
export const reclassifyReport = asyncHandler(async (req, res) => {
  const report = await loadReportOr404(req.params.id, res)
  if (!report) return

  await runClassification(report._id, { trigger: 'reclassify', officer: req.officer })

  const updated = await Report.findById(report._id)
  await respondPayload(res, updated)
})

/* STATUS CHANGES */

// rejecting, used by /reject and /state. canReject must be checked first.
async function applyRejection(report, officer, { reason, detail, publicNote }) {
  const from = report.status
  const message = rejectionMessage(reason, detail)

  report.status = 'rejected'
  report.rejection = { reason, detail: String(detail || '').trim(), at: new Date() }
  report.statusHistory.push({
    status: 'rejected',
    note: publicNote?.trim() || message,
    changedBy: officer._id,
    changedAt: new Date(),
  })
  const retiredOriginal = retireOriginalIfFinal(report, officer)
  await report.save()
  await finishRetiringOriginal(report, officer, retiredOriginal)

  await recordReportAudit({
    report: report._id,
    referenceId: report.referenceId,
    action: 'report_rejected',
    ...actorSnapshot(officer),
    before: from,
    after: 'rejected',
    reason,
    note: String(detail || '').trim(),
    statusAfter: 'rejected',
    publicVisible: true,
  })

  clearPublicReportsCache()

  sendRejectionEmail({
    to: report.reporterEmail,
    referenceId: report.referenceId,
    reasonText: message,
    reportUrl: `${appBaseUrl()}/report`,
  }).catch((err) => console.error('[mail] rejection email failed:', err.message))
}

// POST /api/officer/reports/:id/state
// { to, expectedStatus?, publicNote?, internalNote?, reason?, reasonDetail? }
export const changeReportState = asyncHandler(async (req, res) => {
  const to = String(req.body?.to ?? '')
  const expectedStatus = req.body?.expectedStatus
  const publicNote = String(req.body?.publicNote ?? '').trim()
  const internalNote = String(req.body?.internalNote ?? '').trim()

  const report = await loadReportOr404(req.params.id, res)
  if (!report) return

  const from = report.status

  if (expectedStatus && expectedStatus !== from) {
    res.status(409).json({ error: CONCURRENCY_MESSAGE })
    return
  }

  // rejecting needs a reason
  if (to === 'rejected') {
    if (!canReject(from)) {
      res.status(400).json({ error: `A report cannot be rejected from "${from}".` })
      return
    }
    const reason = String(req.body?.reason ?? '')
    if (!REJECTION_REASONS.includes(reason)) {
      res.status(400).json({ error: 'A valid rejection reason is required.' })
      return
    }
    if (reason === 'other' && !String(req.body?.reasonDetail ?? '').trim()) {
      res.status(400).json({ error: 'Provide a reason for rejecting this report.' })
      return
    }
    await applyRejection(report, req.officer, {
      reason,
      detail: req.body?.reasonDetail,
      publicNote,
    })
    if (internalNote) await addInternalNote(report, req.officer, internalNote)
    await respondPayload(res, report)
    return
  }

  if (!canTransition(from, to)) {
    res.status(400).json({ error: `You can't move a report from "${from}" to "${to}".` })
    return
  }

  report.status = to
  if ((to === 'resolved' || to === 'closed') && !report.resolvedAt) {
    report.resolvedAt = new Date()
  }
  report.statusHistory.push({
    status: to,
    note: publicNote,
    changedBy: req.officer._id,
    changedAt: new Date(),
  })
  const retiredOriginal = retireOriginalIfFinal(report, req.officer)
  await report.save()
  await finishRetiringOriginal(report, req.officer, retiredOriginal)

  await recordReportAudit({
    report: report._id,
    referenceId: report.referenceId,
    action: 'state_change',
    ...actorSnapshot(req.officer),
    before: from,
    after: to,
    note: publicNote,
    noteType: publicNote ? 'public' : null,
    statusAfter: to,
    publicVisible: true,
  })

  if (internalNote) await addInternalNote(report, req.officer, internalNote)

  // public feed may change, clear cache
  clearPublicReportsCache()

  if (emailsCitizen(from, to)) {
    sendStatusUpdateEmail({
      to: report.reporterEmail,
      referenceId: report.referenceId,
      status: to,
      publicNote,
    }).catch((err) => console.error('[mail] status update email failed:', err.message))
  }

  await respondPayload(res, report, {
    becamePublic: becomesPublic(from, to),
  })
})

// POST /api/officer/reports/:id/reject { reason, detail?, expectedStatus?, publicNote? }
export const rejectReport = asyncHandler(async (req, res) => {
  const reason = String(req.body?.reason ?? '')
  const detail = String(req.body?.detail ?? '')
  const expectedStatus = req.body?.expectedStatus
  const publicNote = String(req.body?.publicNote ?? '').trim()

  if (!REJECTION_REASONS.includes(reason)) {
    res.status(400).json({ error: 'A valid rejection reason is required.' })
    return
  }
  if (reason === 'other' && !detail.trim()) {
    res.status(400).json({ error: 'Provide a reason for rejecting this report.' })
    return
  }

  const report = await loadReportOr404(req.params.id, res)
  if (!report) return

  if (expectedStatus && expectedStatus !== report.status) {
    res.status(409).json({ error: CONCURRENCY_MESSAGE })
    return
  }
  if (!canReject(report.status)) {
    res
      .status(400)
      .json({ error: `A report cannot be rejected from "${report.status}".` })
    return
  }

  await applyRejection(report, req.officer, { reason, detail, publicNote })
  await respondPayload(res, report)
})

/* PRIORITY */

// POST /api/officer/reports/:id/priority { priority: 'low'|'medium'|'high'|null }
export const setReportPriority = asyncHandler(async (req, res) => {
  const raw = req.body?.priority
  const value = raw === null || raw === '' || raw === 'none' ? null : raw

  if (value !== null && !PRIORITIES.includes(value)) {
    res.status(400).json({ error: 'Unknown priority.' })
    return
  }

  const report = await loadReportOr404(req.params.id, res)
  if (!report) return

  const before = report.priority ?? null
  if (before === value) {
    await respondPayload(res, report, { unchanged: true })
    return
  }

  report.priority = value
  await report.save()

  await recordReportAudit({
    report: report._id,
    referenceId: report.referenceId,
    action: 'priority_change',
    ...actorSnapshot(req.officer),
    before,
    after: value,
    publicVisible: false, // internal only, no email
  })

  await respondPayload(res, report)
})

/* PHOTOS */

// POST /api/officer/reports/:id/photo/hide { hidden } (leave out to toggle)
export const togglePhotoHide = asyncHandler(async (req, res) => {
  const report = await loadReportOr404(req.params.id, res)
  if (!report) return

  const currentlyHidden = report.photoStatus === 'hidden'
  const hidden =
    typeof req.body?.hidden === 'boolean' ? req.body.hidden : !currentlyHidden

  if (hidden === currentlyHidden) {
    await respondPayload(res, report, { unchanged: true })
    return
  }

  const before = report.photoStatus
  report.photoStatus = hidden
    ? 'hidden'
    : report.redactedPhotoUrl
      ? 'redacted'
      : 'visible'
  report.internalNotes.push({
    body: hidden
      ? 'Photo hidden from the public feed.'
      : `Photo restored to the public feed (${report.photoStatus}).`,
    author: req.officer._id,
    createdAt: new Date(),
  })
  await report.save()

  await recordReportAudit({
    report: report._id,
    referenceId: report.referenceId,
    action: hidden ? 'photo_hidden' : 'photo_unhidden',
    ...actorSnapshot(req.officer),
    before,
    after: report.photoStatus,
    publicVisible: false,
  })

  clearPublicReportsCache()
  await respondPayload(res, report)
})

// GET /api/officer/reports/:id/photo/original - only way to get the original (login needed)
export const getOriginalPhoto = asyncHandler(async (req, res) => {
  const report = await loadReportOr404(req.params.id, res)
  if (!report) return
  try {
    const { buffer, contentType } = await fetchImageBuffer(report.photoUrl)
    res.set('Cache-Control', 'private, max-age=60')
    res.set('Content-Type', contentType)
    res.send(buffer)
  } catch (err) {
    console.error('[photo] original proxy failed:', err.message)
    res.status(502).json({ error: 'Photo temporarily unavailable.' })
  }
})

// POST /api/officer/reports/:id/redact { rectangles: [{ x, y, width, height }] }
// boxes in original pixels. Empty list is rejected (use DELETE).
// original is never changed, the old redacted copy is deleted after saving.
export const redactReport = asyncHandler(async (req, res) => {
  const report = await loadReportOr404(req.params.id, res)
  if (!report) return

  if (report.originalDeletedAt) {
    res.status(409).json({ error: REDACTION_LOCKED })
    return
  }

  const input = req.body?.rectangles ?? req.body?.rects

  let originalBuffer
  try {
    ;({ buffer: originalBuffer } = await fetchImageBuffer(report.photoUrl))
  } catch (err) {
    console.error('[redact] could not fetch original:', err.message)
    res.status(502).json({ error: 'The original photo could not be loaded. Try again.' })
    return
  }

  // renderRedactedImage checks the boxes and throws 400s
  const { buffer, rects } = await renderRedactedImage(originalBuffer, input)

  const previousRedactedPublicId = report.redactedPhotoPublicId
  const beforeCount = report.redaction?.rects?.length ?? 0

  const redacted = await uploadImageBuffer(buffer, { folder: REDACTED_FOLDER })

  report.hasRedaction = true
  report.redactedPhotoUrl = redacted.url
  report.redactedPhotoPublicId = redacted.publicId
  report.redaction = { rects, updatedAt: new Date(), updatedBy: req.officer._id }
  // a hidden photo stays hidden
  if (report.photoStatus !== 'hidden') report.photoStatus = 'redacted'
  report.internalNotes.push({
    body: `Photo redacted with ${rects.length} black rectangle(s).`,
    author: req.officer._id,
    createdAt: new Date(),
  })
  await report.save()

  if (previousRedactedPublicId && previousRedactedPublicId !== redacted.publicId) {
    deleteImage(previousRedactedPublicId)
  }

  await recordReportAudit({
    report: report._id,
    referenceId: report.referenceId,
    action: 'photo_redacted',
    ...actorSnapshot(req.officer),
    before: beforeCount,
    after: rects.length,
    publicVisible: false,
  })

  clearPublicReportsCache()
  await respondPayload(res, report)
})

// DELETE /api/officer/reports/:id/redact - remove redaction, go back to the original
export const removeRedaction = asyncHandler(async (req, res) => {
  const report = await loadReportOr404(req.params.id, res)
  if (!report) return

  if (!report.hasRedaction) {
    res.status(400).json({ error: 'This report has no redaction to remove.' })
    return
  }
  if (report.originalDeletedAt) {
    res.status(409).json({ error: REDACTION_LOCKED })
    return
  }

  const removedPublicId = report.redactedPhotoPublicId
  report.hasRedaction = false
  report.redactedPhotoUrl = ''
  report.redactedPhotoPublicId = ''
  report.redaction = { rects: [], updatedAt: new Date(), updatedBy: req.officer._id }
  if (report.photoStatus === 'redacted') report.photoStatus = 'visible'
  report.internalNotes.push({
    body: 'Redaction removed — the original photo is shown again.',
    author: req.officer._id,
    createdAt: new Date(),
  })
  await report.save()

  deleteImage(removedPublicId)

  await recordReportAudit({
    report: report._id,
    referenceId: report.referenceId,
    action: 'redaction_removed',
    ...actorSnapshot(req.officer),
    publicVisible: false,
  })

  clearPublicReportsCache()
  await respondPayload(res, report)
})

/* NOTES */

async function addInternalNote(report, officer, body) {
  report.internalNotes.push({ body, author: officer._id, createdAt: new Date() })
  await report.save()
  await recordReportAudit({
    report: report._id,
    referenceId: report.referenceId,
    action: 'note_added',
    ...actorSnapshot(officer),
    note: body,
    noteType: 'internal',
    statusAfter: report.status,
    publicVisible: false,
  })
}

// POST /api/officer/reports/:id/notes { type: 'public'|'internal', text }
export const addReportNote = asyncHandler(async (req, res) => {
  const type =
    (req.body?.type ?? req.body?.visibility) === 'internal' ? 'internal' : 'public'
  const text = String(req.body?.text ?? req.body?.body ?? '').trim()

  if (!text) {
    res.status(400).json({ error: 'A note cannot be empty.' })
    return
  }
  if (text.length > 1000) {
    res.status(400).json({ error: 'Keep the note under 1000 characters.' })
    return
  }

  const report = await loadReportOr404(req.params.id, res)
  if (!report) return

  if (type === 'internal') {
    await addInternalNote(report, req.officer, text)
  } else {
    report.statusHistory.push({
      status: report.status,
      note: text,
      changedBy: req.officer._id,
      changedAt: new Date(),
    })
    await report.save()
    await recordReportAudit({
      report: report._id,
      referenceId: report.referenceId,
      action: 'note_added',
      ...actorSnapshot(req.officer),
      note: text,
      noteType: 'public',
      statusAfter: report.status,
      publicVisible: true,
    })
    clearPublicReportsCache()
  }

  await respondPayload(res, report)
})

/* BULK */

// POST /api/officer/reports/bulk-reject { ids, reason, detail? }
// only rejects ones that can be rejected, skips the rest
export const bulkRejectReports = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.filter((id) => mongoose.isValidObjectId(id))
    : []
  const reason = String(req.body?.reason ?? 'spam')
  const detail = String(req.body?.detail ?? '')

  if (ids.length === 0) {
    res.status(400).json({ error: 'Select at least one report.' })
    return
  }
  if (!REJECTION_REASONS.includes(reason)) {
    res.status(400).json({ error: 'A valid rejection reason is required.' })
    return
  }
  if (reason === 'other' && !detail.trim()) {
    res.status(400).json({ error: 'Provide a reason for rejecting these reports.' })
    return
  }

  const reports = await Report.find({ _id: { $in: ids } })
  let rejected = 0
  for (const report of reports) {
    if (!canReject(report.status)) continue
    await applyRejection(report, req.officer, { reason, detail, publicNote: '' })
    rejected += 1
  }

  res.json({ rejected, skipped: ids.length - rejected })
})
