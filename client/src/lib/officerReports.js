// Shared stuff for the officer queue and detail pages.

// queue tabs. dot = status colour, group = divider between open and finished
export const QUEUE_TABS = [
  { key: 'needs_review', label: 'Needs Review', dot: 'bg-slate-400', group: 'active' },
  { key: 'in_review', label: 'In Review', dot: 'bg-blue-500', group: 'active' },
  { key: 'in_progress', label: 'In Progress', dot: 'bg-amber-500', group: 'active' },
  { key: 'resolved', label: 'Resolved', dot: 'bg-emerald-500', group: 'done' },
  { key: 'closed', label: 'Closed', dot: 'bg-teal-600', group: 'done' },
  { key: 'rejected', label: 'Rejected', dot: 'bg-stone-400', group: 'done' },
  { key: 'all_active', label: 'All Active', dot: null, group: 'all' },
]

// officer status pill styles
export const OFFICER_STATUS_META = {
  submitted: { dot: 'bg-slate-400', label: 'Needs Review', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  acknowledged: { dot: 'bg-blue-500', label: 'In Review', className: 'bg-blue-100 text-blue-700 ring-blue-200' },
  in_progress: { dot: 'bg-amber-500', label: 'In Progress', className: 'bg-amber-100 text-amber-800 ring-amber-200' },
  resolved: { dot: 'bg-emerald-500', label: 'Resolved', className: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
  closed: { dot: 'bg-teal-600', label: 'Closed', className: 'bg-teal-50 text-teal-800 ring-teal-200' },
  rejected: { dot: 'bg-stone-400', label: 'Rejected', className: 'bg-stone-200 text-stone-700 ring-stone-300' },
  duplicate: { dot: 'bg-stone-400', label: 'Duplicate', className: 'bg-stone-200 text-stone-700 ring-stone-300' },
}

export function officerStatusMeta(status) {
  return OFFICER_STATUS_META[status] || OFFICER_STATUS_META.submitted
}

// priority badge styles (null = no badge)
export const PRIORITY_META = {
  high: { label: 'High', className: 'bg-red-100 text-red-700 ring-red-200' },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-800 ring-amber-200' },
  low: { label: 'Low', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

export const PRIORITY_OPTIONS = ['low', 'medium', 'high']

// AI spam check labels: HIGH / MEDIUM / LOW / UNCLASSIFIED (null shows as unclassified).
// Never shows the raw score.
export const CLASSIFIER_META = {
  HIGH: {
    short: 'Looks genuine',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    level: 'HIGH',
    levelClassName: 'text-emerald-700',
    tooltip: 'Looks like a real street photo',
  },
  MEDIUM: {
    short: 'Unsure',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800 ring-amber-200',
    level: 'MEDIUM',
    levelClassName: 'text-amber-700',
    tooltip: 'Not clearly a street photo — worth a quick look',
  },
  LOW: {
    short: 'Likely spam',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 ring-red-200',
    level: 'LOW',
    levelClassName: 'text-red-700',
    tooltip: 'Does not look like a street photo',
  },
  UNCLASSIFIED: {
    short: 'Not checked',
    dot: 'bg-slate-300',
    badge: 'bg-slate-100 text-slate-500 ring-slate-200',
    level: null,
    levelClassName: 'text-slate-500',
    tooltip: 'Not classified',
  },
}

// names for spam types
export const SPAM_TYPE_LABELS = {
  furniture: 'furniture (chair, sofa, table)',
  chart: 'a chart or trading screenshot',
  screenshot: 'a phone or website screenshot',
  selfie: 'a selfie',
  food: 'food',
  animal: 'an animal',
  document: 'a document or text',
  meme: 'a meme or drawing',
  blank: 'a blank or very blurry image',
  indoor: 'an indoor room',
  landscape: 'a landscape',
  group: 'a photo of people',
  person: 'a person or selfie',
  artwork: 'a meme, cartoon or drawing',
  product: 'a product photo',
  nature: 'a field or nature scene',
}

export function classifierMeta(result) {
  return CLASSIFIER_META[result] || CLASSIFIER_META.UNCLASSIFIED
}

// explanation next to the classifier result
export const CLASSIFIER_INFO =
  'This is an advisory hint from an automated system. You always make the final decision. If the classifier is unavailable, this field will be blank — that does not affect the report.'

// classifier filter options
export const CLASSIFIER_FILTERS = [
  { value: 'all', label: 'All results' },
  { value: 'high', label: 'Looks genuine' },
  { value: 'medium', label: 'Unsure' },
  { value: 'low', label: 'Likely spam' },
  { value: 'unclassified', label: 'Unclassified' },
]

// status buttons an officer gets for each status (same as backend ALLOWED_TRANSITIONS).
// kind = button style, confirm = ask first, goesPublic = show public warning.
// Reject is separate.
export function nextTransitions(status) {
  switch (status) {
    case 'submitted':
      return [
        {
          to: 'acknowledged',
          label: 'Move to In Review',
          kind: 'primary',
          confirm: true,
          goesPublic: true,
        },
      ]
    case 'acknowledged':
      return [
        { to: 'in_progress', label: 'Move to In Progress', kind: 'primary' },
        { to: 'submitted', label: 'Send back to Submitted', kind: 'secondary' },
      ]
    case 'in_progress':
      return [
        { to: 'resolved', label: 'Mark Resolved', kind: 'primary' },
        { to: 'acknowledged', label: 'Back to In Review', kind: 'secondary' },
      ]
    case 'resolved':
      return [
        { to: 'closed', label: 'Close', kind: 'primary', confirm: true },
        { to: 'in_progress', label: 'Reopen (not resolved)', kind: 'secondary' },
      ]
    case 'closed':
    default:
      return []
  }
}

// can only reject from Submitted or In Review
export function canReject(status) {
  return status === 'submitted' || status === 'acknowledged'
}

// reject reasons ("other" needs text)
export const REJECT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'out_of_scope', label: 'Out of scope' },
  { value: 'other', label: 'Other' },
]

export function rejectReasonLabel(value) {
  return REJECT_REASONS.find((r) => r.value === value)?.label ?? 'Other'
}
