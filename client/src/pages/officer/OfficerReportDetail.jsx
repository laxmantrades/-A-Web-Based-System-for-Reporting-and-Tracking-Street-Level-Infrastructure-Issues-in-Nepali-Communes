import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BrainCircuit,
  Camera,
  Clock,
  Eye,
  FileText,
  History,
  Info,
  Loader2,
  Lock,
  MapPin,
  RefreshCw,
  X,
} from 'lucide-react'

import { categories } from '../../data/categories'
import { formatDateTime } from '../../lib/reportStatus'
import {
  officerStatusMeta,
  rejectReasonLabel,
  classifierMeta,
  SPAM_TYPE_LABELS,
  CLASSIFIER_INFO,
  PRIORITY_META,
} from '../../lib/officerReports'
import {
  fetchOfficerReport,
  reclassifyOfficerReport,
} from '../../lib/officerReportsApi'
import OfficerShell from '../../components/officer/OfficerShell'
import OfficerActionsPanel from '../../components/officer/OfficerActionsPanel'
import HandledByPanel from '../../components/officer/HandledByPanel'
import StaticMap from '../../components/track/StaticMap'
import { useToast } from '../../lib/toast'
import { locationLabel } from '../../lib/location'

function categoryLabel(id) {
  return categories.find((c) => c.id === id)?.label ?? id
}

function Badge({ className, children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  )
}

function personLabel(actor) {
  if (!actor) return 'System'
  return `${actor.name}${actor.role === 'admin' ? ' (admin)' : ''}`
}

