import { Link } from 'react-router-dom'

import Logo from './Logo'
import { site } from '../data/site'

/**
 * Site footer. Kept intentionally light for the prototype — the important
 * part is a clear line that this is a student project, not a live service.
 */
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-800 bg-ink text-white">
      <div className="section-shell grid gap-10 py-14 md:grid-cols-3">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-sm text-white/70">{site.description}</p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-white/60">
            On this page
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {site.nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-white/80 hover:text-white">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-white/60">
            Get started
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to="/report" className="text-white/80 hover:text-white">
                Report an issue
              </Link>
            </li>
            <li>
              <Link to="/track" className="text-white/80 hover:text-white">
                Track a report
              </Link>
            </li>
            <li>
              <Link to="/officer" className="text-white/80 hover:text-white">
                Officer dashboard
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="section-shell flex flex-col gap-2 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}. Student prototype — not an official government
            service.
          </p>
          <p>BSc (Hons) Computer Science final-year project.</p>
        </div>
      </div>
    </footer>
  )
}
