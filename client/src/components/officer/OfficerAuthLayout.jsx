import { Link } from 'react-router-dom'
import { ArrowLeft, MapPin, ShieldCheck } from 'lucide-react'

import { site } from '../../data/site'
import { navyGlow } from '../../lib/brandBackground'

// Frame for officer login and password pages: dark background, logo, white card.
// Props: title, subtitle, children (form), footer
export default function OfficerAuthLayout({ title, subtitle, children, footer }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12"
      style={navyGlow({ grid: 32, glow: 0.45 })}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-brand-700 shadow-xl shadow-brand-900/40">
            <MapPin size={26} aria-hidden="true" />
          </span>
          <p className="mt-4 text-xl font-bold tracking-tight text-white">{site.name}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-300">
            <ShieldCheck size={13} aria-hidden="true" />
            Staff portal
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-black/40 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}

          <div className="mt-6">{children}</div>

          {footer && <div className="mt-6 border-t border-slate-100 pt-4">{footer}</div>}
        </div>

        <Link
          to="/"
          className="mx-auto mt-6 flex w-fit items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to {site.name}
        </Link>
      </div>
    </div>
  )
}
