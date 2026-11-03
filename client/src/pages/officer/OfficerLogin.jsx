import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import OfficerAuthLayout from '../../components/officer/OfficerAuthLayout'
import { signInOfficer } from '../../lib/officerApi'

const GENERIC_ERROR = 'Incorrect email or password.'

const fieldClass =
  'mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 outline-none transition-colors hover:bg-white focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100'

export default function OfficerLogin() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setError('')

    if (!identifier.trim() || !password) {
      setError(GENERIC_ERROR)
      return
    }

    setSubmitting(true)
    try {
      const { redirect } = await signInOfficer({
        identifier: identifier.trim(),
        password,
      })
      navigate(redirect || '/officer', { replace: true })
    } catch (err) {
      setError(err.message || GENERIC_ERROR)
      setSubmitting(false)
    }
  }

  return (
    <OfficerAuthLayout
      title="Officer Sign In"
      subtitle="Municipal staff access only"
      footer={
        <p className="text-xs leading-relaxed text-slate-500">
          This is a restricted system for authorized municipal staff.
          Unauthorized access attempts are logged.
        </p>
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
              htmlFor="identifier"
              className="block text-sm font-semibold text-slate-800"
            >
              Username or email
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your work email"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              className={fieldClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-800"
              >
                Password
              </label>
              <Link
                to="/officer/forgot-password"
                className="text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-1.5">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                data-1p-ignore="true"
                data-lpignore="true"
                className="min-h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-11 text-slate-900 outline-none transition-colors hover:bg-white focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-70"
          >
            {submitting && (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            )}
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </fieldset>
      </form>
    </OfficerAuthLayout>
  )
}
