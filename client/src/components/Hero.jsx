import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  MapPin,
  ShieldCheck,
  BellRing,
  TrafficCone,
} from 'lucide-react'

import { site } from '../data/site'
import { navyGlow } from '../lib/brandBackground'

const trustPoints = ['Free for residents', 'No account needed', 'Works on any phone']

const TIMELINE = [
  { label: 'Reported', time: 'Mon 9:12', state: 'done' },
  { label: 'Reviewed by ward office', time: 'Mon 11:40', state: 'done' },
  { label: 'Repair in progress', time: 'Today', state: 'current' },
  { label: 'Resolved', time: '', state: 'todo' },
]

// small map for the phone mockup
function MiniMap() {
  return (
    <svg viewBox="0 0 260 120" className="h-full w-full" aria-hidden="true">
      <rect width="260" height="120" fill="#eef2f6" />
      {/* blocks */}
      {[
        [8, 8, 70, 38], [92, 8, 60, 38], [166, 8, 86, 38],
        [8, 62, 50, 50], [72, 62, 80, 50], [166, 62, 40, 50], [220, 62, 32, 50],
      ].map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="4" fill="#e2e8f0" />
      ))}
      <rect x="166" y="62" width="40" height="50" rx="4" fill="#d1fae5" />
      {/* roads */}
      <path d="M0 54 H260" stroke="#ffffff" strokeWidth="12" />
      <path d="M85 0 V120 M159 0 V120 M213 54 V120 M65 54 V120" stroke="#ffffff" strokeWidth="8" />
      <path d="M0 54 H260" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.6" />
      {/* pin */}
      <circle cx="122" cy="54" r="14" fill="#c8102e" opacity="0.15" />
      <path
        d="M122 30c-7.2 0-13 5.6-13 12.6C109 52 122 62 122 62s13-10 13-19.4C135 35.6 129.2 30 122 30z"
        fill="#c8102e"
      />
      <circle cx="122" cy="42.5" r="4.5" fill="#ffffff" />
    </svg>
  )
}

// phone showing a tracked report
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[290px] sm:w-[310px]">
      <div className="rounded-[2.6rem] bg-slate-800 p-2.5 shadow-2xl shadow-black/50 ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[2.1rem] bg-white">
          {/* status bar */}
          <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[10px] font-semibold text-slate-900">
            <span>9:41</span>
            <span className="h-4 w-16 rounded-full bg-slate-900" />
            <span>5G</span>
          </div>

          <div className="px-4 pb-5 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Report #201
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                In progress
              </span>
            </div>

            <div className="mt-3 h-28 overflow-hidden rounded-2xl ring-1 ring-slate-200">
              <MiniMap />
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600">
                <TrafficCone size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">Pothole</p>
                <p className="flex items-center gap-1 truncate text-[11px] text-slate-500">
                  <MapPin size={11} className="shrink-0" />
                  Ringroad, Basundhara
                </p>
              </div>
            </div>

            <ol className="mt-4 space-y-3 border-l-2 border-slate-100 pl-4">
              {TIMELINE.map((step) => (
                <li key={step.label} className="relative">
                  <span
                    className={[
                      'absolute -left-[23px] top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full ring-4 ring-white',
                      step.state === 'done'
                        ? 'bg-emerald-500'
                        : step.state === 'current'
                          ? 'bg-amber-500'
                          : 'bg-slate-200',
                    ].join(' ')}
                  >
                    {step.state === 'done' && <Check size={9} strokeWidth={4} className="text-white" />}
                  </span>
                  <p
                    className={`text-xs font-semibold ${
                      step.state === 'todo' ? 'text-slate-400' : 'text-slate-800'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.time && <p className="text-[10px] text-slate-400">{step.time}</p>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* floating cards (just decoration) */}
      <div className="absolute -left-12 top-20 hidden w-56 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-900/5 motion-safe:animate-float sm:block lg:-left-24">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-[11px] font-bold text-white">
            AS
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-900">Ward officer reviewed it</p>
            <p className="text-[11px] text-slate-500">2 hours after you reported</p>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-6 -right-6 hidden rounded-2xl bg-white px-3.5 py-2.5 shadow-xl ring-1 ring-slate-900/5 motion-safe:animate-float-slow sm:block lg:-right-20">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <BellRing size={12} className="text-brand-500" />
          Email update sent
        </p>
        <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Crew scheduled
        </p>
      </div>
    </div>
  )
}

// Homepage top: text and buttons on the left, phone on the right.
export default function Hero() {
  // title, second line in red
  const [lead, ...rest] = site.tagline.split(/(?<=\.)\s+/)
  const accent = rest.join(' ')

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white" style={navyGlow()}>
      <div className="section-shell relative grid items-center gap-14 pb-36 pt-16 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-44 lg:pt-24">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/15 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            Built for wards in Nepal · मेरो सडक
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            {lead}{' '}
            <span className="bg-gradient-to-r from-brand-400 via-rose-400 to-orange-300 bg-clip-text text-transparent">
              {accent}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-300 lg:mx-0">
            {site.description}
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              to="/report"
              className="btn-primary px-6 py-3.5 text-base shadow-lg shadow-brand-900/40 focus-visible:ring-offset-slate-950"
            >
              Report an issue
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              to="/track"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-6 py-3.5 text-base font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Track a report
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-300 lg:justify-start">
            {trustPoints.map((point) => (
              <li key={point} className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-400" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden="true">
          <PhoneMockup />
        </div>
      </div>
    </section>
  )
}
