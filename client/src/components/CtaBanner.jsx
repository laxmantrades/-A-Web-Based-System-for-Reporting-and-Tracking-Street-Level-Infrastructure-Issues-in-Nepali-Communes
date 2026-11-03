import { Link } from 'react-router-dom'
import { ArrowRight, Camera, MapPin, Send } from 'lucide-react'

import { navyGlow } from '../lib/brandBackground'

const QUICK_STEPS = [
  { Icon: Camera, label: 'Snap a photo' },
  { Icon: MapPin, label: 'Drop a pin' },
  { Icon: Send, label: 'Send it' },
]

// call to action above the footer
export default function CtaBanner() {
  return (
    <section className="py-24">
      <div className="section-shell">
        <div
          className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-16 text-center text-white shadow-2xl shadow-slate-900/20 sm:px-12"
          style={navyGlow({ grid: 32, glow: 0.45 })}
        >
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">
            See a problem on your street?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            Reporting it takes about a minute and helps your ward office see what
            needs fixing first.
          </p>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {QUICK_STEPS.map((step, i) => (
              <li
                key={step.label}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium ring-1 ring-inset ring-white/15"
              >
                <span className="text-xs font-bold text-brand-300">{i + 1}</span>
                <step.Icon size={15} aria-hidden="true" />
                {step.label}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/report"
              className="btn-primary px-7 py-3.5 text-base shadow-lg shadow-brand-900/40 focus-visible:ring-offset-slate-950"
            >
              Report an issue
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              to="/reports"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-7 py-3.5 text-base font-semibold text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              See community reports
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
