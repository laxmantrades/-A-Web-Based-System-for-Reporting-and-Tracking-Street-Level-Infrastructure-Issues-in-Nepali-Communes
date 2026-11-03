// Officer actions: audit log, priority changes, photo redaction, hiding photos.
import request from 'supertest'
import sharp from 'sharp'

import {
  makeApp,
  createOfficer,
  sessionCookieFor,
  createReport,
  sentMail,
  mockState,
  waitFor,
} from './helpers.js'
import { Report } from '../src/models/Report.js'
import { ReportAuditLog } from '../src/models/ReportAuditLog.js'
import { clearPublicReportsCache } from '../src/controllers/reportController.js'

// let background work (like emails) run
const settle = (ms = 200) => new Promise((r) => setTimeout(r, ms))

// fake emails sent to this address
const mailTo = (address) =>
  sentMail().filter((m) => String(m.to ?? '').toLowerCase().includes(address.toLowerCase()))

// RGB of one pixel in a JPEG
async function pixelAt(buffer, x, y) {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true })
  const i = (y * info.width + x) * info.channels
  return [data[i], data[i + 1], data[i + 2]]
}

// find a report's card in the public feed
function findCard(body, referenceId) {
  return [...(body.latest ?? []), ...(body.resolved ?? [])].find(
    (c) => c.referenceId === referenceId,
  )
}

