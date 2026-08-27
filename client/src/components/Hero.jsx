import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, ShieldCheck } from 'lucide-react'

import { site } from '../data/site'

/**
 * Top-of-page hero: the one-line pitch plus the two primary actions.
 *
 * The right-hand card is a static mock of a report so a first-time visitor
 * immediately sees what "a report" looks like.
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
      <div className="section-shell grid gap-12 py-16 md:grid-cols-2 md:items-center md:py-24">
        {/* Left: message + actions */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700">
            <MapPin size={14} aria-hidden="true" />
            Built for wards in Nepal
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
            {site.tagline}
          </h1>

          <p className="mt-4 max-w-lg text-lg text-ink-soft">
            {site.description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/report" className="btn-primary">
              Report an issue
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/track" className="btn-ghost">
              Track an existing report
            </Link>
          </div>

          <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
            <ShieldCheck size={16} aria-hidden="true" />
            No account needed to report. No office visit.
          </p>
        </div>

        {/* Right: sample report card (decorative, not interactive) */}
        <div className="relative">
          <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-slate-200 to-slate-300" />
            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                Pothole
              </span>
              <span className="text-xs font-medium text-ink-soft">
                Ward 5 · Reported today
              </span>
            </div>
            <p className="mt-3 text-sm text-ink">
              Deep pothole near the school gate, hard to avoid on a bike.
            </p>
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Status
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-ink">
                  Acknowledged by ward officer
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
