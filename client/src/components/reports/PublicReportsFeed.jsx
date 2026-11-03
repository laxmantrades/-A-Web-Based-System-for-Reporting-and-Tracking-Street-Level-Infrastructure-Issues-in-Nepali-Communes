import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { fetchPublicReports } from '../../lib/reportsApi'
import ReportCard from './ReportCard'
import ReportFilters from './ReportFilters'

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="aspect-[4/3] w-full animate-pulse bg-slate-100" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  )
}

function CardGrid({ children }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  )
}

function Section({ title, description, reports, hasMore, loading }) {
  const [showMoreNote, setShowMoreNote] = useState(false)

  return (
    <section className="mt-12 first:mt-0">
      <h2 className="text-2xl font-bold tracking-tight text-ink">{title}</h2>
      <p className="mt-1 text-ink-soft">{description}</p>

      <div className="mt-6">
        {loading ? (
          <CardGrid>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </CardGrid>
        ) : reports.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-ink-soft">
            Nothing to show here right now.
          </p>
        ) : (
          <CardGrid>
            {reports.map((report) => (
              <ReportCard key={report.referenceId} report={report} />
            ))}
          </CardGrid>
        )}
      </div>

      {!loading && hasMore && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowMoreNote(true)}
            className="text-sm font-semibold text-brand-700 underline"
          >
            View more
          </button>
          {showMoreNote && (
            <p className="mt-2 text-xs text-ink-soft">
              Showing the 20 most recent. Pagination is coming soon.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

// public feed: filters (in the URL) + Latest and Recently resolved.
// Used by /reports and /track
export default function PublicReportsFeed() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || 'all'
  const status = params.get('status') || 'all'
  const filtersActive = category !== 'all' || status !== 'all'
  const key = `${category}|${status}`

  const [loaded, setLoaded] = useState(null)

  useEffect(() => {
    let alive = true
    fetchPublicReports({ category, status })
      .then((data) => alive && setLoaded({ key, status: 'ok', data }))
      .catch((err) => alive && setLoaded({ key, status: 'error', message: err.message }))
    return () => {
      alive = false
    }
  }, [category, status, key])

  const view = loaded && loaded.key === key ? loaded : { status: 'loading' }

  function updateFilters({ category: nextCategory, status: nextStatus }) {
    const next = new URLSearchParams()
    if (nextCategory && nextCategory !== 'all') next.set('category', nextCategory)
    if (nextStatus && nextStatus !== 'all') next.set('status', nextStatus)
    setParams(next, { replace: true })
  }

  const loading = view.status === 'loading'
  const data = view.status === 'ok' ? view.data : null
  const isEmpty =
    data && data.latest.length === 0 && data.resolved.length === 0

  return (
    <>
      <ReportFilters category={category} status={status} onChange={updateFilters} />

      <div className="mt-10">
        {view.status === 'error' && (
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center">
            <p className="text-sm text-brand-800">
              {view.message || 'We couldn’t load reports right now.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary mt-4"
            >
              Try again
            </button>
          </div>
        )}

        {view.status !== 'error' && isEmpty ? (
          filtersActive || (data && data.totalPublic > 0) ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <p className="font-semibold text-ink">No reports match these filters yet</p>
              <p className="mt-1 text-sm text-ink-soft">
                Try clearing filters or check back later.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <p className="font-semibold text-ink">
                No reports yet — be the first to report a street issue
              </p>
              <Link to="/report" className="btn-primary mt-4">
                Report an issue
              </Link>
            </div>
          )
        ) : (
          view.status !== 'error' && (
            <>
              <Section
                title="Latest Reports"
                description="Recently reported issues being reviewed or worked on"
                loading={loading}
                reports={data ? data.latest : []}
                hasMore={data ? data.hasMoreLatest : false}
              />
              <Section
                title="Recently Resolved"
                description="Issues that have been fixed"
                loading={loading}
                reports={data ? data.resolved : []}
                hasMore={data ? data.hasMoreResolved : false}
              />
            </>
          )
        )}
      </div>
    </>
  )
}
