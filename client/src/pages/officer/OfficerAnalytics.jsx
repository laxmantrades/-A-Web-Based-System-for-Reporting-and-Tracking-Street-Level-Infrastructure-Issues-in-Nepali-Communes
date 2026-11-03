import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Hourglass,
  Inbox,
  LayoutGrid,
  Loader2,
  Minus,
  Timer,
  Workflow,
} from 'lucide-react'

import { categories } from '../../data/categories'
import { classifierMeta, officerStatusMeta } from '../../lib/officerReports'
import { fetchOfficerAnalytics } from '../../lib/officerReportsApi'
import OfficerShell from '../../components/officer/OfficerShell'

const RANGES = [7, 30, 90]
const DEFAULT_RANGE = 30

// one colour for all charts (each has one series)
const SERIES = '#2a78d6'
const SERIES_HOVER = '#1c5cab'

const categoryOf = (id) => categories.find((c) => c.id === id)

function formatDay(iso, opts = { day: 'numeric', month: 'short' }) {
  // set to noon UTC so timezones can't move it to another day
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, opts)
}

function formatHours(h) {
  if (h === null || h === undefined) return null
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`
  if (h < 48) return `${Math.round(h * 10) / 10} h`
  return `${Math.round((h / 24) * 10) / 10} days`
}

const formatDays = (d) => (d === null || d === undefined ? null : formatHours(d * 24))

// nice axis max >= n (2, 5, 10, 20, 50...)
function niceMax(n) {
  if (n <= 2) return 2
  const mag = 10 ** Math.floor(Math.log10(n))
  for (const m of [1, 2, 5, 10]) if (m * mag >= n) return m * mag
  return 10 * mag
}

/* ---- pieces ---- */

function IconChip(props) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg ${props.className}`}
    >
      <props.icon size={19} aria-hidden="true" />
    </span>
  )
}

function Card({ title, description, icon, chip, aside, children, className = '' }) {
  return (
    <section
      className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && <IconChip icon={icon} className={chip} />}
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Delta({ current, previous, days, upIsGood, onDark = false }) {
  const diff = current - previous
  const muted = onDark ? 'text-slate-300' : 'text-slate-500'
  if (diff === 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${muted}`}>
        <Minus size={13} aria-hidden="true" />
        Same as previous {days} days
      </span>
    )
  }
  const up = diff > 0
  // more reports isn't good or bad, so neutral colour
  const good = onDark ? 'text-emerald-300' : 'text-emerald-700'
  const bad = onDark ? 'text-red-300' : 'text-red-700'
  const tone = upIsGood === undefined ? muted : up === upIsGood ? good : bad
  const Arrow = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${tone}`}>
      <Arrow size={13} aria-hidden="true" />
      {up ? '+' : '−'}
      {Math.abs(diff)} vs previous {days} days
    </span>
  )
}

function StatTile({ label, value, icon, chip, children }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <IconChip icon={icon} className={chip} />
      </div>
      <p className="-mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {value ?? <span className="text-slate-300">—</span>}
      </p>
      <div className="mt-2 min-h-[18px]">{children}</div>
    </div>
  )
}

