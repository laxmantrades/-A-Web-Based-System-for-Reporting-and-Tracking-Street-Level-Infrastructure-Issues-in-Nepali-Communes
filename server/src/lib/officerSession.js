import { randomBytes, createHash } from 'node:crypto'

import { Session } from '../models/Session.js'

export const SESSION_COOKIE = 'officer_session'

const INACTIVITY_MS = 8 * 60 * 60 * 1000 // 8h, moves forward
const ABSOLUTE_MS = 24 * 60 * 60 * 1000 // 24h max

const hashToken = (raw) => createHash('sha256').update(raw).digest('hex')

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: ABSOLUTE_MS,
})

// start a session and set the cookie. Returns the token (tests use it).
export async function createSession(res, officer, req) {
  const raw = randomBytes(32).toString('base64url')
  const now = Date.now()

  await Session.create({
    tokenHash: hashToken(raw),
    officer: officer._id,
    ip: req.ip || '',
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    lastSeenAt: new Date(now),
    expiresAt: new Date(now + INACTIVITY_MS),
    absoluteExpiresAt: new Date(now + ABSOLUTE_MS),
  })

  res.cookie(SESSION_COOKIE, raw, cookieOptions())
  return raw
}

// get the session from the cookie and push its expiry forward. null if none.
export async function readSession(req) {
  const raw = req.cookies?.[SESSION_COOKIE]
  if (!raw) return null

  const session = await Session.findOne({ tokenHash: hashToken(raw) })
  if (!session) return null

  const now = Date.now()
  if (now >= session.expiresAt.getTime() || now >= session.absoluteExpiresAt.getTime()) {
    await Session.deleteOne({ _id: session._id })
    return null
  }

  // push expiry forward (not past the 24h max), only save if it moved over a minute
  const slid = Math.min(now + INACTIVITY_MS, session.absoluteExpiresAt.getTime())
  if (slid - session.expiresAt.getTime() > 60_000) {
    session.expiresAt = new Date(slid)
    session.lastSeenAt = new Date(now)
    await session.save()
  }

  return session
}

// log out and clear the cookie
export async function destroySession(req, res) {
  const raw = req.cookies?.[SESSION_COOKIE]
  if (raw) await Session.deleteOne({ tokenHash: hashToken(raw) })
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined })
}

// delete all sessions for an officer (password reset / deactivate)
export function destroyAllSessionsFor(officerId) {
  return Session.deleteMany({ officer: officerId })
}
