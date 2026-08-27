import { Link } from 'react-router-dom'
import { Construction } from 'lucide-react'

/**
 * Placeholder for routes that are linked from the homepage but not built yet
 * (report form, tracking view, officer dashboard). Keeps the nav links from
 * dead-ending while the rest of the app is under construction.
 *
 * Props:
 *   - title: name of the screen that will live here
 */
export default function ComingSoon({ title }) {
  return (
    <section className="section-shell flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Construction size={28} aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-3 max-w-md text-ink-soft">
        This screen is part of the project plan and will be built in a later
        sprint. For now, only the homepage is ready.
      </p>
      <Link to="/" className="btn-ghost mt-8">
        Back to homepage
      </Link>
    </section>
  )
}
