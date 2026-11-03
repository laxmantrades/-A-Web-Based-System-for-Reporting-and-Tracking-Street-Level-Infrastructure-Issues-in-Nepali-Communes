// The raw CLIP score is saved only for my evaluation.
// - saved on submit
// - overwritten by "Re-classify"
// - never sent in any API response
// - classifier fails -> report still saved, score null
// classifier is faked in tests/mocks/network.js
import request from 'supertest'

import {
  makeApp,
  createOfficer,
  sessionCookieFor,
  submitCitizenReport,
  waitFor,
  setClassifier,
  classifierCalls,
  sentMail,
} from './helpers.js'
import { Report } from '../src/models/Report.js'
import { clearPublicReportsCache } from '../src/controllers/reportController.js'

// unusual values so a match in the response really means a leak
const FIRST_SCORE = 0.8123
const SECOND_SCORE = 0.0412

let ipCounter = 40
const nextIp = () => `198.51.100.${ipCounter++}`

// score is select:false, so ask for it
const withScore = (query) => query.select('+classifier.score').lean()

// wait for classifying to finish, then read report with score
function waitForScored(reportId) {
  return waitFor(async () => {
    const r = await withScore(Report.findById(reportId))
    return r?.classifier?.runAt ? r : null
  })
}

// all keys in a JSON value as dotted paths
function allKeyPaths(value, path = '', out = []) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => allKeyPaths(v, `${path}[${i}]`, out))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const p = path ? `${path}.${k}` : k
      out.push({ key: k, path: p })
      allKeyPaths(v, p, out)
    }
  }
  return out
}

// check a response has no score key or score value
function expectNoScore(body, label) {
  const scoreKeys = allKeyPaths(body)
    .filter(({ key }) => /score/i.test(key))
    .map(({ path }) => path)
  expect({ label, scoreKeys }).toEqual({ label, scoreKeys: [] })

  const text = JSON.stringify(body)
  for (const value of [FIRST_SCORE, SECOND_SCORE]) {
    expect({ label, leaked: text.includes(String(value)) }).toEqual({ label, leaked: false })
    // also check without leading zero (".8123")
    expect({ label, leaked: text.includes(String(value).slice(1)) }).toEqual({
      label,
      leaked: false,
    })
  }
}

