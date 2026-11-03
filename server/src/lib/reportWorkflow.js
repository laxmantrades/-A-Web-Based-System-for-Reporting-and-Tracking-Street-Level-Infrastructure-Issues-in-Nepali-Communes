// Officer review steps.
//   submitted, acknowledged ("In Review"), in_progress, resolved, closed, rejected
// "duplicate" is only a rejection reason now.

export const STATUS = {
  SUBMITTED: 'submitted',
  IN_REVIEW: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REJECTED: 'rejected',
}

// labels for messages
export const STATUS_LABEL = {
  submitted: 'Submitted',
  acknowledged: 'In Review',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
  duplicate: 'Rejected',
}

// which status can move to which. Anything else is rejected.
export const ALLOWED_TRANSITIONS = {
  submitted: ['acknowledged', 'rejected'],
  acknowledged: ['in_progress', 'rejected', 'submitted'],
  in_progress: ['resolved', 'acknowledged'],
  resolved: ['closed', 'in_progress'],
  closed: [],
  rejected: [],
  duplicate: [],
}

export function canTransition(from, to) {
  return Boolean(ALLOWED_TRANSITIONS[from]?.includes(to))
}

// can only reject from Submitted or In Review
export function canReject(from) {
  return canTransition(from, 'rejected')
}

// these show on the public feed
const PUBLIC_STATUSES = new Set(['acknowledged', 'in_progress', 'resolved', 'closed'])
export function isPublicStatus(status) {
  return PUBLIC_STATUSES.has(status)
}

// order, to know if a move is forward (forward = email citizen)
const RANK = {
  submitted: 0,
  acknowledged: 1,
  in_progress: 2,
  resolved: 3,
  closed: 4,
}
export function rankOf(status) {
  return RANK[status] ?? -1
}

// should moving to `to` email the citizen? Forward moves to In Review / In Progress /
// Resolved / Closed and any Rejected do. Going backwards doesn't.
export function emailsCitizen(from, to) {
  if (to === 'rejected' || to === 'duplicate') return true
  if (!['acknowledged', 'in_progress', 'resolved', 'closed'].includes(to)) return false
  return rankOf(to) > rankOf(from)
}

// Submitted -> In Review is when a report becomes public
export function becomesPublic(from, to) {
  return !isPublicStatus(from) && isPublicStatus(to)
}

export const REJECTION_REASONS = ['spam', 'duplicate', 'out_of_scope', 'other']

export const REJECTION_REASON_LABEL = {
  spam: 'spam',
  duplicate: 'a duplicate of another report',
  out_of_scope: 'outside what this service handles',
  other: 'other',
}

// short rejection text for the citizen. detail is required when reason is "other"
export function rejectionMessage(reason, detail = '') {
  const clean = String(detail || '').trim()
  switch (reason) {
    case 'spam':
      return 'After review, this report was not accepted because it does not describe a street-maintenance problem.'
    case 'duplicate':
      return 'This report was not accepted because it matches another report already in our system, which we are tracking.'
    case 'out_of_scope':
      return 'This report was not accepted because the issue falls outside what this service is able to act on.'
    case 'other':
    default:
      return clean
        ? `This report was not accepted for the following reason: ${clean}`
        : 'This report was reviewed and was not accepted for action.'
  }
}
