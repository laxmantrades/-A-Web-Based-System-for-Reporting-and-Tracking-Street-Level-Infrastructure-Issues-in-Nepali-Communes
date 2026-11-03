import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronRight,
  Inbox,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  Wrench,
} from 'lucide-react'

import { categories } from '../../data/categories'
import { QUEUE_TABS, CLASSIFIER_FILTERS } from '../../lib/officerReports'
import {
  fetchOfficerQueue,
  bulkRejectOfficerReports,
} from '../../lib/officerReportsApi'
import OfficerShell from '../../components/officer/OfficerShell'
import QueueRow, { QUEUE_COLUMNS } from '../../components/officer/QueueRow'
import ConfirmDialog from '../../components/officer/ConfirmDialog'
import { useToast } from '../../lib/toast'

const DEFAULT_TAB = 'needs_review'
const DEFAULT_SORT = 'newest'

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'priority', label: 'Priority (High first)' },
]

const PRIORITY_FILTERS = [
  { value: 'all', label: 'All priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'none', label: 'No priority set' },
]

const STAT_CARDS = [
  {
    stat: 'needsReview',
    tab: 'needs_review',
    label: 'Need review',
    Icon: Inbox,
    accent: 'from-blue-500 to-indigo-600 shadow-blue-500/30',
    hint: 'Waiting for a first look',
  },
  {
    stat: 'inProgress',
    tab: 'in_progress',
    label: 'In progress',
    Icon: Wrench,
    accent: 'from-amber-400 to-orange-500 shadow-orange-500/30',
    hint: 'Crews are on it',
  },
  {
    stat: 'resolvedThisWeek',
    tab: 'resolved',
    label: 'Resolved this week',
    Icon: CheckCircle2,
    accent: 'from-emerald-500 to-teal-600 shadow-emerald-500/30',
    hint: 'Fixed in the last 7 days',
  },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function StatCard({ card, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'group relative overflow-hidden rounded-2xl bg-white p-3.5 text-left sm:p-5 shadow-xl shadow-slate-900/5 ring-1 transition-all hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        active ? 'ring-2 ring-slate-900' : 'ring-slate-200',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500 sm:text-sm">{card.label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:mt-2 sm:text-4xl">
            {value ?? (
              <span className="inline-block h-9 w-12 animate-pulse rounded-lg bg-slate-100 align-middle" />
            )}
          </p>
        </div>
        <span
          className={`hidden h-12 w-12 shrink-0 place-items-center rounded-2xl sm:grid bg-gradient-to-br text-white shadow-lg ${card.accent}`}
        >
          <card.Icon size={22} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 hidden items-center justify-between text-xs sm:flex">
        <span className="text-slate-500">{card.hint}</span>
        <span className="inline-flex items-center gap-0.5 font-semibold text-slate-400 transition-colors group-hover:text-slate-900">
          {active ? 'Showing' : 'View'}
          <ChevronRight size={14} aria-hidden="true" />
        </span>
      </div>
    </button>
  )
}

function selectClass() {
  return 'min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none transition-colors hover:bg-white focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 sm:w-auto'
}

export default function OfficerQueue() {
  const { officer } = useOutletContext()
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const tab = params.get('tab') || DEFAULT_TAB
  const category = params.get('category') || 'all'
  const priority = params.get('priority') || 'all'
  const classifier = params.get('classifier') || 'all'
  const sort = params.get('sort') || DEFAULT_SORT
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1)

  const key = params.toString()
  const filtersActive =
    tab !== DEFAULT_TAB ||
    category !== 'all' ||
    priority !== 'all' ||
    classifier !== 'all' ||
    sort !== DEFAULT_SORT

  const [state, setState] = useState({ key: null, status: 'loading', data: null, error: '' })
  const [selected, setSelected] = useState(() => new Set())
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReasonValue, setRejectReasonValue] = useState('spam')
  const [rejectDetail, setRejectDetail] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    fetchOfficerQueue({ tab, category, priority, classifier, sort, page }).then(
      (data) => {
        if (alive) setState({ key, status: 'ready', data, error: '' })
      },
      (err) => {
        if (!alive) return
        if (err.unauthorized) {
          navigate('/officer/login', { replace: true })
          return
        }
        setState({ key, status: 'error', data: null, error: err.message })
      },
    )
    return () => {
      alive = false
    }
    // `key` captures tab/category/priority/sort/page; `nonce` forces a refetch
    // after a bulk action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce])

  // clear selection when filters or page change
  useEffect(() => {
    setSelected(new Set())
  }, [key])

  const fresh = state.status === 'ready' && state.key === key
  const showSkeleton = !fresh && state.status !== 'error'
  const data = fresh ? state.data : null

  const rows = data?.reports ?? []
  // counts don't depend on filters, keep the old ones while loading
  const stats = state.data?.stats ?? null
  const tabCounts = state.data?.tabCounts ?? null

  // keep the selected tab visible when the tab bar scrolls
  const activeTabRef = useRef(null)
  // again after counts load (badges make tabs wider)
  const countsLoaded = tabCounts !== null
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [tab, countsLoaded])
  const pageCount = data?.pageCount ?? 1
  const total = data?.total ?? 0

  const update = useCallback(
    (patch) => {
      const next = new URLSearchParams(params)
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === '' || v === 'all') next.delete(k)
        else next.set(k, String(v))
      }
      // filter change -> page 1
      if (!('page' in patch)) next.delete('page')
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  const resetFilters = () => setParams(new URLSearchParams(), { replace: true })

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleAll = () =>
    setSelected(() => (allOnPageSelected ? new Set() : new Set(rows.map((r) => r.id))))

  const selectedIds = useMemo(() => [...selected], [selected])

  async function confirmBulkReject() {
    setRejecting(true)
    try {
      const { rejected, skipped } = await bulkRejectOfficerReports(
        selectedIds,
        rejectReasonValue,
        rejectDetail.trim(),
      )
      toast.success(
        `${rejected} report${rejected === 1 ? '' : 's'} rejected.` +
          (skipped ? ` ${skipped} skipped (already closed or changed).` : ''),
      )
      setRejectOpen(false)
      setRejectDetail('')
      setSelected(new Set())
      setNonce((n) => n + 1)
    } catch (err) {
      if (err.unauthorized) navigate('/officer/login', { replace: true })
      else toast.error(err.message)
      setRejectOpen(false)
    } finally {
      setRejecting(false)
    }
  }

  return (
    <OfficerShell
      officer={officer}
      hero={{
        eyebrow: todayLabel(),
        title: `${greeting()}, ${officer.name.split(' ')[0]}`,
        subtitle: !stats
          ? 'Loading your queue…'
          : stats.needsReview === 0
            ? 'Nothing is waiting for review. Nice work.'
            : `${stats.needsReview} report${stats.needsReview === 1 ? ' is' : 's are'} waiting for review. Here’s where things stand.`,
      }}
    >
      {/* number cards, click to go to the tab */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {STAT_CARDS.map((card) => (
          <StatCard
            key={card.tab}
            card={card}
            value={stats ? stats[card.stat] : null}
            active={tab === card.tab}
            onClick={() => update({ tab: card.tab })}
          />
        ))}
      </div>

      {/* status tabs */}
      <div className="-mx-4 mt-8 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div
          role="tablist"
          aria-label="Report status"
          className="inline-flex min-w-max items-center gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200"
        >
          {QUEUE_TABS.map((t, i) => {
            const active = tab === t.key
            const divider = i > 0 && QUEUE_TABS[i - 1].group !== t.group
            const count = tabCounts?.[t.key]
            return (
              <Fragment key={t.key}>
                {divider && <span className="mx-1 h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />}
                <button
                  type="button"
                  role="tab"
                  ref={active ? activeTabRef : null}
                  aria-selected={active}
                  onClick={() => update({ tab: t.key })}
                  className={[
                    'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
                    active
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')}
                >
                  {t.dot && <span className={`h-2 w-2 rounded-full ${t.dot}`} aria-hidden="true" />}
                  {t.label}
                  {count !== undefined && (
                    <span
                      className={[
                        'min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums',
                        active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500',
                      ].join(' ')}
                    >
                      {count}
                    </span>
                  )}
                </button>
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* filters */}
      <div className="mt-3 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="grid grid-cols-2 gap-2 p-3 sm:flex sm:flex-wrap sm:items-center sm:px-4">
          <SlidersHorizontal
            size={16}
            className="hidden text-slate-400 sm:block"
            aria-hidden="true"
          />
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => update({ category: e.target.value })}
            className={selectClass()}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by priority"
            value={priority}
            onChange={(e) => update({ priority: e.target.value })}
            className={selectClass()}
          >
            {PRIORITY_FILTERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by classifier result"
            value={classifier}
            onChange={(e) => update({ classifier: e.target.value })}
            className={selectClass()}
          >
            {CLASSIFIER_FILTERS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort order"
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
            className={selectClass()}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* bulk actions */}
      {selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-lg">
          <span className="text-sm font-semibold">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-sm font-medium text-slate-300 hover:text-white"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setRejectOpen(true)}
              className="inline-flex min-h-[36px] items-center rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
            >
              Reject selected
            </button>
          </div>
        </div>
      )}

      {/* list */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {showSkeleton ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Loading reports…
          </div>
        ) : state.status === 'error' && !fresh ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-slate-600">{state.error}</p>
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-16 text-center">
            {filtersActive ? (
              <>
                <p className="text-sm text-slate-600">
                  No reports match these filters
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-2 text-sm font-semibold text-slate-800 underline underline-offset-2"
                >
                  Reset filters
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 size={28} className="text-emerald-500" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-700">
                  You&rsquo;re all caught up. Nothing to review right now.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* column titles on wide screens, count on small */}
            <div
              className={`flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:px-5 ${QUEUE_COLUMNS}`}
            >
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={toggleAll}
                aria-label="Select all reports on this page"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              <span className="lg:col-span-2">
                {total} report{total === 1 ? '' : 's'}
              </span>
              <span className="hidden lg:block">Status</span>
              <span className="hidden lg:block">Priority</span>
              <span className="hidden lg:block">AI photo check</span>
              <span className="hidden lg:block">Submitted</span>
              <span className="hidden lg:block" aria-hidden="true" />
            </div>
            <div className="divide-y divide-slate-100">
              {rows.map((report) => (
                <QueueRow
                  key={report.id}
                  report={report}
                  selected={selected.has(report.id)}
                  onToggle={toggleRow}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* pages */}
      {fresh && rows.length > 0 && pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => update({ page: page - 1 })}
            className="inline-flex min-h-[38px] items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {pageCount} · {total} report{total === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => update({ page: page + 1 })}
            className="inline-flex min-h-[38px] items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      <ConfirmDialog
        open={rejectOpen}
        title={`Reject ${selected.size} report${selected.size === 1 ? '' : 's'}?`}
        message="Rejected reports stay in the system for audit but are removed from the public feed. Each reporter is emailed. This cannot be undone here."
        confirmLabel="Reject selected"
        danger
        busy={rejecting}
        confirmDisabled={rejectReasonValue === 'other' && !rejectDetail.trim()}
        onCancel={() => setRejectOpen(false)}
        onConfirm={confirmBulkReject}
      >
        <label className="block text-sm font-medium text-slate-700">
          Reason
          <select
            value={rejectReasonValue}
            onChange={(e) => setRejectReasonValue(e.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="spam">Spam</option>
            <option value="duplicate">Duplicate</option>
            <option value="out_of_scope">Out of scope</option>
            <option value="other">Other</option>
          </select>
        </label>
        {rejectReasonValue === 'other' && (
          <input
            type="text"
            value={rejectDetail}
            onChange={(e) => setRejectDetail(e.target.value)}
            placeholder="Describe the reason (required)"
            className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        )}
      </ConfirmDialog>
    </OfficerShell>
  )
}
