import { Info } from 'lucide-react'

import { categories } from '../../data/categories'
import {
  buildTimeline,
  formatDateTime,
  isNotApproved,
  notApprovedReason,
  stepIndexForStatus,
} from '../../lib/reportStatus'
import StatusBadge from './StatusBadge'
import StatusTimeline from './StatusTimeline'
import ReportDetails from './ReportDetails'

// full report view: header, timeline (or "not approved"), photo, map, note.
// Used by tracking and public detail pages.
// showHeader = false if the page already shows the header
export default function ReportView({ report, showHeader = true }) {
  const rejected = isNotApproved(report.status)
  const rows = buildTimeline(report.statusHistory, stepIndexForStatus(report.status))
  const submittedAt = report.statusHistory.find((e) => e.status === 'submitted')?.changedAt
  const decidedAt = [...report.statusHistory]
    .reverse()
    .find((e) => e.status === report.status)?.changedAt
  const category = categories.find((c) => c.id === report.category)

  return (
    <div>
      {showHeader && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            {category && (
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${category.tint}`}
              >
                <category.Icon size={24} aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold tracking-tight text-ink">
                {category?.label ?? report.category}
              </h2>
              <p className="text-sm text-ink-soft">
                Report #{report.referenceId} · submitted {formatDateTime(report.createdAt)}
              </p>
            </div>
          </div>
          <StatusBadge status={report.status} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-8">
        <div className="self-start rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Progress
          </p>
          {rejected ? (
            <div>
              <div className="flex items-start gap-2 rounded-xl bg-white p-4 text-sm text-stone-700 ring-1 ring-stone-200">
                <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-stone-800">Report not approved</p>
                  <p className="mt-1">{notApprovedReason(report.status, report.statusHistory)}</p>
                </div>
              </div>
              <div className="mt-5">
                <StatusTimeline
                  rows={[
                    {
                      key: 'submitted',
                      label: 'Submitted',
                      state: 'done',
                      timestamp: submittedAt,
                      note: '',
                    },
                    {
                      key: 'not_approved',
                      label: 'Not approved',
                      state: 'current',
                      timestamp: decidedAt,
                      note: '',
                    },
                  ]}
                />
              </div>
            </div>
          ) : (
            <StatusTimeline rows={rows} />
          )}
        </div>

        <ReportDetails report={report} />
      </div>
    </div>
  )
}
