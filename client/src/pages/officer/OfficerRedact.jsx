import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Loader2,
  MousePointer2,
  Redo2,
  Square,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'

import {
  fetchOfficerReport,
  saveOfficerReportRedaction,
  removeOfficerReportRedaction,
} from '../../lib/officerReportsApi'
import RedactionCanvas from '../../components/officer/RedactionCanvas'
import RedactionPreview from '../../components/officer/RedactionPreview'
import ConfirmDialog from '../../components/officer/ConfirmDialog'
import { useToast } from '../../lib/toast'

export default function OfficerRedact() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const canvasRef = useRef(null)

  const [load, setLoad] = useState({ status: 'loading', report: null, error: '' })
  const [mode, setMode] = useState('draw')
  const [rects, setRects] = useState([])
  const [history, setHistory] = useState({ canUndo: false, canRedo: false })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    let alive = true
    fetchOfficerReport(id).then(
      (data) => {
        if (!alive) return
        if (data.report.photo?.originalDeleted) {
          setLoad({
            status: 'error',
            report: null,
            error: 'This report is final and its original photo has been deleted, so the redaction can no longer be changed.',
          })
        } else {
          setLoad({ status: 'ready', report: data.report, error: '' })
        }
      },
      (err) => {
        if (!alive) return
        if (err.unauthorized) navigate('/officer/login', { replace: true })
        else setLoad({ status: 'error', report: null, error: err.message })
      },
    )
    return () => {
      alive = false
    }
  }, [id, navigate])

  const back = useCallback(() => navigate(`/officer/reports/${id}`), [navigate, id])
  const attemptClose = useCallback(() => {
    if (dirty) setConfirm('close')
    else back()
  }, [dirty, back])

  const hadRedaction = Boolean(load.report?.photo?.hasRedaction)

  async function doSave() {
    setSaving(true)
    setSaveError('')
    try {
      const payloadRects = canvasRef.current.getRects()
      if (payloadRects.length === 0) {
        // no boxes: remove the redaction if there was one, else nothing to do
        if (hadRedaction) {
          await removeOfficerReportRedaction(id)
          toast.success('Redaction removed.')
        }
      } else {
        await saveOfficerReportRedaction(id, payloadRects)
        toast.success('Redaction saved. The public now sees the redacted photo.')
      }
      canvasRef.current.markSaved()
      navigate(`/officer/reports/${id}`)
    } catch (err) {
      if (err.unauthorized) navigate('/officer/login', { replace: true })
      else {
        setSaveError(err.message)
        setSaving(false)
      }
    }
  }

  async function doRemove() {
    setSaving(true)
    setSaveError('')
    setConfirm(null)
    try {
      await removeOfficerReportRedaction(id)
      toast.success('Redaction removed.')
      navigate(`/officer/reports/${id}`)
    } catch (err) {
      if (err.unauthorized) navigate('/officer/login', { replace: true })
      else {
        setSaveError(err.message)
        setSaving(false)
      }
    }
  }

  const report = load.report
  const toolBtn = (active) =>
    [
      'inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
      active
        ? 'bg-slate-800 text-white'
        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    ].join(' ')
  const iconBtn =
    'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40'

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
      {/* header */}
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-base font-bold text-slate-900">Redact Photo</h1>
          {report && (
            <p className="text-xs text-slate-500">Report #{report.referenceId}</p>
          )}
        </div>
        <button
          type="button"
          onClick={attemptClose}
          aria-label="Close redaction tool"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      {load.status === 'loading' && (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Loading photo…
        </div>
      )}

      {load.status === 'error' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-slate-600">{load.error}</p>
          <button type="button" onClick={back} className="text-sm font-semibold text-slate-800 underline">
            Back to report
          </button>
        </div>
      )}

      {load.status === 'ready' && (
        <>
          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
            <button type="button" onClick={() => setMode('draw')} className={toolBtn(mode === 'draw')}>
              <Square size={15} aria-hidden="true" /> Draw rectangle
            </button>
            <button type="button" onClick={() => setMode('select')} className={toolBtn(mode === 'select')}>
              <MousePointer2 size={15} aria-hidden="true" /> Select
            </button>
            <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />
            <button
              type="button"
              onClick={() => canvasRef.current?.undo()}
              disabled={!history.canUndo}
              aria-label="Undo"
              className={iconBtn}
            >
              <Undo2 size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => canvasRef.current?.redo()}
              disabled={!history.canRedo}
              aria-label="Redo"
              className={iconBtn}
            >
              <Redo2 size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setConfirm('clear')}
              disabled={rects.length === 0}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              <Trash2 size={15} aria-hidden="true" /> Clear all
            </button>
          </div>

          {/* body */}
          <div className="flex-1 overflow-auto">
            <div className="mx-auto grid max-w-6xl gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_280px]">
              <div className="min-w-0">
                <RedactionCanvas
                  ref={canvasRef}
                  src={report.photo.originalUrl}
                  initialRects={report.photo.redactionRects}
                  mode={mode}
                  onRectsChange={setRects}
                  onHistoryChange={setHistory}
                  onDirtyChange={setDirty}
                  onEscape={() => {
                    if (!confirm) attemptClose()
                  }}
                />
                <p className="mt-2 text-xs text-slate-500">
                  {mode === 'draw'
                    ? 'Click and drag on the photo to draw a black box. Switch to Select to move, resize, or delete a box.'
                    : 'Click a box to select it, then drag it or its corners. Press Delete (or the ✕) to remove it.'}
                </p>
              </div>

              <aside className="space-y-4">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Preview
                  </h2>
                  <div className="mt-2">
                    <RedactionPreview src={report.photo.originalUrl} rects={rects} />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {rects.length} rectangle{rects.length === 1 ? '' : 's'} drawn
                </p>
                <p className="text-xs leading-relaxed text-slate-500">
                  Drawn rectangles will appear as solid black in the saved version. The
                  original photo is kept for audit purposes.
                </p>
                <p className="text-xs leading-relaxed text-slate-400 lg:hidden">
                  On a small screen? Redacting a detailed photo is easier on a desktop.
                </p>
              </aside>
            </div>
          </div>

          {/* footer */}
          <footer className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
            {saveError && (
              <p role="alert" className="mb-2 text-sm text-red-700">
                {saveError}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <div>
                {hadRedaction && (
                  <button
                    type="button"
                    onClick={() => setConfirm('remove')}
                    disabled={saving}
                    className="inline-flex min-h-[44px] items-center rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                  >
                    Remove redaction
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={attemptClose}
                  disabled={saving}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={doSave}
                  disabled={saving || !dirty}
                  className="inline-flex min-h-[44px] items-center rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-900 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save redacted version'}
                </button>
              </div>
            </div>
          </footer>
        </>
      )}

      <ConfirmDialog
        open={confirm === 'close'}
        title="Discard redaction?"
        message="Your rectangles will not be saved."
        confirmLabel="Discard"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null)
          back()
        }}
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        title="Remove all rectangles?"
        message="This clears every box on the canvas. You can still undo it."
        confirmLabel="Clear all"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          canvasRef.current?.clearAll()
          setConfirm(null)
        }}
      />
      <ConfirmDialog
        open={confirm === 'remove'}
        title="Remove the redaction?"
        message="The redacted image is deleted and the original photo is shown again on the public feed. The original was never modified."
        confirmLabel="Remove redaction"
        danger
        busy={saving}
        onCancel={() => setConfirm(null)}
        onConfirm={doRemove}
      />
    </div>
  )
}
