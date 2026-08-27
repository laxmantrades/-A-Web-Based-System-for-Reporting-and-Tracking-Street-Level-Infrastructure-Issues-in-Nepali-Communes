import { Report } from '../models/Report.js'
import { asyncHandler } from '../middleware/errorHandler.js'

/*
 * Controller = the functions that actually handle a request for one resource.
 * Routes (see routes/reportRoutes.js) just map URLs to these.
 *
 * Only the read endpoints are sketched here. The write endpoints are stubbed
 * with `501 Not Implemented` and a TODO so the API shape is visible now and
 * gets filled in during the relevant sprint.
 */

/**
 * GET /api/reports
 * List reports, newest first. Supports ?ward=5&status=submitted&category=pothole
 */
export const listReports = asyncHandler(async (req, res) => {
  const { ward, status, category } = req.query

  const filter = {}
  if (ward) filter.ward = Number(ward)
  if (status) filter.status = status
  if (category) filter.category = category

  const reports = await Report.find(filter).sort({ createdAt: -1 }).limit(100)
  res.json({ count: reports.length, reports })
})

/**
 * GET /api/reports/:id
 * One report with its full status history (the audit trail).
 */
export const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
  if (!report) {
    res.status(404).json({ error: 'Report not found' })
    return
  }
  res.json({ report })
})

/**
 * POST /api/reports
 * Create a report (citizen action). Expects multipart form data with the photo.
 *
 * TODO (submission sprint):
 *   1. Validate body (category, description, coordinates, ward, suggestedPriority).
 *   2. Handle the uploaded file (multer) and store it; keep the path in photoUrl.
 *   3. Create the Report; the pre-save hook seeds the audit trail.
 *   4. Kick off the AI photo check asynchronously (do not block the response).
 */
export const createReport = asyncHandler(async (req, res) => {
  res.status(501).json({ error: 'Not implemented yet — submission sprint.' })
})

/**
 * PATCH /api/reports/:id/status
 * Officer moves a report along the lifecycle and adds an audit-trail note.
 *
 * TODO (lifecycle sprint):
 *   1. Require an authenticated officer for the report's ward.
 *   2. Check the transition is allowed by the state machine.
 *   3. Set report.status and push a statusEvent { status, note, changedBy }.
 */
export const updateReportStatus = asyncHandler(async (req, res) => {
  res.status(501).json({ error: 'Not implemented yet — lifecycle sprint.' })
})
