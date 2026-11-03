import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Clock, EyeOff, MapPin } from 'lucide-react'

import { categories } from '../../data/categories'
import { formatRelative } from '../../lib/reportStatus'
import { locationLabel } from '../../lib/location'
import StatusBadge from '../track/StatusBadge'

// one public report card, links to its detail page. No note, email or priority.
export default function ReportCard({ report }) {
  const category = categories.find((c) => c.id === report.category)
  const hidden = report.photoStatus === 'hidden'
  // old photos may not load, show the category tile instead
  const [failed, setFailed] = useState(false)
  const showPhoto = !hidden && report.photoUrl && !failed

  return (
    <Link
      to={`/reports/${report.referenceId}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {showPhoto ? (
          <img
            src={report.photoUrl}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className={`flex h-full w-full flex-col items-center justify-center gap-2 ${
              category?.tint ?? 'bg-slate-100 text-slate-500'
            }`}
          >
            {hidden ? (
              <>
                <EyeOff size={26} aria-hidden="true" />
                <span className="text-xs font-medium">Photo hidden by moderator</span>
              </>
            ) : (
              category && <category.Icon size={44} strokeWidth={1.5} aria-hidden="true" />
            )}
          </div>
        )}
        {/* shade so the status pill is readable */}
        {showPhoto && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent" />
        )}
        <span className="absolute left-3 top-3">
          <StatusBadge status={report.status} size="sm" />
        </span>
        <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow transition-opacity group-hover:opacity-100">
          <ArrowUpRight size={16} aria-hidden="true" />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2.5">
          {category && (
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${category.tint}`}>
              <category.Icon size={16} aria-hidden="true" />
            </span>
          )}
          <p className="truncate font-bold text-ink">{category?.label ?? report.category}</p>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
          <MapPin size={14} className="shrink-0 text-brand-600" aria-hidden="true" />
          <span className="truncate">{locationLabel(report)}</span>
        </p>

        <p className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} aria-hidden="true" />
            {formatRelative(report.createdAt)}
          </span>
          <span className="font-medium tabular-nums">#{report.referenceId}</span>
        </p>
      </div>
    </Link>
  )
}
