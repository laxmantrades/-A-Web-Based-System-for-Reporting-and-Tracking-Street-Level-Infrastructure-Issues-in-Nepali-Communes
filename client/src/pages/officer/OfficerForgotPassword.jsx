import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import OfficerAuthLayout from '../../components/officer/OfficerAuthLayout'
import {
  requestOfficerPasswordReset,
  verifyOfficerResetCode,
  resetOfficerPassword,
} from '../../lib/officerApi'
import { checkPasswordRules } from '../../lib/passwordRules'

const inputClass =
  'mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 outline-none transition-colors hover:bg-white focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100'
const buttonClass =
  'inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-70'
const labelClass = 'block text-sm font-semibold text-slate-800'

// same 1 minute wait as the server
const RESEND_SECONDS = 60

// text for the two modes, same backend
const COPY = {
  reset: {
    titles: {
      email: 'Reset your password',
      code: 'Check your email',
      password: 'Set a new password',
      done: 'Password updated',
    },
    intro: 'Enter your work email and we’ll send you a 6-digit verification code.',
    codeHelp: 'It expires in 10 minutes.',
    submit: 'Update password',
    done:
      'Your password has been updated and all existing sessions were signed out. You can now sign in with your new password.',
  },
  setup: {
    titles: {
      email: 'Set up your account',
      code: 'Enter your setup code',
      password: 'Choose your password',
      done: 'Your account is ready',
    },
    intro: 'Enter the work email your admin added, and we’ll send you a new setup code.',
    codeHelp: 'Use the code from your invite email. If it has expired, tap “Resend code”.',
    submit: 'Create my password',
    done: 'Your password is set. Sign in to start reviewing reports.',
  },
}

// Forgot password (mode="reset") and new staff setup (mode="setup").
//   1. email    - same reply always (skipped if the link has ?email=)
//   2. code     - 6 digits (10 min for reset, 48h for invite)
//   3. password - set it, logs out everywhere
export default function OfficerForgotPassword({ mode = 'reset' }) {
  const copy = COPY[mode]
  const [params] = useSearchParams()
  const invitedEmail = params.get('email') || ''
  const [step, setStep] = useState(invitedEmail ? 'code' : 'email') // email | code | password | done
  const [email, setEmail] = useState(invitedEmail)
  const [code, setCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  async function sendCode() {
    await requestOfficerPasswordReset(email.trim())
    setResendIn(RESEND_SECONDS)
  }

  async function handleEmail(event) {
    event.preventDefault()
    if (submitting) return
    setError('')
    if (!email.trim()) {
      setError('Enter your work email.')
      return
    }
    setSubmitting(true)
    try {
      await sendCode()
      setStep('code')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (resendIn > 0 || submitting) return
    setError('')
    setNotice('')
    try {
      await sendCode()
      setCode('')
      setNotice('If that email matches an active staff account, a new code is on its way.')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCode(event) {
    event.preventDefault()
    if (submitting) return
    setError('')
    setNotice('')
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from the email.')
      return
    }
    setSubmitting(true)
    try {
      setResetToken(await verifyOfficerResetCode({ email: email.trim(), code }))
      setStep('password')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePassword(event) {
    event.preventDefault()
    if (submitting) return
    setError('')
    const ruleError = checkPasswordRules(newPassword)
    if (ruleError) {
      setError(ruleError)
      return
    }
    if (newPassword !== confirm) {
      setError('The passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await resetOfficerPassword({ token: resetToken, newPassword })
      setStep('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function startOver() {
    setStep('email')
    setCode('')
    setResetToken('')
    setNewPassword('')
    setConfirm('')
    setError('')
    setNotice('')
  }

  return (
    <OfficerAuthLayout
      title={copy.titles[step]}
      subtitle="Municipal staff access only"
      footer={
        <Link
          to="/officer/login"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to sign in
        </Link>
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
        </div>
      )}

      {step === 'email' && (
        <form onSubmit={handleEmail} noValidate>
          <fieldset disabled={submitting} className="space-y-5">
            <p className="text-sm leading-relaxed text-slate-600">
              {copy.intro}
            </p>
            <div>
              <label htmlFor="reset-email" className={labelClass}>
                Work email
              </label>
              <input
                id="reset-email"
                name="reset-email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your work email"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore="true"
                data-lpignore="true"
                className={inputClass}
              />
            </div>
            <button type="submit" className={buttonClass}>
              {submitting ? 'Sending…' : 'Send code'}
            </button>
          </fieldset>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleCode} noValidate>
          <fieldset disabled={submitting} className="space-y-5">
            <p className="text-sm leading-relaxed text-slate-600">
              {invitedEmail && mode === 'setup' && email === invitedEmail ? (
                <>
                  Setting up <span className="font-semibold text-slate-800">{email}</span>.{' '}
                </>
              ) : (
                <>
                  If <span className="font-semibold text-slate-800">{email.trim()}</span>{' '}
                  matches an active staff account, we’ve emailed it a 6-digit code.{' '}
                </>
              )}
              {copy.codeHelp}
            </p>
            <div>
              <label htmlFor="reset-code" className={labelClass}>
                Verification code
              </label>
              <input
                id="reset-code"
                name="reset-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                autoFocus
                className={`${inputClass} text-center font-mono text-2xl tracking-[0.5em]`}
              />
            </div>
            <button type="submit" className={buttonClass}>
              {submitting ? 'Checking…' : 'Verify code'}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={startOver}
                className="font-medium text-slate-600 hover:text-slate-900"
              >
                Use a different email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendIn > 0}
                className="font-medium text-brand-700 hover:text-brand-800 disabled:text-slate-400"
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handlePassword} noValidate>
          <fieldset disabled={submitting} className="space-y-5">
            <div>
              <label htmlFor="newPassword" className={labelClass}>
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                At least 10 characters, with at least one letter and one number.
              </p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className={labelClass}>
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
            <button type="submit" className={buttonClass}>
              {submitting ? 'Saving…' : copy.submit}
            </button>
          </fieldset>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-slate-700">{copy.done}</p>
          <Link to="/officer/login" className={buttonClass}>
            Go to sign in
          </Link>
        </div>
      )}
    </OfficerAuthLayout>
  )
}
