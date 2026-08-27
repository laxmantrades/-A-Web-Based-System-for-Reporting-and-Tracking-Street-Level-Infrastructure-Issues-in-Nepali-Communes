import { Link } from 'react-router-dom'
import { CheckCircle2, HelpCircle, AlertTriangle, Eye } from 'lucide-react'

import SectionHeading from './SectionHeading'

/*
 * The three confidence levels the AI photo check reports to an officer.
 * This is advisory only — it never rejects a report, and citizens never see it.
 */
const confidenceLevels = [
  {
    key: 'match',
    label: 'Likely match',
    detail: 'The photo looks consistent with the chosen category.',
    Icon: CheckCircle2,
    className: 'text-emerald-600 bg-emerald-50',
  },
  {
    key: 'unsure',
    label: 'Unclear',
    detail: 'The model is not confident either way — worth a closer look.',
    Icon: HelpCircle,
    className: 'text-amber-600 bg-amber-50',
  },
  {
    key: 'mismatch',
    label: 'Possible mismatch',
    detail: 'The photo may not show the chosen category.',
    Icon: AlertTriangle,
    className: 'text-brand-700 bg-brand-50',
  },
]

/**
 * Explains the AI-assisted photo validation feature to ward officers.
 * Key message repeated by design: the AI is a hint, a human decides.
 */
export default function OfficerSection() {
  return (
    <section id="officers" className="py-20">
      <div className="section-shell grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            eyebrow="For ward officers"
            title="An AI photo check that assists — never decides"
            align="left"
          >
            When a report arrives, a zero-shot image model compares the photo
            with the category the citizen picked and shows you one of three
            flags. You always make the final call.
          </SectionHeading>

          <ul className="mt-8 space-y-3">
            {confidenceLevels.map((level) => (
              <li
                key={level.key}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${level.className}`}>
                  <level.Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-ink">{level.label}</p>
                  <p className="text-sm text-ink-soft">{level.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-6 flex items-center gap-2 text-sm text-ink-soft">
            <Eye size={16} aria-hidden="true" />
            This flag is shown to officers only. Citizens never see it, and a
            wrong guess just means you review the report as normal.
          </p>

          <Link to="/officer" className="btn-primary mt-8">
            Open the officer dashboard
          </Link>
        </div>

        {/* Mock dashboard row */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
          <p className="text-sm font-semibold text-ink">Incoming reports</p>
          <div className="mt-4 space-y-3">
            {[
              { cat: 'Streetlight', ward: 'Ward 3', flag: confidenceLevels[0] },
              { cat: 'Pothole', ward: 'Ward 5', flag: confidenceLevels[1] },
              { cat: 'Drain', ward: 'Ward 9', flag: confidenceLevels[2] },
            ].map((row) => (
              <div
                key={row.ward}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-300" />
                  <div>
                    <p className="text-sm font-medium text-ink">{row.cat}</p>
                    <p className="text-xs text-ink-soft">{row.ward}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${row.flag.className}`}
                >
                  <row.flag.Icon size={13} aria-hidden="true" />
                  {row.flag.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
