import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Flag, MapPin } from 'lucide-react'

import { categories } from '../../data/categories'
import { formatRelative } from '../../lib/reportStatus'
import { classifierMeta, officerStatusMeta, PRIORITY_META } from '../../lib/officerReports'
import { locationLabel } from '../../lib/location'

// columns on wide screens, shared with the header in OfficerQueue
export const QUEUE_COLUMNS =
  'lg:grid lg:grid-cols-[1rem_3.5rem_minmax(0,1fr)_8rem_6.5rem_10.5rem_6.5rem_1rem] lg:gap-4'

const PRIORITY_TEXT = {
  high: 'text-red-600',
  medium: 'text-amber-600',
  low: 'text-slate-500',
}

// coloured left edge for high/medium priority
const PRIORITY_STRIP = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-slate-300',
}

// short age: "now", "5m", "3h", "6d", "2mo", "1y"
function shortAge(iso) {
  const minutes = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${Math.floor(minutes)}m`
  const hours = minutes / 60
  if (hours < 24) return `${Math.floor(hours)}h`
  const days = hours / 24
  if (days < 30) return `${Math.floor(days)}d`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  return `${Math.floor(days / 365)}y`
}

function Thumb({ report, category }) {
  // old photos may not load, show the category tile instead
  const [failed, setFailed] = useState(false)
  const tint = category?.tint ?? 'bg-slate-100 text-slate-500'

  if (report.thumbUrl && !failed) {
    return (
      <img
        src={report.thumbUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
      />
    )
  }
  return (
    <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl ${tint}`}>
      {category ? <category.Icon size={22} aria-hidden="true" /> : null}
    </span>
  )
}

function StatusText({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-slate-700">
      <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
      {status.label}
    </span>
  )
}

function PriorityText({ priority }) {
  if (!priority) return <span className="text-sm text-slate-300">—</span>
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium ${PRIORITY_TEXT[priority]}`}
    >
      <Flag size={13} aria-hidden="true" />
      {PRIORITY_META[priority].label}
    </span>
  )
}

function AiPill({ ai }) {
  return (
    <span
      title={ai.tooltip}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${ai.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ai.dot}`} aria-hidden="true" />
      {ai.short}
    </span>
  )
}

// one report in the queue. Row on wide screens, stacked on small.
// click opens it, checkbox works on its own
export default function QueueRow({ report, selected, onToggle }) {
  const navigate = useNavigate()
  const to = `/officer/reports/${report.id}`
  const status = officerStatusMeta(report.status)
  const ai = classifierMeta(report.classifier)
  const category = categories.find((c) => c.id === report.category)

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(to)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(to)
      }}
      className={[
        'group relative flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors focus:outline-none focus-visible:bg-slate-50 sm:px-5',
        QUEUE_COLUMNS,
        'lg:items-center',
        selected ? 'bg-slate-50' : 'hover:bg-slate-50/80',
      ].join(' ')}
    >
      {report.priority && (
        <span
          className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full ${PRIORITY_STRIP[report.priority]}`}
          aria-hidden="true"
        />
      )}

      <input
        type="checkbox"
        checked={selected}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggle(report.id)}
        aria-label={`Select report #${report.referenceId}`}
        className="h-4 w-4 shrink-0 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
      />

      <Thumb report={report} category={category} />

      {/* title + location (small screens: status too) */}
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="truncate text-[15px] font-semibold text-slate-900 group-hover:text-brand-700">
            {category?.label ?? report.category}
          </span>
          <span className="hidden shrink-0 text-xs font-medium tabular-nums text-slate-400 lg:inline">
            #{report.referenceId}
          </span>
          <span
            className="ml-auto shrink-0 text-xs tabular-nums text-slate-400 lg:hidden"
            title={formatRelative(report.createdAt)}
          >
            {shortAge(report.createdAt)}
          </span>
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[13px] text-slate-500">
          {/* small screens: reference number here */}
          <span className="shrink-0 font-medium tabular-nums text-slate-400 lg:hidden">
            #{report.referenceId} ·
          </span>
          <MapPin size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
          <span className="truncate">{locationLabel(report)}</span>
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 lg:hidden">
          <StatusText status={status} />
          {report.priority && <PriorityText priority={report.priority} />}
          <AiPill ai={ai} />
        </div>
      </div>

      {/* wide screen columns */}
      <div className="hidden lg:block">
        <StatusText status={status} />
      </div>
      <div className="hidden lg:block">
        <PriorityText priority={report.priority} />
      </div>
      <div className="hidden lg:block">
        <AiPill ai={ai} />
      </div>
      <div className="hidden whitespace-nowrap text-sm text-slate-500 lg:block">
        {formatRelative(report.createdAt)}
      </div>

      <ChevronRight
        size={18}
        className="shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-slate-600"
        aria-hidden="true"
      />
    </div>
  )
}
