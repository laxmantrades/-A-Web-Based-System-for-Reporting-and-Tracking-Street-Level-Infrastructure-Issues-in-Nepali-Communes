import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import {
  ClipboardCheck,
  Loader2,
  Mail,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react'

import { formatDateTime } from '../../lib/reportStatus'
import {
  fetchStaff,
  inviteStaff,
  resendStaffInvite,
  setStaffActive,
  updateStaff,
} from '../../lib/officerAdminApi'
import OfficerShell from '../../components/officer/OfficerShell'
import ConfirmDialog from '../../components/officer/ConfirmDialog'
import { useToast } from '../../lib/toast'

const inputClass =
  'mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:bg-white focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100'
const labelClass = 'block text-sm font-semibold text-slate-800'

// what each role can do
const ROLES = [
  {
    value: 'officer',
    label: 'Officer',
    icon: ClipboardCheck,
    can: [
      'Review the queue of citizen reports',
      'Approve, reject and update report status',
      'Black out faces and number plates, add notes',
      'See analytics',
    ],
  },
  {
    value: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    can: [
      'Everything an officer can do',
      'Add staff and choose their role',
      'Deactivate or reactivate staff',
      'Change photo-classifier settings',
    ],
  },
]

const STATUS_BADGE = {
  invited: 'bg-amber-50 text-amber-800 ring-amber-200',
  active: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  deactivated: 'bg-slate-100 text-slate-600 ring-slate-200',
}
const STATUS_LABEL = { invited: 'Invited', active: 'Active', deactivated: 'Deactivated' }

const EMPTY_FORM = { name: '', email: '', jobTitle: '', role: 'officer', ward: '' }

function AddStaffForm({ onAdded, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(event) {
    event.preventDefault()
    if (saving) return
    setError('')
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and work email are required.')
      return
    }
    setSaving(true)
    try {
      const row = await inviteStaff({
        name: form.name.trim(),
        email: form.email.trim(),
        jobTitle: form.jobTitle.trim(),
        role: form.role,
        ward: form.ward === '' ? null : Number(form.ward),
      })
      onAdded(row)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Add a staff member</h2>
          <p className="mt-1 text-sm text-slate-500">
            We’ll email them a setup code. They choose their own password — you never see it.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <form onSubmit={submit} noValidate className="mt-5">
        <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="staff-name" className={labelClass}>Full name</label>
            <input id="staff-name" value={form.name} onChange={set('name')} className={inputClass} autoFocus />
          </div>
          <div>
            <label htmlFor="staff-email" className={labelClass}>Work email</label>
            <input
              id="staff-email"
              type="email"
              value={form.email}
              onChange={set('email')}
              autoCapitalize="none"
              spellCheck={false}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="staff-title" className={labelClass}>
              Job title <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="staff-title"
              value={form.jobTitle}
              onChange={set('jobTitle')}
              placeholder="e.g. Ward engineer"
              maxLength={80}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="staff-ward" className={labelClass}>
              Ward <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="staff-ward"
              type="number"
              min={1}
              value={form.ward}
              onChange={set('ward')}
              placeholder="Leave empty for all wards"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <p className={labelClass}>Role</p>
            <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
              {ROLES.map((r) => {
                const Icon = r.icon
                const selected = form.role === r.value
                return (
                  <label
                    key={r.value}
                    className={`flex cursor-pointer gap-3 rounded-xl p-3.5 ring-1 transition-colors ${
                      selected ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-slate-50 ring-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="staff-role"
                      value={r.value}
                      checked={selected}
                      onChange={set('role')}
                      className="sr-only"
                    />
                    <Icon size={18} className={selected ? 'text-brand-700' : 'text-slate-500'} aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{r.label}</span>
                      <span className="block text-xs text-slate-500">{r.can.slice(0, 2).join(' · ')}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 disabled:opacity-70"
            >
              <Mail size={15} aria-hidden="true" />
              {saving ? 'Sending invite…' : 'Send invite'}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  )
}

// Admin only: staff list. Add (sends invite), change role, resend invite,
// deactivate / reactivate.
export default function OfficerStaff() {
  const { officer } = useOutletContext()
  const navigate = useNavigate()
  const toast = useToast()

  const [staff, setStaff] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [confirmOff, setConfirmOff] = useState(null) // row to deactivate

  const isAdmin = officer.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    fetchStaff()
      .then(setStaff)
      .catch((err) => {
        if (err.unauthorized) navigate('/officer/login', { replace: true })
        else setLoadError(err.message)
      })
  }, [isAdmin, navigate])

  if (!isAdmin) return <Navigate to="/officer/queue" replace />

  const replaceRow = (row) => setStaff((list) => list.map((s) => (s.id === row.id ? row : s)))

  async function act(id, fn, successText) {
    setBusyId(id)
    try {
      const row = await fn()
      replaceRow(row)
      toast.success(successText)
    } catch (err) {
      if (err.unauthorized) navigate('/officer/login', { replace: true })
      else toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <OfficerShell
      officer={officer}
      hero={{
        eyebrow: 'Admin',
        title: 'Staff',
        subtitle: 'Add staff members, choose their role, and switch off access when someone leaves.',
        actions: !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-lg hover:bg-brand-50"
          >
            <UserPlus size={16} aria-hidden="true" />
            Add staff member
          </button>
        ),
      }}
    >
      {adding && (
        <AddStaffForm
          onCancel={() => setAdding(false)}
          onAdded={(row) => {
            setStaff((list) => [row, ...(list || [])])
            setAdding(false)
            toast.success(`Invite sent to ${row.email}. They have 48 hours to set up their account.`)
          }}
        />
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {ROLES.map((r) => {
          const Icon = r.icon
          return (
            <section key={r.value} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <h2 className="text-sm font-bold text-slate-900">{r.label}</h2>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                {r.can.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span aria-hidden="true" className="text-brand-500">•</span>
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
        {loadError ? (
          <p role="alert" className="p-6 text-sm text-red-700">{loadError}</p>
        ) : !staff ? (
          <div className="flex justify-center p-10">
            <Loader2 className="animate-spin text-slate-400" aria-label="Loading staff" />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {staff.map((s) => {
              const isSelf = s.id === officer.id
              const busy = busyId === s.id
              return (
                <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                      {s.name}
                      {isSelf && <span className="text-xs font-normal text-slate-400">(you)</span>}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_BADGE[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </span>
                    </p>
                    <p className="truncate text-sm text-slate-500">{s.email}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {[s.jobTitle, s.ward ? `Ward ${s.ward}` : 'All wards'].filter(Boolean).join(' · ')}
                      {' · '}
                      {s.status === 'invited'
                        ? s.inviteExpiresAt && new Date(s.inviteExpiresAt) > new Date()
                          ? `Invite expires ${formatDateTime(s.inviteExpiresAt)}`
                          : 'Invite expired'
                        : s.lastLoginAt
                          ? `Last sign-in ${formatDateTime(s.lastLoginAt)}`
                          : 'Never signed in'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`role-${s.id}`}>Role for {s.name}</label>
                    <select
                      id={`role-${s.id}`}
                      value={s.role}
                      disabled={isSelf || busy || s.status === 'deactivated'}
                      title={isSelf ? 'You cannot change your own role' : undefined}
                      onChange={(e) =>
                        act(s.id, () => updateStaff(s.id, { role: e.target.value }), `${s.name} is now ${e.target.value === 'admin' ? 'an admin' : 'an officer'}.`)
                      }
                      className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                      <option value="officer">Officer</option>
                      <option value="admin">Admin</option>
                    </select>

                    {s.status === 'invited' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act(s.id, () => resendStaffInvite(s.id), `New invite sent to ${s.email}.`)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Resend invite
                      </button>
                    )}

                    {!isSelf &&
                      (s.status === 'deactivated' ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(s.id, () => setStaffActive(s.id, true), `${s.name} can sign in again.`)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirmOff(s)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                        >
                          Deactivate
                        </button>
                      ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirmOff)}
        title={confirmOff ? `Deactivate ${confirmOff.name}?` : ''}
        message="They will be signed out everywhere and won't be able to sign in. Their past work on reports stays. You can reactivate them later."
        confirmLabel="Deactivate"
        danger
        busy={busyId === confirmOff?.id}
        onCancel={() => setConfirmOff(null)}
        onConfirm={async () => {
          const row = confirmOff
          await act(row.id, () => setStaffActive(row.id, false), `${row.name} has been deactivated.`)
          setConfirmOff(null)
        }}
      />
    </OfficerShell>
  )
}
