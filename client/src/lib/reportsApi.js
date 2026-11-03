// Sends a citizen report to the backend (POST /api/reports, form data
// because of the photo). Returns { reportId, referenceId }.
export async function submitReport(report) {
  const body = new FormData()
  body.set('category', report.category)
  if (report.lat != null && report.lng != null) {
    body.set('lat', String(report.lat))
    body.set('lng', String(report.lng))
  }
  body.set('locationDescription', report.locationDescription ?? '')
  body.set('address', report.address ?? '')
  body.set('note', report.note ?? '')
  body.set('email', report.email)
  body.set('photo', report.photo)

  let res
  try {
    res = await fetch('/api/reports', { method: 'POST', body })
  } catch {
    throw new Error(
      'We could not reach the server. Check your connection and try again in a moment.',
    )
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(
      data.error ||
        `Something went wrong on our side (error ${res.status}). Please try again in a moment.`,
    )
  }

  return data
}

// get all reports for an email. Any error -> one generic message.
export async function lookupReports({ email }) {
  let res
  try {
    res = await fetch('/api/reports/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
  } catch {
    throw new Error('lookup-failed')
  }
  if (res.status === 429) {
    const err = new Error('rate-limited')
    err.rateLimited = true
    throw err
  }
  if (!res.ok) throw new Error('lookup-failed')
  const data = await res.json()
  return data.reports
}

// public feed: latest + resolved lists, optional filters
export async function fetchPublicReports({ category, status } = {}) {
  const params = new URLSearchParams()
  if (category && category !== 'all') params.set('category', category)
  if (status && status !== 'all') params.set('status', status)
  const qs = params.toString()

  let res
  try {
    res = await fetch(`/api/reports/public${qs ? `?${qs}` : ''}`)
  } catch {
    throw new Error('We could not reach the server. Please try again in a moment.')
  }
  if (!res.ok) throw new Error('Something went wrong loading reports.')
  return res.json()
}

// one public report by number. Not found -> err.notFound
export async function fetchPublicReport(referenceId) {
  let res
  try {
    res = await fetch(`/api/reports/public/${encodeURIComponent(referenceId)}`)
  } catch {
    throw new Error('We could not reach the server. Please try again in a moment.')
  }
  if (res.status === 404) {
    const err = new Error('That report is not available.')
    err.notFound = true
    throw err
  }
  if (!res.ok) throw new Error('Something went wrong loading this report.')
  const data = await res.json()
  return data.report
}
