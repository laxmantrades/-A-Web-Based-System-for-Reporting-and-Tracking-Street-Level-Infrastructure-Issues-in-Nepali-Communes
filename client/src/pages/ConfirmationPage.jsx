import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, CheckCircle2, Search } from 'lucide-react'

import { steps } from '../data/steps'
import { navyGlow } from '../lib/brandBackground'
import PageHero, { PageBody } from '../components/PageHero'

// shown after submitting. Number comes from the URL (?id=142),
// so refresh works and nothing personal is saved
export default function ConfirmationPage() {
  const [params] = useSearchParams()
  const referenceId = params.get('id')

  if (!referenceId) {
    return (
      <>
        <PageHero
          eyebrow="Report an issue"
          title="We couldn’t find your report details"
          subtitle="If you just submitted a report, check your email for the confirmation. Otherwise you can start a new report."
        />
        <PageBody width="max-w-3xl">
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <Link to="/report" className="btn-primary">
              Report an issue
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </PageBody>
      </>
    )
  }

  return (
    <>
      <section className="bg-slate-950 text-white" style={navyGlow()}>
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-32 pt-14 text-center sm:px-6 sm:pt-16">
          <span className="relative grid h-20 w-20 place-items-center">
            <span className="absolute inset-0 rounded-full bg-emerald-400/30 motion-safe:animate-ping" />
            <span className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-500/30">
              <CheckCircle2 size={40} aria-hidden="true" />
            </span>
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Report submitted!
          </h1>
          <p className="mt-3 max-w-xl text-base text-slate-300 sm:text-lg">
            Thank you for helping fix your street. Your ward office can now see it.
          </p>
        </div>
      </section>

      <PageBody width="max-w-3xl">
        <div className="rounded-3xl bg-white p-6 text-center shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Your report number
          </p>
          <p className="mt-2 text-5xl font-extrabold tracking-tight text-ink sm:text-6xl">
            #{referenceId}
          </p>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-ink-soft">
            We’ve emailed you a confirmation. You’ll get an email whenever the status
            changes, and you can check progress any time on the Track page with the
            email you gave — no account needed.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/track" className="btn-primary px-6">
              <Search size={16} aria-hidden="true" />
              Track your report
            </Link>
            <Link to="/report" className="btn-ghost px-6">
              Report another issue
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-sm font-bold text-ink">What happens next</h2>
          <ol className="mt-5 space-y-5">
            {steps.map((step, i) => {
              const done = i === 0
              return (
                <li key={step.id} className="flex gap-4">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {done ? (
                      <Check size={18} strokeWidth={3} aria-hidden="true" />
                    ) : (
                      <step.Icon size={18} aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {step.title}
                      {done && (
                        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Done
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>
                  </div>
                </li>
              )
            })}
          </ol>
          <Link
            to="/reports"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
          >
            See what others have reported
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </PageBody>
    </>
  )
}
