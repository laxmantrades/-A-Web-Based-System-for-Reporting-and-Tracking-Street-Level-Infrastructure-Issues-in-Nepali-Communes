import { BadgeCheck, Clock3, LayoutGrid, Timer } from 'lucide-react'

import { site } from '../data/site'

// icon + colour for each stat, same order as site.stats
const DECOR = [
  { Icon: LayoutGrid, tint: 'from-brand-500 to-brand-700 shadow-brand-500/30' },
  { Icon: Timer, tint: 'from-amber-400 to-orange-500 shadow-orange-500/30' },
  { Icon: Clock3, tint: 'from-blue-500 to-indigo-600 shadow-blue-500/30' },
  { Icon: BadgeCheck, tint: 'from-emerald-500 to-teal-600 shadow-emerald-500/30' },
]

// stats card under the hero (values in data/site.js)
export default function Stats() {
  return (
    <section className="relative z-10 -mt-24 lg:-mt-28">
      <div className="section-shell">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-slate-200 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200 lg:grid-cols-4">
          {site.stats.map((stat, i) => {
            const decor = DECOR[i % DECOR.length]
            return (
              <div key={stat.label} className="flex items-center gap-4 bg-white p-5 sm:p-7">
                <span
                  className={`hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg sm:grid ${decor.tint}`}
                >
                  <decor.Icon size={22} aria-hidden="true" />
                </span>
                <div>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                    {stat.value}
                  </dd>
                  <dd className="mt-0.5 text-sm text-ink-soft">{stat.label}</dd>
                </div>
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}
