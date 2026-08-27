import SectionHeading from './SectionHeading'
import { steps } from '../data/steps'

/**
 * Three-step explainer. Data comes from `src/data/steps.js` so the markup
 * here stays a simple `.map()` over that array.
 */
export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="section-shell">
        <SectionHeading eyebrow="How it works" title="From photo to fix in three steps">
          You do two of the steps. A ward officer does the middle one.
        </SectionHeading>

        <ol className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.id}
              className="relative rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <step.Icon size={22} aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
                  Step {step.id} · {step.audience}
                </span>
              </div>

              <h3 className="mt-4 text-lg font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
