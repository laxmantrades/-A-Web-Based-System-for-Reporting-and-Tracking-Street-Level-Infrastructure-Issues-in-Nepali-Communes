import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { navyGlow } from '../lib/brandBackground'

// Navy header for inner pages. Content below should use -mt-16 (or <PageBody>)
// so the first card overlaps it.
// Props: eyebrow, title, subtitle, back { to, label }, aside, children,
// width (default max-w-6xl)
export default function PageHero({
  eyebrow,
  title,
  subtitle,
  back,
  aside,
  children,
  width = 'max-w-6xl',
}) {
  return (
    <section className="bg-slate-950 text-white" style={navyGlow()}>
      <div className={`mx-auto w-full ${width} px-4 pb-28 pt-10 sm:px-6 sm:pt-14`}>
        {back && (
          <Link
            to={back.to}
            className="mb-6 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-200 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
            {subtitle && (
              <p className="mt-3 max-w-2xl text-base text-slate-300 sm:text-lg">{subtitle}</p>
            )}
          </div>
          {aside}
        </div>
        {children}
      </div>
    </section>
  )
}

// content column that overlaps the PageHero
export function PageBody({ children, width = 'max-w-6xl', className = '' }) {
  return (
    <div className={`relative mx-auto -mt-16 w-full ${width} px-4 pb-20 sm:px-6 ${className}`}>
      {children}
    </div>
  )
}