// white trend line in the header
function Sparkline({ daily }) {
  const n = daily.length
  const max = Math.max(1, ...daily.map((d) => d.count))
  const pts = daily.map((d, i) => `${(i / Math.max(1, n - 1)) * 100},${38 - (d.count / max) * 34}`)
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-20 w-full" aria-hidden="true">
      <polygon points={`0,40 ${pts.join(' ')} 100,40`} fill="rgba(255,255,255,0.10)" />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// reports per day chart, with tooltip and table view
function DailyChart({ daily }) {
  const [hover, setHover] = useState(null)
  const max = niceMax(Math.max(0, ...daily.map((d) => d.count)))
  const ticks = [max, max / 2, 0].filter(Number.isInteger)
  const n = daily.length
  const labelIdx = [...new Set([0, Math.floor((n - 1) / 2), n - 1])]
  const active = hover === null ? null : daily[hover]

  return (
    <div>
      <div className="flex gap-2">
        {/* y labels */}
        <div className="relative h-56 w-6 shrink-0 text-right text-[11px] tabular-nums text-slate-400">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(1 - t / max) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="relative h-56 min-w-0 flex-1" onMouseLeave={() => setHover(null)}>
          {/* grid lines */}
          {ticks.map((t) => (
            <div
              key={t}
              className={`absolute inset-x-0 h-px ${t === 0 ? 'bg-slate-300' : 'bg-slate-100'}`}
              style={{ top: `${(1 - t / max) * 100}%` }}
              aria-hidden="true"
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-[2px]">
            {daily.map((d, i) => (
              <div
                key={d.date}
                // whole column is hoverable
                className={`flex h-full min-w-0 flex-1 items-end justify-center rounded-t-md transition-colors ${
                  hover === i ? 'bg-slate-100/70' : ''
                }`}
                onMouseEnter={() => setHover(i)}
              >
                <div
                  className="w-full max-w-[24px] rounded-t transition-colors"
                  style={{
                    height: `${(d.count / max) * 100}%`,
                    backgroundColor: hover === i ? SERIES_HOVER : SERIES,
                  }}
                />
              </div>
            ))}
          </div>

          {active && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-white shadow-xl"
              style={{ left: `${((hover + 0.5) / n) * 100}%` }}
            >
              <p className="text-sm font-bold">
                {active.count} report{active.count === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-slate-300">
                {formatDay(active.date, { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* x labels: first, middle, last day */}
      <div className="relative ml-8 mt-2 h-4 text-[11px] text-slate-400">
        {labelIdx.map((i) => (
          <span
            key={i}
            className={`absolute whitespace-nowrap ${i === 0 ? '' : i === n - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
            style={{ left: `${(i === n - 1 ? 1 : (i + 0.5) / n) * 100}%` }}
          >
            {formatDay(daily[i].date)}
          </span>
        ))}
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-800">
          Show as table
        </summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 text-right font-semibold">Reports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...daily].reverse().map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-1.5 text-slate-700">
                    {formatDay(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

// horizontal bars with the number at the end
function BarList({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        // phones: label above the bar
        <li
          key={r.key}
          className="grid grid-cols-1 gap-1.5 sm:grid-cols-[12.5rem_1fr] sm:items-center sm:gap-3"
        >
          <span className="min-w-0 text-sm text-slate-700">{r.label}</span>
          <span className="flex items-center gap-2">
            <span
              className="h-3 rounded-r"
              style={{ width: `${(r.value / max) * 85}%`, backgroundColor: SERIES }}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold tabular-nums text-slate-900">{r.value}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function RangePicker({ days, onPick }) {
  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex rounded-xl bg-white/10 p-1 ring-1 ring-inset ring-white/15 backdrop-blur"
    >
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={days === r}
          onClick={() => onPick(r)}
          className={[
            'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
            days === r ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:text-white',
          ].join(' ')}
        >
          {r} days
        </button>
      ))}
    </div>
  )
}

/* ---- page ---- */

export default function OfficerAnalytics() {
  const { officer } = useOutletContext()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const requested = Number.parseInt(params.get('days'), 10)
  const days = RANGES.includes(requested) ? requested : DEFAULT_RANGE

  const [state, setState] = useState({ days: null, status: 'loading', data: null, error: '' })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    fetchOfficerAnalytics(days).then(
      (data) => alive && setState({ days, status: 'ready', data, error: '' }),
      (err) => {
        if (!alive) return
        if (err.unauthorized) navigate('/officer/login', { replace: true })
        else setState((s) => ({ ...s, days, status: 'error', error: err.message }))
      },
    )
    return () => {
      alive = false
    }
  }, [days, nonce, navigate])

  // keep old chart (dimmed) while loading
  const data = state.data
  const refetching = state.days !== days && state.status !== 'error'

  function pickRange(next) {
    const p = new URLSearchParams(params)
    if (next === DEFAULT_RANGE) p.delete('days')
    else p.set('days', String(next))
    setParams(p, { replace: true })
  }

  const t = data?.totals
  const peak = data?.daily.reduce((best, d) => (d.count > (best?.count ?? 0) ? d : best), null)

  const hero = {
    eyebrow: 'Analytics',
    title: 'Street issues at a glance',
    subtitle: 'How reports are coming in and how quickly they’re handled. Days follow Nepal time.',
    actions: <RangePicker days={days} onPick={pickRange} />,
    content: data && (
      <div
        className={`mt-8 grid items-end gap-6 transition-opacity sm:grid-cols-[auto_1fr] ${
          refetching ? 'opacity-50' : ''
        }`}
      >
        <div>
          <p className="text-sm font-medium text-slate-300">
            Reports received · last {data.days} days
          </p>
          <p className="mt-1 text-6xl font-bold tracking-tight text-white">{t.received}</p>
          <div className="mt-2">
            <Delta current={t.received} previous={t.receivedPrev} days={data.days} onDark />
          </div>
        </div>
        <div className="min-w-0 sm:max-w-xl sm:justify-self-end sm:pl-8" style={{ width: '100%' }}>
          <Sparkline daily={data.daily} />
        </div>
      </div>
    ),
  }

  return (
    <OfficerShell officer={officer} hero={hero}>
      {state.status === 'error' && (
        <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          {state.error}{' '}
          <button
            type="button"
            onClick={() => setNonce((x) => x + 1)}
            className="font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {!data && state.status !== 'error' && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-white py-24 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Loading analytics…
        </div>
      )}

      {data && (
        <div
          className={`space-y-6 transition-opacity ${refetching ? 'opacity-50' : ''}`}
          aria-busy={refetching}
        >
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatTile
              label="Resolved"
              value={t.resolved}
              icon={CheckCircle2}
              chip="from-emerald-500 to-teal-600 shadow-emerald-500/30"
            >
              <Delta current={t.resolved} previous={t.resolvedPrev} days={data.days} upIsGood />
            </StatTile>
            <StatTile
              label="Open right now"
              value={t.open}
              icon={Inbox}
              chip="from-blue-500 to-indigo-600 shadow-blue-500/30"
            >
              <span className="text-xs text-slate-500">Needs review, in review or in progress</span>
            </StatTile>
            <StatTile
              label="Median first response"
              value={formatHours(t.medianFirstResponseHours)}
              icon={Timer}
              chip="from-violet-500 to-purple-600 shadow-violet-500/30"
            >
              <span className="text-xs text-slate-500">
                {t.firstResponseSample
                  ? `From ${t.firstResponseSample} report${t.firstResponseSample === 1 ? '' : 's'}`
                  : 'No responses in this period'}
              </span>
            </StatTile>
            <StatTile
              label="Median time to resolve"
              value={formatDays(t.medianResolveDays)}
              icon={Hourglass}
              chip="from-amber-400 to-orange-500 shadow-orange-500/30"
            >
              <span className="text-xs text-slate-500">
                {t.resolveSample
                  ? `From ${t.resolveSample} resolved report${t.resolveSample === 1 ? '' : 's'}`
                  : 'Nothing resolved in this period'}
              </span>
            </StatTile>
          </div>

          <Card
            title="Reports received per day"
            description={`New reports over the last ${data.days} days`}
            icon={Activity}
            chip="from-blue-500 to-indigo-600 shadow-blue-500/30"
            aside={
              peak && (
                <div className="hidden rounded-xl bg-slate-50 px-3 py-2 text-right ring-1 ring-slate-200 sm:block">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Busiest day
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDay(peak.date)} · {peak.count} report{peak.count === 1 ? '' : 's'}
                  </p>
                </div>
              )
            }
          >
            <DailyChart daily={data.daily} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              title="By category"
              description={`Reports received in the last ${data.days} days`}
              icon={LayoutGrid}
              chip="from-brand-500 to-brand-700 shadow-brand-500/30"
            >
              <BarList
                rows={data.byCategory.map((c) => {
                  const cat = categoryOf(c.category)
                  return {
                    key: c.category,
                    value: c.count,
                    label: (
                      <span className="flex items-center gap-2">
                        {cat && (
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                            <cat.Icon size={14} aria-hidden="true" />
                          </span>
                        )}
                        <span className="truncate">{cat?.label ?? c.category}</span>
                      </span>
                    ),
                  }
                })}
              />
            </Card>

            <Card
              title="Current pipeline"
              description="Every report, by where it stands right now"
              icon={Workflow}
              chip="from-slate-600 to-slate-800 shadow-slate-500/30"
            >
              <BarList
                rows={data.byStatus.map((s) => {
                  const meta = officerStatusMeta(s.status)
                  return {
                    key: s.status,
                    value: s.count,
                    label: (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    ),
                  }
                })}
              />
            </Card>
          </div>

          <div>
            <Card
              title="AI photo check vs officer decisions"
              description="Share of each flag later rejected or marked duplicate. A useful spam check sees most dismissals on “Likely spam”."
              icon={BrainCircuit}
              chip="from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30"
            >
              <ul className="space-y-3.5">
                {data.classifier.map((row) => {
                  const meta = classifierMeta(row.result)
                  const rate = row.total ? Math.round((row.dismissed / row.total) * 100) : 0
                  return (
                    <li
                      key={row.result}
                      className="grid grid-cols-[9.5rem_1fr_auto] items-center gap-3"
                    >
                      <span
                        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta.badge}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
                        {meta.short}
                      </span>
                      <span className="h-2 rounded-full bg-slate-100" aria-hidden="true">
                        <span
                          className="block h-2 rounded-full"
                          style={{ width: `${rate}%`, backgroundColor: SERIES }}
                        />
                      </span>
                      <span className="whitespace-nowrap text-right text-sm tabular-nums text-slate-900">
                        <span className="font-semibold">{row.dismissed}</span>
                        <span className="text-slate-400">/{row.total}</span>
                        <span className="ml-1.5 text-xs text-slate-500">
                          {row.total ? `${rate}%` : '—'}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-4 text-xs text-slate-400">Dismissed / total reports with that flag.</p>
            </Card>

          </div>
        </div>
      )}
    </OfficerShell>
  )
}
