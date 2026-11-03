import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import SectionHeading from './SectionHeading'
import { categories } from '../data/categories'

// The six report types. Clicking one starts a report with it picked.
export default function Categories() {
  return (
    <section id="categories" className="scroll-mt-20 bg-slate-50 py-24">
      <div className="section-shell">
        <SectionHeading eyebrow="What you can report" title="Six kinds of street problem">
          Pick the one that fits best. If you are unsure, choose the closest —
          the ward officer can re-classify it.
        </SectionHeading>

        <ul className="mt-14 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                to={`/report?category=${category.id}`}
                className="group flex h-full flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <span
                  className={`grid h-12 w-12 place-items-center rounded-2xl transition-transform group-hover:scale-110 sm:h-14 sm:w-14 ${category.tint}`}
                >
                  <category.Icon size={24} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[15px] font-bold leading-snug text-ink sm:mt-5 sm:text-lg">
                  {category.label}
                </h3>
                {/* phones: two columns, titles only */}
                <p className="mt-1 hidden flex-1 text-sm leading-relaxed text-ink-soft sm:block">
                  {category.description}
                </p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-brand-600 sm:pt-5">
                  Report this
                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