// AI classifier result (no raw score). Officers can run it again.
function ClassifierPanel({ classifier, onReclassify, reclassifying }) {
  const [showInfo, setShowInfo] = useState(false)
  const result = classifier?.result ?? null
  const meta = classifierMeta(result)
  const classified = result === 'HIGH' || result === 'MEDIUM' || result === 'LOW'

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconChip className="from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30">
            <BrainCircuit size={18} aria-hidden="true" />
          </IconChip>
          <h2 className="text-base font-semibold text-slate-900">AI photo check</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          aria-expanded={showInfo}
          className="text-slate-400 hover:text-slate-600"
        >
          <Info size={15} aria-hidden="true" />
          <span className="sr-only">About the AI photo check</span>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold ring-1 ring-inset ${meta.badge}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
          {meta.short}
        </span>
        {!classified && (
          <p className="text-sm font-semibold text-slate-500">Not classified</p>
        )}
      </div>

      {classified && (
        <p className="mt-1 text-xs text-slate-500">
          {meta.tooltip}
          {result !== 'HIGH' && SPAM_TYPE_LABELS[classifier?.spamType] && (
            <> — looks like {SPAM_TYPE_LABELS[classifier.spamType]}.</>
          )}
        </p>
      )}

      {showInfo && (
        <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-500">
          {CLASSIFIER_INFO}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-400">
          {classifier?.runAt
            ? `${classifier.version || 'classifier'} · ${formatDateTime(classifier.runAt)}`
            : 'Not run yet'}
        </p>
        <button
          type="button"
          onClick={onReclassify}
          disabled={reclassifying}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={13}
            className={reclassifying ? 'animate-spin' : ''}
            aria-hidden="true"
          />
          {reclassifying ? 'Re-classifying…' : 'Re-classify'}
        </button>
      </div>
    </section>
  )
}

// label for a classifier audit entry. Old clip-zeroshot-* entries keep HIGH/MEDIUM/LOW
// because they meant something different.
function classifierLogLabel(result, version, spamType) {
  if (!String(version).startsWith('clip-spam')) return result || 'UNCLASSIFIED'
  const meta = classifierMeta(result)
  if (!meta.level) return meta.short
  const spamLabel = meta.level !== 'HIGH' && SPAM_TYPE_LABELS[spamType]
  return spamLabel ? `${meta.short}: Looks like ${spamLabel}` : meta.short
}

// one audit trail row
function AuditRow({ entry }) {
  const { action, actor, before, after, reason, note, noteType, spamType } = entry

  let headline = null
  if (action === 'state_change') {
    headline = (
      <>
        Moved to{' '}
        <span className="font-semibold">{officerStatusMeta(after).label}</span>
      </>
    )
  } else if (action === 'report_rejected') {
    headline = (
      <>
        Report rejected —{' '}
        <span className="font-semibold">{rejectReasonLabel(reason)}</span>
      </>
    )
  } else if (action === 'priority_change') {
    headline = !after
      ? 'Priority cleared'
      : before
        ? `Priority changed from ${before} to ${after}`
        : `Priority set to ${after}`
  } else if (action === 'photo_hidden') {
    headline = 'Photo hidden from the public feed'
  } else if (action === 'photo_unhidden') {
    headline = 'Photo restored to the public feed'
  } else if (action === 'photo_redacted') {
    const count = typeof after === 'number' ? after : parseInt(after, 10) || null
    headline = count
      ? `Photo redacted (${count} rectangle${count === 1 ? '' : 's'})`
      : 'Photo redacted'
  } else if (action === 'redaction_removed') {
    headline = 'Redaction removed'
  } else if (action === 'note_added') {
    headline = noteType === 'internal' ? 'Internal note added' : 'Public note added'
  } else if (action === 'classifier_run' || action === 'classifier_reclassified') {
    const verb = action === 'classifier_run' ? 'Classifier ran' : 'Classifier re-run'
    headline = (
      <>
        {verb} —{' '}
        <span className="font-semibold">{classifierLogLabel(after, reason, spamType)}</span>
        {reason ? <span className="text-slate-400"> ({reason})</span> : null}
      </>
    )
  }

  const isInternal = noteType === 'internal'

  return (
    <li className="relative pl-7">
      <span
        className="absolute left-0 top-1 h-3 w-3 rounded-full bg-white ring-[3px] ring-brand-500"
        aria-hidden="true"
      />
      <p className="text-sm text-slate-800">{headline}</p>
      {note && (
        <div className="mt-1">
          {isInternal && (
            <span className="mb-1 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <Lock size={11} aria-hidden="true" /> Internal only
            </span>
          )}
          <p
            className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
              isInternal ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-600'
            }`}
          >
            {note}
          </p>
        </div>
      )}
      <p className="mt-1 text-xs text-slate-400">
        {personLabel(actor)} · {formatDateTime(entry.at)}
      </p>
    </li>
  )
}

function AuditTrail({ entries }) {
  if (!entries || entries.length === 0) {
    return <p className="text-sm text-slate-500">No officer activity yet.</p>
  }
  return (
    <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-slate-200">
      {entries.map((e) => (
        <AuditRow key={e.id} entry={e} />
      ))}
    </ol>
  )
}

function PhotoModal({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative max-h-full max-w-3xl overflow-auto rounded-lg bg-white p-2 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/90 text-slate-600 hover:bg-white"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <img src={src} alt="Original, unredacted photo" className="max-h-[80vh] w-auto rounded" />
        <p className="px-2 py-1 text-xs text-slate-500">
          Original photo — shown for audit only, never served to the public.
        </p>
      </div>
    </div>
  )
}

function IconChip({ className, children }) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg ${className}`}
    >
      {children}
    </span>
  )
}

function DetailCard({ title, icon, chip, children }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <div className="flex items-center gap-3">
        <IconChip className={chip}>{icon}</IconChip>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function OfficerReportDetail() {
  const { officer } = useOutletContext()
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [state, setState] = useState({ key: null, status: 'loading', report: null, error: '' })
  const [nonce, setNonce] = useState(0)
  const [reclassifying, setReclassifying] = useState(false)
  const [viewOriginal, setViewOriginal] = useState(false)

  useEffect(() => {
    let alive = true
    fetchOfficerReport(id).then(
      (data) => {
        if (alive) setState({ key: id, status: 'ready', report: data.report, error: '' })
      },
      (err) => {
        if (!alive) return
        if (err.unauthorized) {
          navigate('/officer/login', { replace: true })
          return
        }
        setState({ key: id, status: 'error', report: null, error: err.message })
      },
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, nonce])

  const reload = () =>
    new Promise((resolve) => {
      setNonce((n) => n + 1)
      resolve()
    })

  async function handleReclassify() {
    setReclassifying(true)
    try {
      await reclassifyOfficerReport(id)
      toast.success('Photo re-checked by the classifier.')
      await reload()
    } catch (err) {
      if (err.unauthorized) navigate('/officer/login', { replace: true })
      else toast.error(err.message)
    } finally {
      setReclassifying(false)
    }
  }

  const fresh = state.status === 'ready' && state.key === id

  const backLink = (
    <Link
      to="/officer/queue"
      className="mb-5 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-200 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/15 hover:text-white"
    >
      <ArrowLeft size={15} aria-hidden="true" />
      Back to queue
    </Link>
  )

  if (!fresh && state.status === 'loading') {
    return (
      <OfficerShell officer={officer} hero={{ back: backLink, title: 'Loading report…' }}>
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-white py-24 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Loading report…
        </div>
      </OfficerShell>
    )
  }

  if (!fresh && state.status === 'error') {
    return (
      <OfficerShell officer={officer} hero={{ back: backLink, title: 'Report unavailable' }}>
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-600">{state.error}</p>
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Try again
          </button>
        </div>
      </OfficerShell>
    )
  }

  const report = state.report
  const status = officerStatusMeta(report.status)
  const priority = report.priority ? PRIORITY_META[report.priority] : null
  const ai = classifierMeta(report.classifier?.result ?? null)
  const category = categories.find((c) => c.id === report.category)
  const [lng, lat] = report.location?.coordinates ?? []
  const photo = report.photo

  const hero = {
    back: backLink,
    eyebrow: `Report #${report.referenceId}`,
    title: (
      <span className="flex items-center gap-3">
        {category && (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
            <category.Icon size={22} aria-hidden="true" />
          </span>
        )}
        {categoryLabel(report.category)}
      </span>
    ),
    subtitle: (
      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={15} className="shrink-0" aria-hidden="true" />
          {locationLabel(report)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock size={15} aria-hidden="true" />
          {formatDateTime(report.createdAt)}
        </span>
      </span>
    ),
    content: (
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge className={status.className}>{status.label}</Badge>
        {priority && <Badge className={priority.className}>{priority.label} priority</Badge>}
        <Badge className={ai.badge}>
          <span className={`mr-1.5 h-2 w-2 rounded-full ${ai.dot}`} aria-hidden="true" />
          AI: {ai.short}
        </Badge>
      </div>
    ),
  }

  return (
    <OfficerShell officer={officer} hero={hero}>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* left: report info */}
        <div className="space-y-6 lg:col-span-2">
          <section className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
            <div className="relative bg-slate-900">
              <img
                src={
                  photo.photoStatus === 'redacted' && photo.redactedUrl
                    ? photo.redactedUrl
                    : photo.originalUrl
                }
                alt={
                  photo.photoStatus === 'redacted'
                    ? 'The reported problem, with sensitive areas blacked out'
                    : 'The reported problem'
                }
                className="max-h-[30rem] w-full object-contain"
              />
              <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                  <Camera size={13} aria-hidden="true" />
                  Citizen photo
                </span>
                {photo.photoStatus === 'redacted' && (
                  <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800">
                    Redacted
                  </span>
                )}
                {photo.photoStatus === 'hidden' && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    Hidden from public feed
                  </span>
                )}
              </div>
              {photo.photoStatus === 'redacted' && photo.redactedUrl && !photo.originalDeleted && (
                <button
                  type="button"
                  onClick={() => setViewOriginal(true)}
                  className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 shadow hover:bg-white"
                >
                  <Eye size={13} aria-hidden="true" />
                  View original
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm">
              <span className="text-slate-600">
                Category chosen by citizen:{' '}
                <span className="font-semibold text-slate-900">
                  {categoryLabel(report.category)}
                </span>
              </span>
              <span className="text-xs text-slate-400">
                {photo.photoStatus === 'redacted'
                  ? 'The public feed shows this redacted version; the original is kept for audit.'
                  : photo.photoStatus === 'hidden'
                    ? 'Officers still see the original.'
                    : ''}
              </span>
            </div>
          </section>

          <ClassifierPanel
            classifier={report.classifier}
            onReclassify={handleReclassify}
            reclassifying={reclassifying}
          />

          <DetailCard
            title="Location"
            icon={<MapPin size={18} aria-hidden="true" />}
            chip="from-cyan-500 to-sky-600 shadow-cyan-500/30"
          >
            {report.locationDescription && (
              <p className="mb-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800 ring-1 ring-slate-200">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Citizen's description
                </span>
                {report.locationDescription}
              </p>
            )}
            {report.location ? (
              <>
                <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                  <StaticMap lat={lat} lng={lng} />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-800">
                  {report.location.address || 'No street address available'}
                  <span className="mt-0.5 block text-xs font-normal text-slate-400">
                    {lat.toFixed(5)}, {lng.toFixed(5)} · from the citizen's GPS
                  </span>
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-500">
                No GPS location — the citizen described the place instead.
              </p>
            )}
          </DetailCard>

          <DetailCard
            title="Submission details"
            icon={<FileText size={18} aria-hidden="true" />}
            chip="from-blue-500 to-indigo-600 shadow-blue-500/30"
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Submitter email
                </dt>
                <dd className="mt-1 break-all text-sm font-medium text-slate-800">
                  {report.reporterEmail}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Submitted
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">
                  {formatDateTime(report.createdAt)}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5 sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Citizen&rsquo;s note
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                  {report.note || <span className="text-slate-400">None provided</span>}
                </dd>
              </div>
            </dl>
          </DetailCard>

          <DetailCard
            title="Activity log"
            icon={<History size={18} aria-hidden="true" />}
            chip="from-slate-600 to-slate-800 shadow-slate-500/30"
          >
            <AuditTrail entries={report.auditTrail} />
          </DetailCard>
        </div>

        {/* right: who handled it, then actions */}
        <div className="space-y-6 lg:col-span-1">
          <HandledByPanel people={report.handledBy} currentId={officer.id} />
          <div>
            <OfficerActionsPanel
              report={report}
              onChanged={reload}
              onError={toast.error}
              onUnauthorized={() => navigate('/officer/login', { replace: true })}
            />
          </div>
        </div>
      </div>

      {viewOriginal && (
        <PhotoModal src={photo.originalUrl} onClose={() => setViewOriginal(false)} />
      )}
    </OfficerShell>
  )
}
