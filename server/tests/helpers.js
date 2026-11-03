// Shared test helpers.
import { randomBytes, createHash } from 'node:crypto'

import sharp from 'sharp'
import request from 'supertest'

import { createApp } from '../src/app.js'
import { User } from '../src/models/User.js'
import { Report } from '../src/models/Report.js'
import { Session } from '../src/models/Session.js'
import { nextSequence } from '../src/models/Counter.js'
import { hashPassword } from '../src/lib/password.js'
import { SESSION_COOKIE } from '../src/lib/officerSession.js'
import { storeImage } from './mocks/cloudinary.js'
import { mockState } from './mocks/state.js'

export { mockState } from './mocks/state.js'
export { setClassifier, classifierCalls } from './mocks/network.js'

export const TEST_PASSWORD = 'Correct-Horse-42'

// new express app
export function makeApp() {
  return createApp({ clientOrigin: 'http://localhost:5173' })
}

// fake emails sent in this test
export const sentMail = () => mockState.sentMail

// create a staff account in db
export async function createStaff({ role = 'officer', password = TEST_PASSWORD, ...rest } = {}) {
  const n = randomBytes(3).toString('hex')
  const user = await User.create({
    name: role === 'admin' ? `Test Admin ${n}` : `Test Officer ${n}`,
    email: `${role}-${n}@ward.test`,
    role,
    ward: role === 'admin' ? null : 5,
    mustChangePassword: false,
    isActive: true,
    passwordHash: await hashPassword(password),
    ...rest,
  })
  user.plainPassword = password
  return user
}

export const createOfficer = (overrides) => createStaff({ ...overrides, role: 'officer' })
export const createAdmin = (overrides) => createStaff({ ...overrides, role: 'admin' })

// session cookie made directly in db (skips login + rate limiter)
export async function sessionCookieFor(user) {
  const raw = randomBytes(32).toString('base64url')
  const now = Date.now()
  await Session.create({
    tokenHash: createHash('sha256').update(raw).digest('hex'),
    officer: user._id,
    lastSeenAt: new Date(now),
    expiresAt: new Date(now + 8 * 3600_000),
    absoluteExpiresAt: new Date(now + 24 * 3600_000),
  })
  return `${SESSION_COOKIE}=${raw}`
}

// log in through the real route
export async function loginAgent(app, user, password = user.plainPassword ?? TEST_PASSWORD) {
  const agent = request.agent(app)
  const res = await agent.post('/api/officer/login').send({ identifier: user.email, password })
  return { agent, res }
}

// small real JPEG with varied pixels
export async function makeTestJpeg({ width = 64, height = 48 } = {}) {
  const pixels = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3
      pixels[i] = (x * 4) % 256
      pixels[i + 1] = (y * 5) % 256
      pixels[i + 2] = ((x + y) * 3) % 256
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 }).toBuffer()
}

// insert a report directly with a fake cloudinary photo
export async function createReport(overrides = {}) {
  const photo = storeImage(await makeTestJpeg())
  const status = overrides.status ?? 'submitted'
  return Report.create({
    category: 'pothole',
    photoUrl: photo.secure_url,
    photoPublicId: photo.public_id,
    location: { type: 'Point', coordinates: [85.324, 27.7172], address: 'Test Road' },
    locationDescription: 'Test report',
    reporterEmail: 'citizen@example.test',
    referenceId: await nextSequence('report'),
    statusHistory: [{ status, note: '', changedAt: new Date() }],
    ...overrides,
    status,
  })
}

// submit through the real citizen route (photo: null = no photo)
export async function submitCitizenReport(app, fields = {}, { photo } = {}) {
  const req = request(app).post('/api/reports')
  const defaults = { category: 'pothole', email: 'citizen@example.test' }
  for (const [key, value] of Object.entries({ ...defaults, ...fields })) {
    if (value !== undefined && value !== null) req.field(key, String(value))
  }
  if (photo !== null) {
    req.attach('photo', photo ?? (await makeTestJpeg()), {
      filename: 'photo.jpg',
      contentType: 'image/jpeg',
    })
  }
  return req
}

// keep calling fn until it returns something truthy
export async function waitFor(fn, { timeout = 10000, interval = 50 } = {}) {
  const end = Date.now() + timeout
  for (;;) {
    const value = await fn()
    if (value) return value
    if (Date.now() > end) throw new Error('waitFor: condition not met in time')
    await new Promise((r) => setTimeout(r, interval))
  }
}

// wait for the background classify job to finish (sets classifier.runAt),
// so it doesn't run into the next test's db
export function waitForClassification(reportId, opts) {
  return waitFor(async () => {
    const r = await Report.findById(reportId).lean()
    return r?.classifier?.runAt ? r : null
  }, opts)
}
