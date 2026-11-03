import SectionHeading from './SectionHeading'
import { steps } from '../data/steps'

// icon colour per step
const CHIP = [
  'from-brand-500 to-brand-700 shadow-brand-500/30',
  'from-blue-500 to-indigo-600 shadow-blue-500/30',
  'from-emerald-500 to-teal-600 shadow-emerald-500/30',
]

// "How it works" steps (data in data/steps.js)
export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-24">
      <div className="section-shell">
        <SectionHeading eyebrow="How it works" title="From photo to fix in three steps">
          You do two of the steps. A ward officer does the middle one.
        </SectionHeading>

        <ol className="relative mt-16 grid gap-6 md:grid-cols-3 md:gap-8">
          {/* line between the steps on wide screens */}
          <span
            aria-hidden="true"
            className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-0.5 bg-gradient-to-r from-brand-200 via-blue-200 to-emerald-200 md:block"
          />

          {steps.map((step, i) => (
            <li key={step.id} className="relative text-center">
              <span
                className={`relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg ring-8 ring-white ${CHIP[i % CHIP.length]}`}
              >
                <step.Icon size={24} aria-hidden="true" />
              </span>

              <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Step {step.id}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      step.audience === 'You'
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {step.audience}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
