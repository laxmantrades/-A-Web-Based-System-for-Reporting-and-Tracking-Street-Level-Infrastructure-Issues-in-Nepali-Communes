import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, Inbox, LogOut, MapPin, UserRound, Users } from 'lucide-react'

import { site } from '../../data/site'
import { logoutOfficer } from '../../lib/officerApi'
import OfficerAvatar from './OfficerAvatar'
import { navyGlow } from '../../lib/brandBackground'

// Officer page frame: dark navbar and page body.
// hero = optional dark header { back, eyebrow, title, subtitle, actions, content },
// content starts overlapping it.
export default function OfficerShell({ officer, hero, children }) {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    await logoutOfficer()
    navigate('/officer/login', { replace: true })
  }

  const navClass = ({ isActive }) =>
    [
      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
      isActive
        ? 'bg-white text-brand-700 shadow-sm'
        : 'text-brand-50/85 hover:bg-white/10 hover:text-white',
    ].join(' ')

  const subtitle = officer.jobTitle || officer.role

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-brand-800 via-brand-700 to-brand-800 text-white shadow-lg shadow-brand-900/25">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              to="/officer/queue"
              aria-label={`${site.name} staff dashboard`}
              className="flex shrink-0 items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-brand-700 shadow-md shadow-brand-900/30">
                <MapPin size={18} aria-hidden="true" />
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-[15px] font-bold tracking-tight text-white">
                  {site.name}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-200">
                  Staff portal
                </span>
              </span>
            </Link>

            {/* icons only on phones, aria-label for screen readers */}
            <nav className="flex items-center gap-1">
              <NavLink to="/officer/queue" aria-label="Review Queue" className={navClass}>
                <Inbox size={15} aria-hidden="true" />
                <span className="hidden whitespace-nowrap sm:inline">Review Queue</span>
              </NavLink>
              <NavLink to="/officer/analytics" aria-label="Analytics" className={navClass}>
                <BarChart3 size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Analytics</span>
              </NavLink>
              {officer.role === 'admin' && (
                <NavLink to="/officer/staff" aria-label="Staff" className={navClass}>
                  <Users size={15} aria-hidden="true" />
                  <span className="hidden sm:inline">Staff</span>
                </NavLink>
              )}
              <NavLink to="/officer/profile" aria-label="My profile" className={navClass}>
                <UserRound size={15} aria-hidden="true" />
                <span className="hidden md:inline">Profile</span>
              </NavLink>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              to="/officer/profile"
              title="My profile"
              className="hidden items-center gap-2.5 rounded-xl py-1 pl-1 pr-2.5 transition-colors hover:bg-white/10 sm:flex"
            >
              <OfficerAvatar officer={officer} className="h-9 w-9 text-xs ring-2 ring-white/40" />
              <span className="leading-tight">
                <span className="block text-sm font-semibold text-white">{officer.name}</span>
                <span className="block text-[11px] capitalize text-brand-200">{subtitle}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-brand-700 disabled:opacity-60"
            >
              <LogOut size={15} aria-hidden="true" />
              <span className="hidden sm:inline">{signingOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </header>

      {hero && (
        <div className="bg-slate-950 text-slate-100" style={navyGlow({ grid: 32, glow: 0.35 })}>
          <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
            {hero.back}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                {hero.eyebrow && (
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                    {hero.eyebrow}
                  </p>
                )}
                <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {hero.title}
                </h1>
                {hero.subtitle && (
                  <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-base">
                    {hero.subtitle}
                  </p>
                )}
              </div>
              {hero.actions}
            </div>
            {hero.content}
          </div>
        </div>
      )}

      <main
        className={`relative mx-auto max-w-6xl px-4 pb-12 sm:px-6 ${
          hero ? '-mt-16' : 'py-6 sm:py-8'
        }`}
      >
        {children}
      </main>
    </div>
  )
}
