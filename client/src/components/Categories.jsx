import SectionHeading from './SectionHeading'
import { categories } from '../data/categories'

/**
 * Grid of the six things a citizen can report. The list is fixed on purpose:
 * the project scope is physical street infrastructure only (no welfare,
 * healthcare, noise or emergencies).
 */
export default function Categories() {
  return (
    <section id="categories" className="bg-slate-50 py-20">
      <div className="section-shell">
        <SectionHeading eyebrow="What you can report" title="Six kinds of street problem">
          Pick the one that fits best. If you are unsure, choose the closest —
          the ward officer can re-classify it.
        </SectionHeading>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li
              key={category.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <category.Icon size={24} aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold text-ink">{category.label}</h3>
              <p className="mt-1 text-sm text-ink-soft">{category.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