describe('Classifier raw score (stored only, never exposed)', () => {
  let app
  let officer
  let cookie

  beforeEach(async () => {
    clearPublicReportsCache()
    app = makeApp()
    officer = await createOfficer()
    cookie = await sessionCookieFor(officer)
  })

  test('C1. submission saves the raw score returned by the CLIP service', async () => {
    setClassifier({ mode: 'score', score: FIRST_SCORE, spam: null })

    const res = await submitCitizenReport(app, { lat: 27.7172, lng: 85.324 })
    expect(res.status).toBe(201)
    expectNoScore(res.body, 'submit response')

    const saved = await waitForScored(res.body.reportId)
    expect(saved.classifier.score).toBe(FIRST_SCORE)
    expect(saved.classifier.result).toEqual(expect.any(String))
    expect(saved.classifier.result).not.toBe('UNCLASSIFIED')
    expect(classifierCalls()).toHaveLength(1)
  })

  test('C2. officer re-classify overwrites the score with the new service value', async () => {
    setClassifier({ mode: 'score', score: FIRST_SCORE, spam: null })
    const res = await submitCitizenReport(app, { lat: 27.7172, lng: 85.324 })
    expect(res.status).toBe(201)
    const first = await waitForScored(res.body.reportId)
    expect(first.classifier.score).toBe(FIRST_SCORE)

    setClassifier({ mode: 'score', score: SECOND_SCORE, spam: 'chart' })
    const re = await request(app)
      .post(`/api/officer/reports/${res.body.reportId}/reclassify`)
      .set('Cookie', cookie)
      .send({})
    expect(re.status).toBe(200)

    const saved = await withScore(Report.findById(res.body.reportId))
    expect(saved.classifier.score).toBe(SECOND_SCORE)
    expect(saved.classifier.result).toBe('LOW')
    expect(saved.classifier.spamType).toBe('chart')
    expect(saved.classifier.runAt.getTime()).toBeGreaterThanOrEqual(
      first.classifier.runAt.getTime(),
    )
    expect(classifierCalls()).toHaveLength(2)
  })

  test('C3. the score never appears in public, citizen-lookup or officer responses', async () => {
    const email = 'score-leak@example.test'
    setClassifier({ mode: 'score', score: FIRST_SCORE, spam: null })
    const res = await submitCitizenReport(app, { lat: 27.7172, lng: 85.324, email })
    expect(res.status).toBe(201)
    const { reportId, referenceId } = res.body
    const classified = await waitForScored(reportId)
    expect(classified.classifier.score).toBe(FIRST_SCORE)

    // officer queue (still submitted -> needs review)
    const queue = await request(app).get('/api/officer/reports').set('Cookie', cookie)
    expect(queue.status).toBe(200)
    expect(JSON.stringify(queue.body)).toContain(String(referenceId))
    expectNoScore(queue.body, 'officer queue')

    // officer detail
    const detail = await request(app).get(`/api/officer/reports/${reportId}`).set('Cookie', cookie)
    expect(detail.status).toBe(200)
    expect(detail.body.report).toBeDefined()
    expectNoScore(detail.body, 'officer detail')

    // make it public
    const ack = await request(app)
      .post(`/api/officer/reports/${reportId}/state`)
      .set('Cookie', cookie)
      .send({ to: 'acknowledged', expectedStatus: 'submitted', publicNote: 'On it' })
    expect(ack.status).toBe(200)
    expectNoScore(ack.body, 'officer state change')

    // officer list, in review tab
    const inReview = await request(app)
      .get('/api/officer/reports?tab=in_review')
      .set('Cookie', cookie)
    expect(inReview.status).toBe(200)
    expect(JSON.stringify(inReview.body)).toContain(String(referenceId))
    expectNoScore(inReview.body, 'officer list (in_review)')

    // public list
    clearPublicReportsCache()
    const list = await request(app).get('/api/reports/public')
    expect(list.status).toBe(200)
    const refs = [...(list.body.latest ?? []), ...(list.body.resolved ?? [])].map(
      (r) => r.referenceId,
    )
    expect(refs).toContain(referenceId)
    expectNoScore(list.body, 'public list')

    // public detail
    const pub = await request(app).get(`/api/reports/public/${referenceId}`)
    expect(pub.status).toBe(200)
    expectNoScore(pub.body, 'public detail')

    // citizen email lookup
    const look = await request(app)
      .post('/api/reports/lookup')
      .set('X-Forwarded-For', nextIp())
      .send({ email })
    expect(look.status).toBe(200)
    expect(JSON.stringify(look.body)).toContain(String(referenceId))
    expectNoScore(look.body, 'citizen lookup')

    // re-classify: response has neither score
    setClassifier({ mode: 'score', score: SECOND_SCORE, spam: 'chart' })
    const re = await request(app)
      .post(`/api/officer/reports/${reportId}/reclassify`)
      .set('Cookie', cookie)
      .send({})
    expect(re.status).toBe(200)
    expectNoScore(re.body, 'reclassify response')

    // but db has the new one
    const saved = await withScore(Report.findById(reportId))
    expect(saved.classifier.score).toBe(SECOND_SCORE)

    // let the email finish inside this test
    await waitFor(() =>
      sentMail().some((m) => String(m.to ?? '').toLowerCase().includes(email)),
    )
  })

  test('C5. the score is excluded from the raw report routes and default queries', async () => {
    setClassifier({ mode: 'score', score: FIRST_SCORE, spam: null })
    const res = await submitCitizenReport(app, { lat: 27.7172, lng: 85.324 })
    expect(res.status).toBe(201)
    const { reportId } = res.body
    expect((await waitForScored(reportId)).classifier.score).toBe(FIRST_SCORE)

    // these return the raw document
    const list = await request(app).get('/api/reports').set('Cookie', cookie)
    expect(list.status).toBe(200)
    expect(JSON.stringify(list.body)).toContain(reportId)
    expectNoScore(list.body, 'raw report list')

    const one = await request(app).get(`/api/reports/${reportId}`).set('Cookie', cookie)
    expect(one.status).toBe(200)
    expect(one.body.report).toBeDefined()
    expectNoScore(one.body, 'raw report detail')

    // hidden by default, shown when asked for
    const plain = await Report.findById(reportId).lean()
    expect(plain.classifier.score).toBeUndefined()
    expect(plain.classifier.result).not.toBeNull()
  })

  test.each([
    ['timeout', 'TimeoutError on both attempts'],
    ['error', 'HTTP 500 on both attempts'],
    ['down', 'network failure on both attempts'],
  ])('C4. CLIP %s (%s): report still saved, score and result stay null', async (mode) => {
    setClassifier({ mode })

    const res = await submitCitizenReport(app, { lat: 27.7172, lng: 85.324 })
    expect(res.status).toBe(201)
    expect(await Report.exists({ _id: res.body.reportId })).toBeTruthy()

    const saved = await waitForScored(res.body.reportId)
    expect(saved.status).toBe('submitted')
    expect(saved.classifier.score).toBeNull()
    expect(saved.classifier.result).toBeNull()
    // first try + one retry, then gave up
    await waitFor(() => classifierCalls().length >= 2)
    expect(classifierCalls()).toHaveLength(2)
  })
})
