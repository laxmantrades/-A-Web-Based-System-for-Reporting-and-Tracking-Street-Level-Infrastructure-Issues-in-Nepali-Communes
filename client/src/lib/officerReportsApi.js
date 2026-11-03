// Officer dashboard API calls. Sends the login cookie.
// 401 -> .unauthorized, 409 -> .conflict (someone else changed it first)

export async function officerFetch(path, { method = 'GET', body } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  let res
  try {
    res = await fetch(path, {
      method,
      credentials: 'include',
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    })
  } catch {
    throw new Error('We could not reach the server. Please try again in a moment.')
  }

  const data = await res.json().catch(() => ({}))

  if (res.status === 401) {
    const err = new Error(data.error || 'Your session has expired. Please sign in again.')
    err.unauthorized = true
    throw err
  }
  if (res.status === 409) {
    const err = new Error(
      data.error ||
        'This report was updated by another officer. Refresh to see the current state.',
    )
    err.conflict = true
    throw err
  }
  if (res.status === 403) {
    throw new Error(data.error || 'You do not have access to this action.')
  }
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.')
  }
  return data
}

/* reads */

export function fetchOfficerQueue({ tab, category, priority, classifier, sort, page } = {}) {
  const qs = new URLSearchParams()
  if (tab) qs.set('tab', tab)
  if (category && category !== 'all') qs.set('category', category)
  if (priority && priority !== 'all') qs.set('priority', priority)
  if (classifier && classifier !== 'all') qs.set('classifier', classifier)
  if (sort) qs.set('sort', sort)
  if (page && page > 1) qs.set('page', String(page))
  const s = qs.toString()
  return officerFetch(`/api/officer/reports${s ? `?${s}` : ''}`)
}

// analytics for the last 7, 30 or 90 days
export function fetchOfficerAnalytics(days) {
  return officerFetch(`/api/officer/analytics?days=${encodeURIComponent(days)}`)
}

export function fetchOfficerReport(id) {
  return officerFetch(`/api/officer/reports/${encodeURIComponent(id)}`)
}

export function fetchOfficerReportAudit(id) {
  return officerFetch(`/api/officer/reports/${encodeURIComponent(id)}/audit`)
}

// run the classifier again
export function reclassifyOfficerReport(id) {
  return officerFetch(`/api/officer/reports/${encodeURIComponent(id)}/reclassify`, {
    method: 'POST',
  })
}

/* actions */

// change status { to, expectedStatus, publicNote?, internalNote? }
export function changeReportState(id, body) {
  return officerFetch(`/api/officer/reports/${encodeURIComponent(id)}/state`, {
    method: 'POST',
    body,
  })
}

// reject { reason, detail?, expectedStatus, publicNote? }
export function rejectOfficerReport(id, body) {
  return officerFetch(`/api/officer/reports/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body,
  })
}

export function setOfficerReportPriority(id, priority) {
  return officerFetch(`/api/officer/reports/${encodeURIComponent(id)}/priority`, {
    method: 'POST',
    body: { priority },
  })
}

export function setOfficerReportPhotoHidden(id, hidden) {
  return officerFetch(`/api/officer/reports/${encodeURIComponent(id)}/photo/hide`, {
    method: 'POST',
    body: { hidden },
  })
}

// save redaction boxes (pixels of the original image)
export function saveOfficerReportRedaction(id, rectangles) {
  return officerFetch(`/api/officer/reports/${encodeURIComponent(id)}/redact`, {
    method: 'POST',
    body: { rectangles },
  })
}

// remove the redaction
export function removeOfficerReportRedaction(id) {
  return officerFetch(`/api/officer/reports/${encodeURIComponent(id)}/redact`, {
    method: 'DELETE',
  })
}

export function addOfficerReportNote(id, { type, text }) {
  return officerFetch(`/api/officer/reports/${encodeURIComponent(id)}/notes`, {
    method: 'POST',
    body: { type, text },
  })
}

export function bulkRejectOfficerReports(ids, reason, detail) {
  return officerFetch('/api/officer/reports/bulk-reject', {
    method: 'POST',
    body: { ids, reason, detail },
  })
}
