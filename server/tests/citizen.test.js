// Citizen report submission: location rule, 200-char note limit,
// and what happens when the classifier times out or fails.
import {
  makeApp,
  submitCitizenReport,
  setClassifier,
  classifierCalls,
  waitForClassification,
} from './helpers.js'
import { Report } from '../src/models/Report.js'

// Kathmandu, Ratna Park
const LAT = 27.7172
const LNG = 85.324

describe('Citizen reporting', () => {
  let app
  beforeEach(() => {
    app = makeApp()
    setClassifier({ mode: 'score', score: 0.9 })
  })

  test('1. report with GPS only (no written location) is accepted and stored as GeoJSON', async () => {
    const res = await submitCitizenReport(app, { lat: LAT, lng: LNG })

    expect(res.status).toBe(201)
    expect(res.body.reportId).toEqual(expect.any(String))
    expect(res.body.referenceId).toEqual(expect.any(Number))

    const saved = await Report.findById(res.body.reportId).lean()
    expect(saved).not.toBeNull()
    expect(saved.location.type).toBe('Point')
    // GeoJSON is [lng, lat]
    expect(saved.location.coordinates).toEqual([LNG, LAT])
    expect(saved.locationDescription).toBe('')
    expect(saved.status).toBe('submitted')
    expect(await Report.countDocuments()).toBe(1)

    await waitForClassification(res.body.reportId)
  })

  test('2. report with written location description only (no GPS) is accepted', async () => {
    const description = 'Ward 6, near the Pashupati temple gate'
    const res = await submitCitizenReport(app, { locationDescription: description })

    expect(res.status).toBe(201)

    const saved = await Report.findById(res.body.reportId).lean()
    expect(saved).not.toBeNull()
    expect(saved.locationDescription).toBe(description)
    // no empty Point saved without GPS
    expect(saved.location).toBeUndefined()
    expect(await Report.countDocuments()).toBe(1)

    await waitForClassification(res.body.reportId)
  })

  test('3. report with neither GPS nor location description is rejected and not saved', async () => {
    const res = await submitCitizenReport(app, { note: 'Big pothole' })

    // failed because of the location rule
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/where the problem is/i)
    expect(res.body.reportId).toBeUndefined()

    expect(await Report.countDocuments()).toBe(0)
    // nothing saved, nothing classified
    await new Promise((r) => setTimeout(r, 50))
    expect(classifierCalls()).toHaveLength(0)
  })

  test('4. citizen note longer than 200 characters is rejected and not saved', async () => {
    const res = await submitCitizenReport(app, {
      lat: LAT,
      lng: LNG,
      note: 'a'.repeat(201),
    })

    // failed because of the note length
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/note under 200 characters/i)
    expect(res.body.reportId).toBeUndefined()
    expect(await Report.countDocuments()).toBe(0)
  })

  test('4b. citizen note of exactly 200 characters is accepted (boundary)', async () => {
    const note = 'b'.repeat(200)
    const res = await submitCitizenReport(app, { lat: LAT, lng: LNG, note })

    expect(res.status).toBe(201)
    const saved = await Report.findById(res.body.reportId).lean()
    expect(saved.note).toBe(note)
    expect(saved.note).toHaveLength(200)

    await waitForClassification(res.body.reportId)
  })

  test('5a. CLIP service timeout: report is still saved and left unclassified', async () => {
    // fake classifier never answers, so only our timeout can end it
    setClassifier({ mode: 'hang' })

    const started = Date.now()
    const res = await submitCitizenReport(app, { lat: LAT, lng: LNG })
    // citizen gets an answer straight away
    expect(res.status).toBe(201)
    expect(Date.now() - started).toBeLessThan(2000)
    expect(await Report.findById(res.body.reportId)).not.toBeNull()

    const done = await waitForClassification(res.body.reportId, { timeout: 30000, interval: 200 })
    // first try + one retry, both timed out
    expect(classifierCalls()).toHaveLength(2)
    for (const call of classifierCalls()) {
      expect(call.signal).toBeInstanceOf(AbortSignal)
      expect(call.signal.aborted).toBe(true)
      expect(call.signal.reason?.name).toBe('TimeoutError')
    }
    expect(done.classifier.result).toBeNull()
    // report stays in officer queue
    expect(done.status).toBe('submitted')
  }, 45000)

  test('5b. CLIP service failure (HTTP 500 / unreachable): report is still saved and left unclassified', async () => {
    for (const mode of ['error', 'down']) {
      setClassifier({ mode })
      const callsBefore = classifierCalls().length

      const res = await submitCitizenReport(app, { locationDescription: `Failure mode ${mode}` })
      expect(res.status).toBe(201)
      expect(await Report.findById(res.body.reportId)).not.toBeNull()

      const done = await waitForClassification(res.body.reportId)
      expect(classifierCalls().length - callsBefore).toBe(2)
      expect(done.classifier.result).toBeNull()
      expect(done.status).toBe('submitted')
    }
    expect(await Report.countDocuments()).toBe(2)
  })
})
