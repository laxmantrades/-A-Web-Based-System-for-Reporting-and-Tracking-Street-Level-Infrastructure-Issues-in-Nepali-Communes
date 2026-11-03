import { Check } from 'lucide-react'

import { formatStamp } from '../../lib/reportStatus'

// vertical status timeline. Done = green tick, current = pulsing, future = grey.
// rows come from buildTimeline()
export default function StatusTimeline({ rows }) {
  return (
    <ol className="print:break-inside-avoid">
      {rows.map((row, i) => {
        const last = i === rows.length - 1
        const done = row.state === 'done'
        const current = row.state === 'current'

        return (
          <li key={row.key} className="flex gap-4">
            {/* dot + line to the next dot */}
            <div className="flex flex-col items-center">
              <span className="relative grid h-8 w-8 shrink-0 place-items-center">
                {current && (
                  <span className="absolute inset-0 rounded-full bg-amber-400/40 motion-safe:animate-ping" />
                )}
                <span
                  className={[
                    'relative grid h-8 w-8 place-items-center rounded-full',
                    done
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                      : current
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                        : 'bg-white text-slate-300 ring-2 ring-inset ring-slate-200',
                  ].join(' ')}
                >
                  {done ? (
                    <Check size={16} strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-current" />
                  )}
                </span>
              </span>
              {!last && (
                <span
                  className={`my-1 w-0.5 flex-1 rounded-full ${done ? 'bg-emerald-400' : 'bg-slate-200'}`}
                />
              )}
            </div>

            {/* step text */}
            <div className={`min-w-0 flex-1 pt-1 ${last ? 'pb-0' : 'pb-7'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`font-semibold ${row.state === 'future' ? 'text-slate-400' : 'text-ink'}`}
                >
                  {row.label}
                </p>
                {current && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    Now
                  </span>
                )}
              </div>

              {row.timestamp && row.state !== 'future' && (
                <p className="mt-0.5 text-xs text-ink-soft">{formatStamp(row.timestamp)}</p>
              )}

              {row.note && (
                <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-ink shadow-sm ring-1 ring-slate-200">
                  {row.note}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
