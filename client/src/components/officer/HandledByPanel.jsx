import { Lock, Mail, Phone, Users } from 'lucide-react'

import { formatDateTime } from '../../lib/reportStatus'
import OfficerAvatar from './OfficerAvatar'

// staff who worked on the report, newest first. currentId gets "you"
export default function HandledByPanel({ people = [], currentId }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
      <div className="flex items-start gap-3 px-5 pb-3 pt-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
          <Users size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">Handled by</h2>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <Lock size={11} aria-hidden="true" />
            Visible to staff only
          </p>
        </div>
      </div>

      {people.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-slate-500">No one has worked on this report yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {people.map((p) => {
            const isYou = p.id === currentId
            return (
              <li key={p.id} className="flex items-start gap-3 px-5 py-3.5">
                <OfficerAvatar officer={p} className="h-10 w-10 text-xs ring-2 ring-white shadow" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-1.5 text-sm font-semibold text-slate-900">
                    <span className="truncate">{p.name}</span>
                    {isYou && <span className="text-xs font-medium text-slate-400">(you)</span>}
                    {!p.active && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Inactive
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs capitalize text-slate-500">
                    {p.jobTitle || p.role || 'Staff'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Last edited {formatDateTime(p.lastAt)}
                    {p.changes > 1 ? ` · ${p.changes} changes` : ''}
                  </p>
                </div>

                {!isYou && (
                  <div className="flex shrink-0 items-center gap-1">
                    {p.email && (
                      <a
                        href={`mailto:${p.email}`}
                        title={`Email ${p.email}`}
                        aria-label={`Email ${p.name}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-700"
                      >
                        <Mail size={14} aria-hidden="true" />
                      </a>
                    )}
                    {p.phone && (
                      <a
                        href={`tel:${p.phone.replace(/\s+/g, '')}`}
                        title={`Call ${p.phone}`}
                        aria-label={`Call ${p.name}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-700"
                      >
                        <Phone size={14} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
