import { asyncHandler } from './errorHandler.js'
import { User, STAFF_ROLES } from '../models/User.js'
import { readSession } from '../lib/officerSession.js'

// Checks officer login on every officer route.
// No/expired session or inactive officer -> 401.
// Sets req.officer and req.session.
export const requireOfficer = asyncHandler(async (req, res, next) => {
  const session = await readSession(req)
  if (!session) {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
    return
  }

  const officer = await User.findById(session.officer).select('+passwordHash')
  if (!officer || !officer.isActive || !STAFF_ROLES.includes(officer.role)) {
    res.status(401).json({ error: 'Your session is no longer valid. Please sign in again.' })
    return
  }

  req.officer = officer
  req.session = session
  next()
})

// Only allows a certain role. Use after requireOfficer.
//   router.get('/admin/x', requireOfficer, requireRole('admin'), handler)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.officer || !roles.includes(req.officer.role)) {
      res.status(403).json({ error: 'You do not have access to this action.' })
      return
    }
    next()
  }
}
