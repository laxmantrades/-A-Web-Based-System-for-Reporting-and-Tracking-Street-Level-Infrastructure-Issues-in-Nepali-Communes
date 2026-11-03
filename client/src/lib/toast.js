import { createContext, useContext } from 'react'

// Toasts. ToastProvider wraps the app so toasts stay after changing page.
//   const toast = useToast()
//   toast.success('Saved.') / toast.error(err.message) / toast.info('...')
// Use for action results. Form errors stay next to the field.
export const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast() must be used inside <ToastProvider>')
  return ctx
}