describe('Officer actions and moderation', () => {
  let app
  let officer
  let cookie

  beforeEach(async () => {
    // public feed cache outlives the db wipe, so clear it
    clearPublicReportsCache()
    app = makeApp()
    officer = await createOfficer()
    cookie = await sessionCookieFor(officer)
  })

  test('14. status change is recorded in the activity log with who and when', async () => {
    const report = await createReport({ status: 'submitted' })
    const before = Date.now()

    const res = await request(app)
      .post(`/api/officer/reports/${report.id}/state`)
      .set('Cookie', cookie)
      .send({ to: 'acknowledged', expectedStatus: 'submitted', publicNote: 'Looking into it' })

    expect(res.status).toBe(200)
    expect(res.body.report.status).toBe('acknowledged')

    // saved in db
    const rows = await ReportAuditLog.find({ report: report._id, action: 'state_change' }).lean()
    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.before).toBe('submitted')
    expect(row.after).toBe('acknowledged')
    expect(String(row.actorId)).toBe(String(officer._id))
    expect(row.actorName).toBe(officer.name)
    expect(row.at).toBeInstanceOf(Date)
    expect(row.at.getTime()).toBeGreaterThanOrEqual(before - 1000)
    expect(row.at.getTime()).toBeLessThanOrEqual(Date.now() + 1000)

    // shown in audit endpoint
    const audit = await request(app)
      .get(`/api/officer/reports/${report.id}/audit`)
      .set('Cookie', cookie)
    expect(audit.status).toBe(200)
    const entry = audit.body.entries.find((e) => e.action === 'state_change')
    expect(entry).toBeDefined()
    expect(entry.before).toBe('submitted')
    expect(entry.after).toBe('acknowledged')
    expect(entry.actor).toEqual(
      expect.objectContaining({ id: String(officer._id), name: officer.name }),
    )
    expect(Math.abs(new Date(entry.at).getTime() - Date.now())).toBeLessThan(60_000)

    // let the status email finish
    await waitFor(() => mailTo(report.reporterEmail).length > 0)
  })

  test('15. priority change is saved and does not send a citizen email', async () => {
    const report = await createReport({ status: 'acknowledged' })
    expect(report.priority ?? null).toBeNull()

    const res = await request(app)
      .post(`/api/officer/reports/${report.id}/priority`)
      .set('Cookie', cookie)
      .send({ priority: 'high' })

    expect(res.status).toBe(200)
    expect(res.body.report.priority).toBe('high')

    const saved = await Report.findById(report._id).lean()
    expect(saved.priority).toBe('high')

    // internal only
    const row = await ReportAuditLog.findOne({ report: report._id, action: 'priority_change' }).lean()
    expect(row).toBeTruthy()
    expect(row.before).toBeNull()
    expect(row.after).toBe('high')
    expect(String(row.actorId)).toBe(String(officer._id))
    expect(row.publicVisible).toBe(false)

    // no email to the citizen
    await settle()
    expect(mailTo(report.reporterEmail)).toHaveLength(0)

    // control: a normal status change does email, so the check above means something
    const state = await request(app)
      .post(`/api/officer/reports/${report.id}/state`)
      .set('Cookie', cookie)
      .send({ to: 'in_progress', expectedStatus: 'acknowledged' })
    expect(state.status).toBe(200)
    await waitFor(() => mailTo(report.reporterEmail).length > 0)
    expect(mailTo(report.reporterEmail)).toHaveLength(1)
  })

  test('16. redaction creates a different image and keeps the original while open', async () => {
    const report = await createReport({ status: 'acknowledged' })
    const originalUrl = report.photoUrl
    const originalId = report.photoPublicId
    const originalBytes = Buffer.from(mockState.images.get(originalId).buffer)

    // boxes are in pixels of the original (test photo is 64x48)
    const rect = { x: 8, y: 8, width: 24, height: 16 }
    const res = await request(app)
      .post(`/api/officer/reports/${report.id}/redact`)
      .set('Cookie', cookie)
      .send({ rectangles: [rect] })

    expect(res.status).toBe(200)
    expect(res.body.report.photo.hasRedaction).toBe(true)
    expect(res.body.report.photo.redactionRects).toEqual([rect])

    const saved = await Report.findById(report._id).lean()
    expect(saved.hasRedaction).toBe(true)
    expect(saved.redactedPhotoUrl).toBeTruthy()
    expect(saved.redactedPhotoPublicId).toBeTruthy()
    expect(saved.redactedPhotoPublicId).not.toBe(originalId)

    // new image saved and different from original
    const stored = mockState.images.get(saved.redactedPhotoPublicId)
    expect(stored).toBeDefined()
    expect(Buffer.compare(stored.buffer, originalBytes)).not.toBe(0)

    // box area black in redacted copy, not in original
    const [r, g, b] = await pixelAt(stored.buffer, 20, 16)
    expect(Math.max(r, g, b)).toBeLessThan(30)
    const [or, og, ob] = await pixelAt(originalBytes, 20, 16)
    expect(Math.max(or, og, ob)).toBeGreaterThan(30)

    // original still kept while report is open
    expect(saved.status).toBe('acknowledged')
    expect(saved.photoUrl).toBe(originalUrl)
    expect(saved.photoPublicId).toBe(originalId)
    expect(saved.originalDeletedAt ?? null).toBeNull()
    expect(mockState.destroyed).not.toContain(originalId)
    expect(mockState.images.has(originalId)).toBe(true)
    expect(Buffer.compare(mockState.images.get(originalId).buffer, originalBytes)).toBe(0)

    // officer can still get the original
    const orig = await request(app)
      .get(`/api/officer/reports/${report.id}/photo/original`)
      .set('Cookie', cookie)
      .buffer(true)
      .parse((resp, cb) => {
        const chunks = []
        resp.on('data', (c) => chunks.push(c))
        resp.on('end', () => cb(null, Buffer.concat(chunks)))
      })
    expect(orig.status).toBe(200)
    expect(Buffer.compare(orig.body, originalBytes)).toBe(0)

    // public photo is the redacted one
    clearPublicReportsCache()
    const pub = await request(app)
      .get(`/api/reports/public/${report.referenceId}/photo`)
      .buffer(true)
      .parse((resp, cb) => {
        const chunks = []
        resp.on('data', (c) => chunks.push(c))
        resp.on('end', () => cb(null, Buffer.concat(chunks)))
      })
    expect(pub.status).toBe(200)
    expect(Buffer.compare(pub.body, originalBytes)).not.toBe(0)
    const [pr, pg, pb] = await pixelAt(pub.body, 20, 16)
    expect(Math.max(pr, pg, pb)).toBeLessThan(30)
  })

  test('17. hiding a photo removes it from the public list', async () => {
    const report = await createReport({ status: 'acknowledged' })

    // before: card has a photo and it loads
    const listBefore = await request(app).get('/api/reports/public')
    expect(listBefore.status).toBe(200)
    const cardBefore = findCard(listBefore.body, report.referenceId)
    expect(cardBefore).toBeDefined()
    expect(cardBefore.photoUrl).toBe(`/api/reports/public/${report.referenceId}/photo`)
    expect(cardBefore.photoStatus).toBe('visible')

    const photoBefore = await request(app).get(`/api/reports/public/${report.referenceId}/photo`)
    expect(photoBefore.status).toBe(200)

    // hide it (no manual cache clear, hiding must clear it itself)
    const hide = await request(app)
      .post(`/api/officer/reports/${report.id}/photo/hide`)
      .set('Cookie', cookie)
      .send({ hidden: true })
    expect(hide.status).toBe(200)
    expect(hide.body.report.photo.photoHidden).toBe(true)

    // after: still listed, no photo
    const listAfter = await request(app).get('/api/reports/public')
    expect(listAfter.status).toBe(200)
    const cardAfter = findCard(listAfter.body, report.referenceId)
    expect(cardAfter).toBeDefined()
    expect(cardAfter.photoStatus).toBe('hidden')
    expect(cardAfter.photoUrl ?? null).toBeNull()
    // no cloudinary url in the card
    expect(JSON.stringify(cardAfter)).not.toContain('res.cloudinary.com')

    // public photo endpoint stops serving it
    const photoAfter = await request(app).get(`/api/reports/public/${report.referenceId}/photo`)
    expect(photoAfter.status).toBe(404)
    expect(photoAfter.headers['content-type']).not.toMatch(/^image\//)

    // asset proxy refuses too
    const assetAfter = await request(app).get(`/api/reports/photo/${report.photoPublicId}`)
    expect(assetAfter.status).toBe(404)
  })
})
