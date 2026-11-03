import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, Mail, Search } from 'lucide-react'

import { lookupReports } from '../lib/reportsApi'
import { site } from '../data/site'
import ReportView from '../components/track/ReportView'
import PublicReportsFeed from '../components/reports/PublicReportsFeed'
import PageHero, { PageBody } from '../components/PageHero'

// same message for every error
const LOOKUP_FAIL =
  "We couldn't find any reports for that email. Please check it and try again."
const RATE_LIMITED = 'Too many attempts. Please wait a minute and try again.'

// Track page. Shows the public feed, or your reports after an email lookup.
export default function TrackReport() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reports, setReports] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    setError('')

    if (!email.trim()) {
      setError(LOOKUP_FAIL)
      return
    }

    setBusy(true)
    try {
      const found = await lookupReports({ email: email.trim() })
      setReports(found)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.rateLimited ? RATE_LIMITED : LOOKUP_FAIL)
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setReports(null)
    setEmail('')
    setError('')
  }

  // ---- your reports ----
  if (reports) {
    return (
      <>
        <PageHero
          eyebrow="Track a report"
          title={reports.length === 1 ? 'Your report' : `Your reports (${reports.length})`}
          subtitle="Here’s where each of your reports stands. Every change by the ward office shows up here."
          aside={
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/15 print:hidden"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back to all reports
            </button>
          }
        />

        <PageBody width="max-w-5xl">
          <div className="space-y-6">
            {reports.map((report) => (
              <article
                key={report.reportId}
                className="rounded-3xl bg-white p-5 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 print:break-inside-avoid sm:p-8"
              >
                <ReportView report={report} />
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:px-8 print:hidden">
            <p className="text-sm text-ink-soft">
              Concerns about a report or a photo?{' '}
              <a
                href={`mailto:${site.contactEmail}`}
                className="font-semibold text-brand-700 hover:underline"
              >
                Contact us
              </a>
            </p>
            <Link to="/report" className="btn-primary">
              Report another issue
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </PageBody>
      </>
    )
  }

  // ---- email lookup + public feed ----
  return (
    <>
      <PageHero
        eyebrow="Track a report"
        title="Follow the fix"
        subtitle="Look up your own reports with the email you used, or browse what’s been reported across the city."
      />

      <PageBody>
        <div className="rounded-3xl bg-white p-5 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/30 sm:grid">
              <Mail size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-ink">Find your own reports</h2>
              <p className="mt-0.5 text-sm text-ink-soft">
                Enter the email you used when you submitted to see full status and history.
              </p>

              <form onSubmit={handleSubmit} noValidate className="mt-5">
                {error && (
                  <div
                    role="alert"
                    className="mb-4 flex items-start gap-2 rounded-2xl bg-brand-50 p-4 text-sm text-brand-800 ring-1 ring-brand-200"
                  >
                    <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                <fieldset disabled={busy} className="flex flex-col gap-3 sm:flex-row">
                  <label htmlFor="email" className="sr-only">
                    Email
                  </label>
                  <div className="relative flex-1">
                    <Mail
                      size={18}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="The email you used to submit"
                      className="min-h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-11 pr-3.5 text-ink outline-none transition-colors placeholder:text-slate-400 hover:bg-white focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary min-h-[52px] rounded-xl px-6 text-base shadow-lg shadow-brand-600/25"
                  >
                    <Search size={18} aria-hidden="true" />
                    {busy ? 'Looking up…' : 'Look up'}
                  </button>
                </fieldset>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <PublicReportsFeed />
        </div>
      </PageBody>
    </>
  )
}
