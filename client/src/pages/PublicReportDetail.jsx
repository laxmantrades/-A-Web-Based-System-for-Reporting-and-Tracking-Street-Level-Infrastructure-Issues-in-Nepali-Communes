import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Clock, Flag, Loader2, MapPin } from 'lucide-react'

import { fetchPublicReport } from '../lib/reportsApi'
import { site } from '../data/site'
import { categories } from '../data/categories'
import { formatDateTime } from '../lib/reportStatus'
import { locationLabel } from '../lib/location'
import ReportView from '../components/track/ReportView'
import StatusBadge from '../components/track/StatusBadge'
import PageHero, { PageBody } from '../components/PageHero'

function takedownMailto(referenceId) {
  const subject = `Problem with report #${referenceId}`
  const body = [
    `I'd like to report a problem with report #${referenceId}.`,
    '',
    'Please describe the issue (for example: I appear in the photo and want it',
    'removed / the photo is inappropriate / the report is fake or malicious):',
    '',
  ].join('\n')
  return `mailto:${site.moderationEmail}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`
}

export default function PublicReportDetail() {
  const { referenceId } = useParams()
  const [loaded, setLoaded] = useState(null)

  useEffect(() => {
    let alive = true
    fetchPublicReport(referenceId)
      .then((report) => alive && setLoaded({ forId: referenceId, status: 'ok', report }))
      .catch(
        (err) =>
          alive &&
          setLoaded({
            forId: referenceId,
            status: err.notFound ? 'notfound' : 'error',
            message: err.message,
          }),
      )
    return () => {
      alive = false
    }
  }, [referenceId])

  const view = loaded && loaded.forId === referenceId ? loaded : { status: 'loading' }

  const back = { to: '/reports', label: 'Community reports' }

  if (view.status === 'loading') {
    return (
      <>
        <PageHero back={back} eyebrow="Community report" title="Loading report…" />
        <PageBody width="max-w-5xl">
          <div className="flex items-center justify-center gap-2 rounded-3xl bg-white py-24 text-ink-soft shadow-sm ring-1 ring-slate-200">
            <Loader2 size={18} className="animate-spin text-brand-600" aria-hidden="true" />
            Loading report…
          </div>
        </PageBody>
      </>
    )
  }

  if (view.status === 'notfound' || view.status === 'error') {
    return (
      <>
        <PageHero
          back={back}
          eyebrow="Community report"
          title={
            view.status === 'notfound'
              ? 'That report isn’t available'
              : 'We couldn’t load this report'
          }
        />
        <PageBody width="max-w-5xl">
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-ink-soft">
              {view.status === 'notfound'
                ? 'It may have been removed, or it isn’t shown publicly.'
                : view.message || 'Please try again in a moment.'}
            </p>
            <Link to="/reports" className="btn-primary mt-6">
              Browse community reports
            </Link>
          </div>
        </PageBody>
      </>
    )
  }

  const report = view.report
  const category = categories.find((c) => c.id === report.category)

  return (
    <>
      <PageHero
        back={back}
        width="max-w-5xl"
        eyebrow={`Report #${report.referenceId}`}
        title={
          <span className="flex items-center gap-3">
            {category && (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15">
                <category.Icon size={24} aria-hidden="true" />
              </span>
            )}
            {category?.label ?? report.category}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={16} className="shrink-0" aria-hidden="true" />
              {locationLabel(report)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={16} aria-hidden="true" />
              Reported {formatDateTime(report.createdAt)}
            </span>
          </span>
        }
        aside={<StatusBadge status={report.status} />}
      />

      <PageBody width="max-w-5xl">
        <div className="rounded-3xl bg-white p-5 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 print:break-inside-avoid sm:p-8">
          <ReportView report={report} showHeader={false} />
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:px-8">
          <p className="text-sm text-ink-soft">
            Spotted something similar on your street?{' '}
            <Link to="/report" className="font-semibold text-brand-700 hover:underline">
              Report an issue
            </Link>
          </p>
          <a
            href={takedownMailto(report.referenceId)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ink"
          >
            <Flag size={15} aria-hidden="true" />
            Report a problem with this report
          </a>
        </div>
      </PageBody>
    </>
  )
}
