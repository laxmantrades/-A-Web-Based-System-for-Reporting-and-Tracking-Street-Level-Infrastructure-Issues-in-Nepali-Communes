// Officer login and roles.
// 9 right/wrong password, 10 lock after 5 fails, 11 fails logged,
// 12 no session -> rejected, 13 only admin creates staff.
// Login is rate limited per IP, so each test sends its own IP (X-Forwarded-For).
import { createHash } from 'node:crypto'

import mongoose from 'mongoose'
import request from 'supertest'

import {
  makeApp,
  createOfficer,
  createAdmin,
  sessionCookieFor,
  sentMail,
  createReport,
  waitFor,
  TEST_PASSWORD,
} from './helpers.js'
import { User } from '../src/models/User.js'
import { Report } from '../src/models/Report.js'
import { ReportAuditLog } from '../src/models/ReportAuditLog.js'
import { Session } from '../src/models/Session.js'
import { AuthAuditLog } from '../src/models/AuthAuditLog.js'
import { SESSION_COOKIE } from '../src/lib/officerSession.js'

const WRONG_PASSWORD = 'Definitely-Wrong-99'

// different IP per call
let ipCounter = 0
const nextIp = () => `10.20.${Math.floor(++ipCounter / 250)}.${(ipCounter % 250) + 1}`

// login from a given IP
function login(app, { identifier, password }, ip, agent = request(app)) {
  return agent
    .post('/api/officer/login')
    .set('X-Forwarded-For', ip)
    .send({ identifier, password })
}

