import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

/**
 * Closing call to action just above the footer.
 */
export default function CtaBanner() {
  return (
    <section className="py-20">
      <div className="section-shell">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            See a problem on your street?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-ink-soft">
            Reporting it takes about a minute and helps your ward office see
            what needs fixing first.
          </p>
          <Link to="/report" className="btn-primary mx-auto mt-8">
            Report an issue
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
