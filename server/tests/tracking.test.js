// Citizen tracking (email lookup) and the public reports list.
// POST /api/reports/lookup (8/min per IP), GET /api/reports/public (30s cache)
import request from 'supertest'

import {
  makeApp,
  createReport,
  createOfficer,
  sessionCookieFor,
  mockState,
  waitFor,
} from './helpers.js'
import { clearPublicReportsCache } from '../src/controllers/reportController.js'
import { STATUSES } from '../src/models/Report.js'

const PUBLIC = ['acknowledged', 'in_progress', 'resolved', 'closed']
const NOT_PUBLIC = ['submitted', 'rejected', 'duplicate']

// own IP per test so the rate limiter doesn't interfere
let ipCounter = 10
const nextIp = () => `203.0.113.${ipCounter++}`

function lookup(app, email) {
  return request(app)
    .post('/api/reports/lookup')
    .set('X-Forwarded-For', nextIp())
    .send({ email })
}

// all reference numbers in the feed
const feedRefs = (body) => [...body.latest, ...body.resolved].map((r) => r.referenceId).sort((a, b) => a - b)

// report with a given status and matching timestamps
function reportIn(status, extra = {}) {
  const resolvedAt = status === 'resolved' || status === 'closed' ? new Date() : null
  return createReport({ status, resolvedAt, ...extra })
}

describe('Tracking and public list', () => {
  let app
  beforeEach(() => {
    app = makeApp()
    // clear feed cache because db is wiped before each test
    clearPublicReportsCache()
  })

  test('6a. Email lookup returns only that email\'s reports (case-insensitive), never another person\'s', async () => {
    const alice = 'alice@example.test'
    const bob = 'bob@example.test'
    const a1 = await reportIn('acknowledged', { reporterEmail: alice })
    const a2 = await reportIn('resolved', { reporterEmail: alice })
    const b1 = await reportIn('in_progress', { reporterEmail: bob })

    // mixed case + spaces should still match
    const resA = await lookup(app, '  Alice@EXAMPLE.test ')
    expect(resA.status).toBe(200)
    const refsA = resA.body.reports.map((r) => r.referenceId).sort((x, y) => x - y)
    expect(refsA).toEqual([a1.referenceId, a2.referenceId].sort((x, y) => x - y))
    expect(refsA).not.toContain(b1.referenceId)
    // email is never sent back
    expect(JSON.stringify(resA.body)).not.toMatch(/reporterEmail|alice@|bob@/i)

    const resB = await lookup(app, bob)
    expect(resB.status).toBe(200)
    expect(resB.body.reports.map((r) => r.referenceId)).toEqual([b1.referenceId])

    // unknown email -> generic 404
    const resNone = await lookup(app, 'nobody@example.test')
    expect(resNone.status).toBe(404)
    expect(resNone.body.reports).toBeUndefined()
  })

  test('6b. A just-submitted report is trackable by its email at once, but stays off the public feed until an officer reviews it', async () => {
    // submitter can track straight away, public only sees it after an officer reviews it
    const carol = 'carol@example.test'
    const report = await reportIn('submitted', { reporterEmail: carol })

    // submitter sees it, still submitted
    const tracked = await lookup(app, carol)
    expect(tracked.status).toBe(200)
    const mine = tracked.body.reports.find((r) => r.referenceId === report.referenceId)
    expect(mine).toBeDefined()
    expect(mine.status).toBe('submitted')

    // public can't see it yet
    const before = await request(app).get('/api/reports/public')
    expect(before.status).toBe(200)
    expect(feedRefs(before.body)).not.toContain(report.referenceId)
    expect((await request(app).get(`/api/reports/public/${report.referenceId}`)).status).toBe(404)

    // officer reviews it
    const officer = await createOfficer()
    const review = await request(app)
      .post(`/api/officer/reports/${report.id}/state`)
      .set('Cookie', await sessionCookieFor(officer))
      .send({ to: 'acknowledged', expectedStatus: 'submitted' })
    expect(review.status).toBe(200)

    // now it's in the feed
    const after = await request(app).get('/api/reports/public')
    expect(feedRefs(after.body)).toContain(report.referenceId)
    expect((await request(app).get(`/api/reports/public/${report.referenceId}`)).status).toBe(200)

    // and tracking shows new status
    const trackedAgain = await lookup(app, carol)
    expect(trackedAgain.body.reports.find((r) => r.referenceId === report.referenceId).status).toBe(
      'acknowledged',
    )

    // let the status email finish
    await waitFor(() => mockState.sentMail.length > 0, { timeout: 2000 })
  })

  test('7. Public list shows only acknowledged / in_progress / resolved / closed reports', async () => {
    expect([...PUBLIC, ...NOT_PUBLIC].sort()).toEqual([...STATUSES].sort())

    const byStatus = {}
    for (const status of STATUSES) byStatus[status] = await reportIn(status)

    const res = await request(app).get('/api/reports/public')
    expect(res.status).toBe(200)

    // just the four public reports
    expect(feedRefs(res.body)).toEqual(PUBLIC.map((s) => byStatus[s].referenceId).sort((a, b) => a - b))
    for (const s of NOT_PUBLIC) {
      expect(feedRefs(res.body)).not.toContain(byStatus[s].referenceId)
    }
    expect(res.body.totalPublic).toBe(4)
    expect(res.body.hasMoreLatest).toBe(false)
    expect(res.body.hasMoreResolved).toBe(false)

    // latest = acknowledged + in_progress, resolved = resolved + closed
    expect(res.body.latest.map((r) => r.status).sort()).toEqual(['acknowledged', 'in_progress'])
    expect(res.body.resolved.map((r) => r.status).sort()).toEqual(['closed', 'resolved'])

    // filtering by a hidden status shows nothing
    for (const s of NOT_PUBLIC) {
      const filtered = await request(app).get('/api/reports/public').query({ status: s })
      expect(filtered.status).toBe(200)
      for (const card of [...filtered.body.latest, ...filtered.body.resolved]) {
        expect(PUBLIC).toContain(card.status)
      }
    }
  })

  test('8. Public list never includes citizen email addresses', async () => {
    const emails = []
    for (const [i, status] of PUBLIC.entries()) {
      const email = `private.person${i}@citizen-mail.test`
      emails.push(email)
      await reportIn(status, { reporterEmail: email, locationDescription: `Spot ${i}` })
    }

    const res = await request(app).get('/api/reports/public')
    expect(res.status).toBe(200)
    expect(feedRefs(res.body)).toHaveLength(PUBLIC.length) // all four are in the feed

    const json = JSON.stringify(res.body)
    for (const email of emails) expect(json).not.toContain(email)
    expect(json).not.toContain('citizen-mail.test')
    expect(json).not.toMatch(/reporterEmail/i)
    expect(json).not.toMatch(/"email"/i)
    for (const card of [...res.body.latest, ...res.body.resolved]) {
      expect(card).not.toHaveProperty('reporterEmail')
      expect(card).not.toHaveProperty('email')
    }
  })
})