// get officer_session cookie from response
function sessionCookieIn(res) {
  const cookies = [].concat(res.headers['set-cookie'] ?? [])
  return cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`) && !c.startsWith(`${SESSION_COOKIE}=;`))
}

describe('Officer authentication and roles', () => {
  let app
  beforeAll(() => {
    app = makeApp()
  })

  // ---------------------------------------------------------------- 9
  test('9a. correct password signs in, sets a session cookie, and /me works', async () => {
    const officer = await createOfficer()
    const agent = request.agent(app)

    const res = await login(app, { identifier: officer.email, password: TEST_PASSWORD }, nextIp(), agent)
    expect(res.status).toBe(200)
    expect(res.body.officer.email).toBe(officer.email)
    expect(res.body.officer).not.toHaveProperty('passwordHash')

    const cookie = sessionCookieIn(res)
    expect(cookie).toBeDefined()
    expect(cookie).toMatch(/HttpOnly/i)
    expect(await Session.countDocuments({ officer: officer._id })).toBe(1)

    const me = await agent.get('/api/officer/me')
    expect(me.status).toBe(200)
    expect(me.body.officer.id).toBe(officer.id)
    expect(me.body.officer.role).toBe('officer')
  })

  test('9b. wrong password is refused with 401 and no session cookie', async () => {
    const officer = await createOfficer()
    const agent = request.agent(app)

    const res = await login(app, { identifier: officer.email, password: WRONG_PASSWORD }, nextIp(), agent)
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Incorrect email or password.')
    expect(sessionCookieIn(res)).toBeUndefined()
    expect(await Session.countDocuments({})).toBe(0)

    const me = await agent.get('/api/officer/me')
    expect(me.status).toBe(401)
  })

  // ---------------------------------------------------------------- 10
  test('10a. 5 failed attempts within 15 minutes lock the account (correct password then refused)', async () => {
    const officer = await createOfficer()
    const ip = nextIp() // one IP, 6 requests, under the IP limit

    for (let i = 1; i <= 4; i++) {
      const res = await login(app, { identifier: officer.email, password: WRONG_PASSWORD }, ip)
      expect(res.status).toBe(401)
    }
    // 4 fails don't lock
    const afterFour = await User.findById(officer._id).lean()
    expect(afterFour.failedLoginCount).toBe(4)
    expect(afterFour.lockUntil).toBeNull()

    const beforeFifth = Date.now()
    expect((await login(app, { identifier: officer.email, password: WRONG_PASSWORD }, ip)).status).toBe(401)
    const afterFifth = Date.now()

    const afterFailures = await User.findById(officer._id).lean()
    expect(afterFailures.failedLoginCount).toBe(5)
    expect(afterFailures.lockUntil).toBeInstanceOf(Date)
    // locked for 15 min from 5th fail
    expect(afterFailures.lockUntil.getTime()).toBeGreaterThanOrEqual(beforeFifth + 15 * 60_000)
    expect(afterFailures.lockUntil.getTime()).toBeLessThanOrEqual(afterFifth + 15 * 60_000)

    // now even the right password fails (401, not 429)
    const res = await login(app, { identifier: officer.email, password: TEST_PASSWORD }, ip)
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/temporarily locked/i)
    expect(sessionCookieIn(res)).toBeUndefined()
    expect(await Session.countDocuments({ officer: officer._id })).toBe(0)

    // lock is logged
    expect(await AuthAuditLog.countDocuments({ event: 'account_locked', officer: officer._id })).toBe(1)
  })

  test('10b. failures spread over more than 15 minutes do not lock the account', async () => {
    const officer = await createOfficer()
    const ip = nextIp()

    // 4 fails
    for (let i = 0; i < 4; i++) {
      expect((await login(app, { identifier: officer.email, password: WRONG_PASSWORD }, ip)).status).toBe(401)
    }
    expect((await User.findById(officer._id).lean()).failedLoginCount).toBe(4)

    // pretend they were 16 min ago
    await User.updateOne(
      { _id: officer._id },
      { $set: { failedLoginWindowStart: new Date(Date.now() - 16 * 60_000) } },
    )

    // 5th fail is in a new window, no lock
    expect((await login(app, { identifier: officer.email, password: WRONG_PASSWORD }, ip)).status).toBe(401)
    const after = await User.findById(officer._id).lean()
    expect(after.failedLoginCount).toBe(1)
    expect(after.lockUntil).toBeNull()

    // right password still works
    const ok = await login(app, { identifier: officer.email, password: TEST_PASSWORD }, ip)
    expect(ok.status).toBe(200)
    expect(sessionCookieIn(ok)).toBeDefined()
  })

  test('10c. 4 failed attempts do not lock: the correct password still signs in', async () => {
    const officer = await createOfficer()
    const ip = nextIp()

    for (let i = 0; i < 4; i++) {
      expect((await login(app, { identifier: officer.email, password: WRONG_PASSWORD }, ip)).status).toBe(401)
    }

    const ok = await login(app, { identifier: officer.email, password: TEST_PASSWORD }, ip)
    expect(ok.status).toBe(200)
    expect(sessionCookieIn(ok)).toBeDefined()
    expect(await AuthAuditLog.countDocuments({ event: 'account_locked' })).toBe(0)
  })

  // ---------------------------------------------------------------- 11
  test('11. each failed attempt is logged in the authauditlogs collection', async () => {
    expect(AuthAuditLog.collection.collectionName).toBe('authauditlogs')

    const officer = await createOfficer()
    const ip = nextIp()
    const before = Date.now()

    await login(app, { identifier: officer.email, password: WRONG_PASSWORD }, ip)
    await login(app, { identifier: officer.email.toUpperCase(), password: 'another-wrong' }, ip)
    await login(app, { identifier: 'nobody@ward.test', password: WRONG_PASSWORD }, ip)

    // read the collection directly
    const docs = await mongoose.connection.db
      .collection('authauditlogs')
      .find({ event: 'signin_failed' })
      .sort({ at: 1 })
      .toArray()

    expect(docs).toHaveLength(3)
    for (const doc of docs) {
      expect(doc.at).toBeInstanceOf(Date)
      expect(doc.at.getTime()).toBeGreaterThanOrEqual(before - 1000)
      expect(doc.at.getTime()).toBeLessThanOrEqual(Date.now() + 1000)
      expect(doc.ip).toBe(ip)
      expect(doc.reason).toEqual(expect.any(String))
      expect(doc.reason.length).toBeGreaterThan(0)
      // password never logged
      expect(JSON.stringify(doc)).not.toContain(WRONG_PASSWORD)
      expect(JSON.stringify(doc)).not.toContain('another-wrong')
    }
    expect(docs[0].emailAttempted).toBe(officer.email)
    expect(docs[0].reason).toBe('wrong password')
    expect(docs[1].emailAttempted).toBe(officer.email) // lower-cased
    expect(docs[2].emailAttempted).toBe('nobody@ward.test')
    expect(docs[2].reason).toBe('no matching staff account')

    // no success logged
    expect(await AuthAuditLog.countDocuments({ event: 'signin_success' })).toBe(0)
  })

  // ---------------------------------------------------------------- 12
  const PROTECTED = [
    ['get', '/api/officer/me'],
    ['get', '/api/officer/reports'],
    ['get', '/api/officer/analytics'],
    ['get', '/api/officer/admin/officers'],
    ['post', '/api/officer/logout'],
  ]

  test('12a. officer routes return 401 with no session cookie', async () => {
    for (const [method, path] of PROTECTED) {
      const res = await request(app)[method](path)
      expect({ path, status: res.status }).toEqual({ path, status: 401 })
    }
  })

  test('12b. officer routes return 401 with a made-up session cookie', async () => {
    await createOfficer() // account exists, token has no session
    const forged = `${SESSION_COOKIE}=${'A'.repeat(43)}`
    for (const [method, path] of PROTECTED) {
      const res = await request(app)[method](path).set('Cookie', forged)
      expect({ path, status: res.status }).toEqual({ path, status: 401 })
    }
  })

  test('12c. officer routes return 401 with an expired session (and allow a live one)', async () => {
    const officer = await createOfficer()
    const cookie = await sessionCookieFor(officer)

    // cookie works while session is live
    expect((await request(app).get('/api/officer/me').set('Cookie', cookie)).status).toBe(200)
    expect((await request(app).get('/api/officer/reports').set('Cookie', cookie)).status).toBe(200)

    // expire it (inactive)
    const raw = cookie.split('=')[1]
    const tokenHash = createHash('sha256').update(raw).digest('hex')
    await Session.updateOne({ tokenHash }, { $set: { expiresAt: new Date(Date.now() - 1000) } })

    for (const [method, path] of PROTECTED) {
      const res = await request(app)[method](path).set('Cookie', cookie)
      expect({ path, status: res.status }).toEqual({ path, status: 401 })
    }

    // past the 24h max is refused too
    const cookie2 = await sessionCookieFor(officer)
    const hash2 = createHash('sha256').update(cookie2.split('=')[1]).digest('hex')
    await Session.updateOne(
      { tokenHash: hash2 },
      {
        $set: {
          expiresAt: new Date(Date.now() + 3600_000),
          absoluteExpiresAt: new Date(Date.now() - 1000),
        },
      },
    )
    expect((await request(app).get('/api/officer/me').set('Cookie', cookie2)).status).toBe(401)
    expect((await request(app).get('/api/officer/reports').set('Cookie', cookie2)).status).toBe(401)
  })

  test('12d. report-changing officer routes return 401 without a valid session and change nothing', async () => {
    const report = await createReport({ status: 'submitted' })
    const id = report.id
    const before = await Report.findById(id).lean()
    const forged = `${SESSION_COOKIE}=${'B'.repeat(43)}`

    const MUTATIONS = [
      ['post', `/api/officer/reports/${id}/state`, { to: 'acknowledged', expectedStatus: 'submitted' }],
      ['post', `/api/officer/reports/${id}/priority`, { priority: 'high' }],
      ['post', `/api/officer/reports/${id}/reject`, { reason: 'spam' }],
      ['post', `/api/officer/reports/${id}/notes`, { type: 'internal', text: 'should not be saved' }],
      ['post', `/api/officer/reports/${id}/photo/hide`, { hidden: true }],
      ['post', `/api/officer/reports/${id}/redact`, { rectangles: [{ x: 1, y: 1, width: 10, height: 10 }] }],
      ['delete', `/api/officer/reports/${id}/redact`, undefined],
      ['post', `/api/officer/reports/${id}/reclassify`, undefined],
    ]
    const READS = [
      ['get', '/api/reports'], // officer-only list
      ['get', `/api/reports/${id}`],
      ['get', `/api/officer/reports/${id}`],
      ['get', `/api/officer/reports/${id}/photo/original`],
    ]

    for (const cookie of [null, forged]) {
      for (const [method, path, body] of [...MUTATIONS, ...READS]) {
        let req = request(app)[method](path)
        if (cookie) req = req.set('Cookie', cookie)
        const res = await (body ? req.send(body) : req)
        expect({ path, method, status: res.status }).toEqual({ path, method, status: 401 })
      }
    }

    // report unchanged, nothing logged or emailed
    const after = await Report.findById(id).lean()
    expect(after.status).toBe(before.status)
    expect(after.priority).toBe(before.priority)
    expect(after.photoStatus).toBe(before.photoStatus)
    expect(after.hasRedaction).toBe(before.hasRedaction)
    expect(after.internalNotes).toHaveLength(0)
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime())
    expect(await ReportAuditLog.countDocuments({ report: report._id })).toBe(0)
    expect(sentMail()).toHaveLength(0)
  })

  // ---------------------------------------------------------------- 13
  const newStaff = () => ({
    name: 'New Ward Officer',
    email: 'new.officer@ward.test',
    role: 'officer',
    ward: 7,
    jobTitle: 'Road Inspector',
  })

  test('13a. an admin can create a staff account', async () => {
    const admin = await createAdmin()
    const cookie = await sessionCookieFor(admin)

    const res = await request(app)
      .post('/api/officer/admin/officers')
      .set('Cookie', cookie)
      .send(newStaff())

    expect(res.status).toBe(201)
    expect(res.body.officer).toMatchObject({
      email: 'new.officer@ward.test',
      role: 'officer',
      ward: 7,
      status: 'invited',
    })

    const created = await User.findOne({ email: 'new.officer@ward.test' }).select('+passwordHash').lean()
    expect(created).not.toBeNull()
    expect(created.role).toBe('officer')
    expect(created.name).toBe('New Ward Officer')
    expect(created.passwordHash).toBeNull() // admin doesn't set the password
    expect(await AuthAuditLog.countDocuments({ event: 'account_created', officer: created._id })).toBe(1)

    // invite email sent (fake)
    await waitFor(() => sentMail().some((m) => String(m.to).includes('new.officer@ward.test')), {
      timeout: 2000,
    })
  })

  test('13b. an officer is refused (403) and no account is created', async () => {
    const officer = await createOfficer()
    const cookie = await sessionCookieFor(officer)
    const usersBefore = await User.countDocuments({})

    for (const body of [newStaff(), { ...newStaff(), role: 'admin', email: 'sneaky.admin@ward.test' }]) {
      const res = await request(app).post('/api/officer/admin/officers').set('Cookie', cookie).send(body)
      expect(res.status).toBe(403)
    }

    expect(await User.countDocuments({})).toBe(usersBefore)
    expect(await User.exists({ email: 'new.officer@ward.test' })).toBeNull()
    expect(await User.exists({ email: 'sneaky.admin@ward.test' })).toBeNull()
    expect(await AuthAuditLog.countDocuments({ event: 'account_created' })).toBe(0)
    expect(sentMail()).toHaveLength(0)

    // no session -> 401
    const anon = await request(app).post('/api/officer/admin/officers').send(newStaff())
    expect(anon.status).toBe(401)
    expect(await User.exists({ email: 'new.officer@ward.test' })).toBeNull()
  })
})
