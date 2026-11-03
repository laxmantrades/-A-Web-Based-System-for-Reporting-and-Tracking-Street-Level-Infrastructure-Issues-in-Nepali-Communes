import { useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'

import OfficerAuthLayout from '../../components/officer/OfficerAuthLayout'
import { changeOfficerPassword } from '../../lib/officerApi'
import { checkPasswordRules } from '../../lib/passwordRules'
import { useToast } from '../../lib/toast'

const inputClass =
  'mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 outline-none transition-colors hover:bg-white focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100'

export default function OfficerChangePassword() {
  const navigate = useNavigate()
  const toast = useToast()
  const { officer, refresh } = useOutletContext()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setError('')

    if (!currentPassword) {
      setError('Enter your current password.')
      return
    }
    const ruleError = checkPasswordRules(newPassword)
    if (ruleError) {
      setError(ruleError)
      return
    }
    if (newPassword !== confirm) {
      setError('The new passwords do not match.')
      return
    }
    if (newPassword === currentPassword) {
      setError('Choose a password you have not used before.')
      return
    }

    setSubmitting(true)
    try {
      await changeOfficerPassword({ currentPassword, newPassword })
      await refresh()
      toast.success('Password updated.')
      navigate('/officer', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not change your password.')
      setSubmitting(false)
    }
  }

  return (
    <OfficerAuthLayout
      title="Change your password"
      subtitle={
        officer.mustChangePassword
          ? 'Set a new password before continuing to the dashboard.'
          : 'Municipal staff access only'
      }
      footer={
        // forced change: no back button, must change password first
        !officer.mustChangePassword && (
          <Link
            to="/officer/queue"
            className="text-sm font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
          >
            Back to dashboard
          </Link>
        )
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <fieldset disabled={submitting} className="space-y-5">
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-semibold text-slate-800"
            >
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-semibold text-slate-800"
            >
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              At least 10 characters, with at least one letter and one number.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-slate-800"
            >
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-70"
          >
            {submitting ? 'Saving…' : 'Update password'}
          </button>
        </fieldset>
      </form>
    </OfficerAuthLayout>
  )
}
