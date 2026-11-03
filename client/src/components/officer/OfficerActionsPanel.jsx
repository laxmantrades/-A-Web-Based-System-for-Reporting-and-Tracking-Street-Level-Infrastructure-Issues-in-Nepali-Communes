import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EyeOff, ImageMinus } from 'lucide-react'

import {
  nextTransitions,
  canReject,
  PRIORITY_OPTIONS,
  PRIORITY_META,
  REJECT_REASONS,
  OFFICER_STATUS_META,
} from '../../lib/officerReports'
import {
  changeReportState,
  rejectOfficerReport,
  setOfficerReportPriority,
  addOfficerReportNote,
  setOfficerReportPhotoHidden,
} from '../../lib/officerReportsApi'
import ConfirmDialog from './ConfirmDialog'
import { useToast } from '../../lib/toast'

function Section({ title, children }) {
  return (
    <div className="border-t border-slate-100 px-5 py-4 first:border-t-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  )
}

// Officer actions. Success -> toast + onChanged(). Error -> onError(message).
// 401 -> onUnauthorized(). 409 -> show message and reload.
export default function OfficerActionsPanel({
  report,
  onChanged,
  onError,
  onUnauthorized,
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const [busy, setBusy] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [noteBody, setNoteBody] = useState('')
  const [noteVisibility, setNoteVisibility] = useState('public')
  const [rejectValue, setRejectValue] = useState('spam')
  const [rejectDetail, setRejectDetail] = useState('')

  const transitions = nextTransitions(report.status)
  const isTerminal = report.status === 'rejected' || report.status === 'closed'
  const expectedStatus = report.status

  async function run(tag, fn, successText) {
    setBusy(tag)
    onError('')
    try {
      await fn()
      setConfirm(null)
      toast.success(successText)
      await onChanged()
    } catch (err) {
      setConfirm(null)
      if (err.unauthorized) onUnauthorized()
      else {
        onError(err.message)
        if (err.conflict) await onChanged()
      }
    } finally {
      setBusy('')
    }
  }

  const doTransition = (to) =>
    run(
      'transition',
      () => changeReportState(report.id, { to, expectedStatus }),
      `Report moved to ${OFFICER_STATUS_META[to]?.label ?? to}.`,
    )

  const doPriority = (value) =>
    run(
      'priority',
      () => setOfficerReportPriority(report.id, value),
      value ? `Priority set to ${PRIORITY_META[value]?.label ?? value}.` : 'Priority cleared.',
    )

  const doHideToggle = () =>
    run(
      'photo',
      () => setOfficerReportPhotoHidden(report.id, report.photo.photoStatus !== 'hidden'),
      report.photo.photoStatus === 'hidden'
        ? 'Photo is visible to the public again.'
        : 'Photo hidden from the public.',
    )

  const doAddNote = () =>
    run('note', async () => {
      await addOfficerReportNote(report.id, {
        type: noteVisibility,
        text: noteBody.trim(),
      })
      setNoteBody('')
    }, noteVisibility === 'public' ? 'Public note added — the reporter will see it.' : 'Internal note added.')

  const doReject = () =>
    run('reject', () =>
      rejectOfficerReport(report.id, {
        reason: rejectValue,
        detail: rejectDetail.trim(),
        expectedStatus,
      }),
      'Report rejected. The reporter has been notified.',
    )

  const photoHidden = report.photo.photoStatus === 'hidden'
  const rejectNeedsDetail = rejectValue === 'other' && !rejectDetail.trim()

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-4">
        <h2 className="text-sm font-bold text-white">Actions</h2>
        <p className="mt-0.5 text-xs text-slate-400">Every change is recorded in the activity log.</p>
      </div>

      {/* 1. status */}
      <Section title="Status">
        {transitions.length === 0 ? (
          <p className="text-sm text-slate-500">
            {isTerminal
              ? 'This report is in a terminal state — no further transitions.'
              : 'No status changes available.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {transitions.map((t) => (
              <button
                key={t.to}
                type="button"
                disabled={busy === 'transition'}
                onClick={() =>
                  t.confirm
                    ? setConfirm({
                        kind: 'transition',
                        to: t.to,
                        label: t.label,
                        goesPublic: t.goesPublic,
                      })
                    : doTransition(t.to)
                }
                className={[
                  'inline-flex min-h-[42px] items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-60',
                  t.kind === 'primary'
                    ? 'bg-slate-800 text-white hover:bg-slate-900'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* 2. priority */}
      <Section title="Priority">
        <div className="grid grid-cols-4 gap-1.5">
          {PRIORITY_OPTIONS.map((p) => {
            const active = report.priority === p
            return (
              <button
                key={p}
                type="button"
                disabled={busy === 'priority'}
                onClick={() => doPriority(active ? null : p)}
                className={[
                  'min-h-[38px] rounded-lg px-2 text-xs font-semibold capitalize transition-colors disabled:opacity-60',
                  active
                    ? `${PRIORITY_META[p].className} ring-1 ring-inset`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {p}
              </button>
            )
          })}
          <button
            type="button"
            disabled={busy === 'priority' || report.priority === null}
            onClick={() => doPriority(null)}
            className="min-h-[38px] rounded-lg bg-slate-100 px-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40"
          >
            Clear
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Saved immediately. Internal only — the citizen is not notified.
        </p>
      </Section>

      {/* 3. photo */}
      <Section title="Photo moderation">
        <p className="mb-3 text-xs text-slate-500">
          Public feed shows:{' '}
          <span className="font-semibold text-slate-700">
            {report.photo.photoStatus}
          </span>
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy === 'photo'}
            onClick={() => setConfirm({ kind: 'photo', hide: !photoHidden })}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <EyeOff size={15} aria-hidden="true" />
            {photoHidden ? 'Un-hide photo' : 'Hide photo from public feed'}
          </button>
          {report.photo.originalDeleted ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-200">
              Redaction is final: the original photo was deleted when this report
              was {report.status === 'closed' ? 'closed' : 'rejected'}.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/officer/reports/${report.id}/redact`)}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ImageMinus size={15} aria-hidden="true" />
              {report.photo.redactionRects?.length ? 'Edit redaction' : 'Redact photo'}
            </button>
          )}
        </div>
      </Section>

      {/* 4. notes */}
      <Section title="Add a note">
        <textarea
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Add context for the citizen or for other officers…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
        <div className="mt-2 flex flex-col gap-1.5 text-sm text-slate-600">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="note-visibility"
              value="public"
              checked={noteVisibility === 'public'}
              onChange={() => setNoteVisibility('public')}
              className="text-slate-800 focus:ring-slate-500"
            />
            Public note <span className="text-xs text-slate-400">(citizen sees this)</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="note-visibility"
              value="internal"
              checked={noteVisibility === 'internal'}
              onChange={() => setNoteVisibility('internal')}
              className="text-slate-800 focus:ring-slate-500"
            />
            Internal note <span className="text-xs text-slate-400">(officers only)</span>
          </label>
        </div>
        <button
          type="button"
          disabled={busy === 'note' || !noteBody.trim()}
          onClick={doAddNote}
          className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {busy === 'note' ? 'Adding…' : 'Add note'}
        </button>
        <p className="mt-2 text-xs text-slate-400">
          Notes appear in the activity log on the left.
        </p>
      </Section>

      {/* 5. reject (only if it can still be rejected) */}
      {canReject(report.status) && (
        <Section title="Danger zone">
          <label className="block text-sm font-medium text-slate-700">
            Reason
            <select
              value={rejectValue}
              onChange={(e) => setRejectValue(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              {REJECT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          {rejectValue === 'other' && (
            <input
              type="text"
              value={rejectDetail}
              onChange={(e) => setRejectDetail(e.target.value)}
              placeholder="Describe the reason (required)"
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          )}
          <button
            type="button"
            disabled={busy === 'reject' || rejectNeedsDetail}
            onClick={() => setConfirm({ kind: 'reject' })}
            className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
          >
            Reject report
          </button>
        </Section>
      )}

      <ConfirmDialog
        open={confirm?.kind === 'transition'}
        title={`${confirm?.label ?? 'Change status'}?`}
        message={
          confirm?.goesPublic
            ? 'This report will become visible on the public feed. The citizen is also emailed. Continue?'
            : 'The citizen is emailed about this change.'
        }
        confirmLabel={confirm?.label ?? 'Confirm'}
        busy={busy === 'transition'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => doTransition(confirm.to)}
      />

      <ConfirmDialog
        open={confirm?.kind === 'photo'}
        title={confirm?.hide ? 'Hide this photo from the public feed?' : 'Un-hide this photo?'}
        message={
          confirm?.hide
            ? 'Visitors will see a "photo hidden" placeholder. Officers still see the original, and the file is kept.'
            : 'The photo will be shown on the public feed again (its redacted version if one exists).'
        }
        confirmLabel={confirm?.hide ? 'Hide photo' : 'Un-hide photo'}
        busy={busy === 'photo'}
        onCancel={() => setConfirm(null)}
        onConfirm={doHideToggle}
      />

      <ConfirmDialog
        open={confirm?.kind === 'reject'}
        title="Reject this report?"
        message="It stays in the database for audit but leaves the public feed, and the citizen is emailed. This cannot be undone here."
        confirmLabel="Reject report"
        danger
        busy={busy === 'reject'}
        onCancel={() => setConfirm(null)}
        onConfirm={doReject}
      />
    </div>
  )
}
