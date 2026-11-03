import { Link } from 'react-router-dom'
import { ArrowRight, Home, MapPinOff } from 'lucide-react'

import { navyGlow } from '../lib/brandBackground'

// shown for unknown URLs. title = heading
export default function ComingSoon({ title = 'Page not found' }) {
  return (
    <section
      className="flex min-h-[70vh] items-center bg-slate-950 text-white"
      style={navyGlow()}
    >
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:px-6">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-brand-300 ring-1 ring-inset ring-white/15">
          <MapPinOff size={30} aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">
          404
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 text-slate-300">
          This street doesn’t seem to exist. The link may be old, or the address may
          have a typo.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link to="/" className="btn-primary px-6">
            <Home size={16} aria-hidden="true" />
            Back to homepage
          </Link>
          <Link
            to="/report"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/15"
          >
            Report an issue
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
