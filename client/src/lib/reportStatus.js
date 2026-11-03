// Turns backend statuses into the five tracking steps and their styles.

export const TRACK_STEPS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'in_review', label: 'In Review' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
]

const STATUS_TO_STEP = {
  submitted: 'submitted',
  acknowledged: 'in_review',
  in_review: 'in_review',
  in_progress: 'in_progress',
  resolved: 'resolved',
  closed: 'closed',
}

const NOT_APPROVED_DEFAULT = {
  rejected: 'This report was reviewed and not approved for action.',
  duplicate:
    'This report was closed because it matches another report already in the system.',
}

// pill colours + dot (same as officer side)
const BADGE_STYLES = {
  submitted: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
  in_review: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  in_progress: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  closed: 'bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200',
  not_approved: 'bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-300',
}

const BADGE_DOTS = {
  submitted: 'bg-slate-400',
  in_review: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  resolved: 'bg-emerald-500',
  closed: 'bg-teal-600',
  not_approved: 'bg-stone-400',
}

export function isNotApproved(status) {
  return status === 'rejected' || status === 'duplicate'
}

export function stepIndexForStatus(status) {
  const key = STATUS_TO_STEP[status]
  return key ? TRACK_STEPS.findIndex((step) => step.key === key) : 0
}

export function badgeFor(status) {
  if (isNotApproved(status)) {
    return {
      label: 'Report not approved',
      className: BADGE_STYLES.not_approved,
      dot: BADGE_DOTS.not_approved,
    }
  }
  const key = STATUS_TO_STEP[status] || 'submitted'
  const step = TRACK_STEPS.find((s) => s.key === key)
  return { label: step.label, className: BADGE_STYLES[key], dot: BADGE_DOTS[key] }
}

// reason for a rejected report: officer's public note, or a default
export function notApprovedReason(status, statusHistory = []) {
  const entry = [...statusHistory].reverse().find((e) => e.status === status)
  return (
    (entry && entry.note) ||
    NOT_APPROVED_DEFAULT[status] ||
    'This report was reviewed and not approved for action.'
  )
}

// one row per step: done / current / future, time, officer note
export function buildTimeline(statusHistory = [], currentIndex) {
  const latestByStep = {}
  for (const event of statusHistory) {
    const key = STATUS_TO_STEP[event.status]
    if (key) latestByStep[key] = event // oldest first, so the last one wins
  }

  return TRACK_STEPS.map((step, i) => {
    const event = latestByStep[step.key]
    const note = event && event.note && event.note !== 'Report created' ? event.note : ''
    return {
      key: step.key,
      label: step.label,
      state: i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'future',
      timestamp: event ? event.changedAt : null,
      note,
    }
  })
}

// "12 Aug, 14:32"
export function formatStamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const month = d.toLocaleString('en-GB', { month: 'short' })
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${month}, ${hh}:${mm}`
}

// "2 days ago" / "just now"
export function formatRelative(iso) {
  if (!iso) return ''
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  const steps = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [30, 'day'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ]
  let value = Math.max(seconds, 0)
  let unit = 'second'
  for (const [size, name] of steps) {
    if (value < size) {
      unit = name
      break
    }
    value = Math.floor(value / size)
  }
  if (unit === 'second' && value < 30) return 'just now'
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`
}

// "12 August 2026, 14:32"
export function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
