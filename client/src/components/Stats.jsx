import { site } from '../data/site'

/**
 * Small band of headline figures. Values live in `src/data/site.js`.
 * These are placeholders for the prototype — wire them to real counts later.
 */
export default function Stats() {
  return (
    <section className="bg-brand-600 py-14 text-white">
      <div className="section-shell grid gap-8 sm:grid-cols-3">
        {site.stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-4xl font-extrabold tracking-tight">{stat.value}</p>
            <p className="mt-2 text-sm text-white/80">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
