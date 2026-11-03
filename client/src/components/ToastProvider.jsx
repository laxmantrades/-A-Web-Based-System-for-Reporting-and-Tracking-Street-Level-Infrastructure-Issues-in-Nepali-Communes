import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

import { ToastContext } from '../lib/toast'

// errors stay longer
const DURATION = { success: 4000, info: 5000, error: 7000 }
const MAX_VISIBLE = 4

const TONE = {
  success: { icon: CheckCircle2, iconClass: 'text-emerald-600', bar: 'bg-emerald-500' },
  error: { icon: AlertCircle, iconClass: 'text-red-600', bar: 'bg-red-500' },
  info: { icon: Info, iconClass: 'text-brand-600', bar: 'bg-brand-500' },
}

function ToastItem({ toast, onDismiss }) {
  const { icon: Icon, iconClass, bar } = TONE[toast.tone]
  const [paused, setPaused] = useState(false)
  const remaining = useRef(DURATION[toast.tone])
  const startedAt = useRef(0)

  // auto close, pauses on hover
  useEffect(() => {
    if (paused) return undefined
    startedAt.current = Date.now()
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current -= Date.now() - startedAt.current
    }
  }, [paused, toast.id, onDismiss])

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="toast-enter pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl bg-white py-3 pl-4 pr-3 text-sm text-slate-800 shadow-xl shadow-slate-900/15 ring-1 ring-slate-200"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} aria-hidden="true" />
      <Icon size={18} className={`mt-0.5 shrink-0 ${iconClass}`} aria-hidden="true" />
      <p className="min-w-0 flex-1 leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-m-1 shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

// keeps the toasts and shows them top right
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((tone, message) => {
    if (!message) return
    const id = ++nextId.current
    setToasts((list) => [...list, { id, tone, message }].slice(-MAX_VISIBLE))
  }, [])

  const api = useMemo(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-4 sm:inset-x-auto sm:right-0 sm:w-96 sm:items-end sm:px-6"
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
