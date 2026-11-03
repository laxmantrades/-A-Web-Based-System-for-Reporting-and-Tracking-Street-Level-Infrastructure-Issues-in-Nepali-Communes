import { SlidersHorizontal, X } from 'lucide-react'

import { categories } from '../../data/categories'

// only statuses that can be public
const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'acknowledged', label: 'In Review' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-ink outline-none transition-colors hover:bg-white focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 sm:w-52'

// category + status filters for the public page (apply to both lists)
export default function ReportFilters({ category, status, onChange }) {
  const active = category !== 'all' || status !== 'all'

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:flex-wrap sm:items-center sm:px-4">
      <span className="hidden items-center gap-2 pr-1 text-sm font-semibold text-ink sm:inline-flex">
        <SlidersHorizontal size={16} className="text-slate-400" aria-hidden="true" />
        Filter
      </span>
      <label className="block">
        <span className="sr-only">Category</span>
        <select
          value={category}
          onChange={(e) => onChange({ category: e.target.value, status })}
          className={selectClass}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="sr-only">Status</span>
        <select
          value={status}
          onChange={(e) => onChange({ category, status: e.target.value })}
          className={selectClass}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {active && (
        <button
          type="button"
          onClick={() => onChange({ category: 'all', status: 'all' })}
          className="inline-flex items-center gap-1.5 self-start rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink sm:self-auto"
        >
          <X size={15} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  )
}
