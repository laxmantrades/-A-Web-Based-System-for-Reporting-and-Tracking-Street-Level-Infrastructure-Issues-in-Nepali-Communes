import { useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  Circle,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'

import { formatDateTime } from '../../lib/reportStatus'
import { checkPasswordRules } from '../../lib/passwordRules'
import {
  changeOfficerPassword,
  removeOfficerAvatar,
  updateOfficerProfile,
  uploadOfficerAvatar,
} from '../../lib/officerApi'
import OfficerShell from '../../components/officer/OfficerShell'
import OfficerAvatar from '../../components/officer/OfficerAvatar'
import { useToast } from '../../lib/toast'

const MAX_PHOTO_BYTES = 10 * 1024 * 1024

const inputClass =
  'mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:bg-white focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:text-slate-500 disabled:hover:bg-slate-50'

function Card({ title, description, icon, chip, children }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg ${chip}`}
        >
          {icon}
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Notice({ tone, children }) {
  const styles =
    tone === 'error'
      ? 'bg-red-50 text-red-700 ring-red-200'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl px-3.5 py-2.5 text-sm ring-1 ${styles}`}>
      {children}
    </p>
  )
}

function Rule({ ok, children }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${ok ? 'text-emerald-700' : 'text-slate-500'}`}>
      {ok ? (
        <CheckCircle2 size={14} aria-hidden="true" />
      ) : (
        <Circle size={14} aria-hidden="true" />
      )}
      {children}
    </li>
  )
}

/* ---- photo card ---- */

function PhotoCard({ officer, onUpdated, onUnauthorized }) {
  const toast = useToast()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(null) // 'upload' | 'remove' | null
  const [error, setError] = useState('')

  async function run(kind, action, successText) {
    setBusy(kind)
    setError('')
    try {
      onUpdated(await action())
      toast.success(successText)
    } catch (err) {
      if (err.unauthorized) onUnauthorized()
      else toast.error(err.message)
    } finally {
      setBusy(null)
    }
  }

  function onPick(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // so the same file can be picked again
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file (JPG, PNG, HEIC or WebP).')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('That image is too large. Please use one under 10 MB.')
      return
    }
    run('upload', () => uploadOfficerAvatar(file), 'Profile photo updated.')
  }

  const facts = [
    { label: 'Sign-in email', value: officer.email, icon: Mail },
    { label: 'Role', value: officer.role, icon: ShieldCheck, capitalize: true },
    { label: 'Member since', value: officer.createdAt && formatDateTime(officer.createdAt), icon: BadgeCheck },
    { label: 'Last sign-in', value: officer.lastLoginAt && formatDateTime(officer.lastLoginAt), icon: KeyRound },
  ]

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
      <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
        <div className="relative">
          <OfficerAvatar
            officer={officer}
            className="h-28 w-28 text-3xl ring-4 ring-white shadow-lg"
          />
          {busy && (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-slate-900/50">
              <Loader2 size={24} className="animate-spin text-white" aria-hidden="true" />
            </span>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={Boolean(busy)}
            aria-label="Change photo"
            className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white shadow-md ring-4 ring-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            <Camera size={16} aria-hidden="true" />
          </button>
        </div>

        <h2 className="mt-4 text-lg font-bold text-slate-900">{officer.name}</h2>
        <p className="text-sm capitalize text-slate-500">{officer.jobTitle || officer.role}</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
          >
            <Camera size={15} aria-hidden="true" />
            {busy === 'upload' ? 'Uploading…' : officer.avatarUrl ? 'Change photo' : 'Upload photo'}
          </button>
          {officer.avatarUrl && (
            <button
              type="button"
              onClick={() => run('remove', removeOfficerAvatar, 'Profile photo removed.')}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
            >
              <Trash2 size={15} aria-hidden="true" />
              {busy === 'remove' ? 'Removing…' : 'Remove'}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-400">JPG, PNG or WebP, up to 10 MB. Cropped to a square.</p>
        {error && (
          <div className="mt-3 w-full">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
      </div>

      <dl className="divide-y divide-slate-100 border-t border-slate-100">
        {facts.map((f) => (
          <div key={f.label} className="flex items-center gap-3 px-6 py-3">
            <f.icon size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
            <dt className="text-xs font-medium text-slate-500">{f.label}</dt>
            <dd
              className={`ml-auto min-w-0 truncate text-right text-sm font-medium text-slate-800 ${
                f.capitalize ? 'capitalize' : ''
              }`}
              title={f.value || ''}
            >
              {f.value || '—'}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/* ---- details form ---- */

function DetailsForm({ officer, onUpdated, onUnauthorized }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: officer.name,
    jobTitle: officer.jobTitle,
    phone: officer.phone,
  })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const needsTitle = !officer.jobTitle
  const dirty =
    form.name.trim() !== officer.name ||
    form.jobTitle.trim() !== officer.jobTitle ||
    form.phone.trim() !== officer.phone

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setNotice(null)
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (!dirty || saving) return
    if (form.name.trim().length < 2) {
      setNotice({ tone: 'error', text: 'Please enter your full name.' })
      return
    }
    if (form.jobTitle.trim().length < 2) {
      setNotice({ tone: 'error', text: 'Please enter your job title.' })
      return
    }
    setSaving(true)
    setNotice(null)
    try {
      const updated = await updateOfficerProfile({
        name: form.name.trim(),
        jobTitle: form.jobTitle.trim(),
        phone: form.phone.trim(),
      })
      onUpdated(updated)
      setForm({ name: updated.name, jobTitle: updated.jobTitle, phone: updated.phone })
      toast.success('Your details have been saved.')
    } catch (err) {
      if (err.unauthorized) onUnauthorized()
      else toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      title="Personal details"
      description="How you appear to other staff in the portal."
      icon={<UserRound size={18} aria-hidden="true" />}
      chip="from-blue-500 to-indigo-600 shadow-blue-500/30"
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
            Full name
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              autoComplete="name"
              maxLength={80}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            Job title <span className="text-brand-600">*</span>
            <input
              type="text"
              value={form.jobTitle}
              onChange={set('jobTitle')}
              placeholder="e.g. Ward engineer"
              maxLength={80}
              required
              aria-required="true"
              className={`${inputClass} ${needsTitle ? 'border-amber-300 bg-amber-50/50' : ''}`}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            Phone <span className="font-normal text-slate-400">(optional)</span>
            <input
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={set('phone')}
              autoComplete="tel"
              placeholder="+977 98XXXXXXXX"
              maxLength={30}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
            Sign-in email
            <input type="email" value={officer.email} disabled className={inputClass} />
            <span className="mt-1.5 block text-xs font-normal text-slate-500">
              Your sign-in email can only be changed by an administrator.
            </span>
          </label>
        </div>

        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!dirty || saving}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Card>
  )
}

/* ---- password form ---- */

function PasswordForm({ onUpdated, onUnauthorized }) {
  const toast = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const longEnough = newPassword.length >= 10
  const letterAndNumber = /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword)
  const matches = newPassword.length > 0 && newPassword === confirm

  async function onSubmit(event) {
    event.preventDefault()
    if (saving) return
    setNotice(null)

    if (!currentPassword) {
      setNotice({ tone: 'error', text: 'Enter your current password.' })
      return
    }
    const ruleError = checkPasswordRules(newPassword)
    if (ruleError) {
      setNotice({ tone: 'error', text: ruleError })
      return
    }
    if (!matches) {
      setNotice({ tone: 'error', text: 'The new passwords do not match.' })
      return
    }
    if (newPassword === currentPassword) {
      setNotice({ tone: 'error', text: 'Choose a password you have not used before.' })
      return
    }

    setSaving(true)
    try {
      const data = await changeOfficerPassword({ currentPassword, newPassword })
      if (data.officer) onUpdated(data.officer)
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
      toast.success('Password updated. Any other devices signed in to your account have been signed out.')
    } catch (err) {
      if (err.unauthorized) onUnauthorized()
      else toast.error(err.message || 'Could not change your password.')
    } finally {
      setSaving(false)
    }
  }

  const pw = (value, onChange, id, label) => (
    <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
      {label}
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setNotice(null)
        }}
        autoComplete={id === 'currentPassword' ? 'current-password' : 'new-password'}
        className={inputClass}
      />
    </label>
  )

  return (
    <Card
      title="Change password"
      description="Use at least 10 characters with letters and numbers."
      icon={<KeyRound size={18} aria-hidden="true" />}
      chip="from-brand-500 to-brand-700 shadow-brand-500/30"
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {pw(currentPassword, setCurrentPassword, 'currentPassword', 'Current password')}
        <div className="grid gap-4 sm:grid-cols-2">
          {pw(newPassword, setNewPassword, 'newPassword', 'New password')}
          {pw(confirm, setConfirm, 'confirmPassword', 'Confirm new password')}
        </div>

        <ul className="grid gap-1.5 rounded-xl bg-slate-50 p-3.5 sm:grid-cols-3">
          <Rule ok={longEnough}>At least 10 characters</Rule>
          <Rule ok={letterAndNumber}>A letter and a number</Rule>
          <Rule ok={matches}>Both entries match</Rule>
        </ul>

        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
          >
            {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {saving ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </Card>
  )
}

/* ---- page ---- */

export default function OfficerProfile() {
  const { officer, setOfficer } = useOutletContext()
  const navigate = useNavigate()
  const onUnauthorized = () => navigate('/officer/login', { replace: true })

  return (
    <OfficerShell
      officer={officer}
      hero={{
        eyebrow: 'My profile',
        title: 'Account settings',
        subtitle: 'Update your photo and details, and keep your password secure.',
      }}
    >
      {!officer.jobTitle && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 shadow-sm ring-1 ring-amber-200"
        >
          <BadgeCheck size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
          <p>
            <span className="font-semibold">Add your job title to continue.</span> Colleagues see
            it next to your name on every report you handle, so they know who to ask.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <PhotoCard officer={officer} onUpdated={setOfficer} onUnauthorized={onUnauthorized} />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <DetailsForm officer={officer} onUpdated={setOfficer} onUnauthorized={onUnauthorized} />
          <PasswordForm onUpdated={setOfficer} onUnauthorized={onUnauthorized} />
        </div>
      </div>
    </OfficerShell>
  )
}
