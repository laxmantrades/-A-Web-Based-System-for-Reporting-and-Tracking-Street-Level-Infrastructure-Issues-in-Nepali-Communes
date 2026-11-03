import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  Check,
  ClipboardCheck,
  Lightbulb,
  Wrench,
} from 'lucide-react'

import FieldShell from '../components/report/FieldShell'
import CategoryPicker from '../components/report/CategoryPicker'
import LocationPicker from '../components/report/LocationPicker'
import PhotoInput from '../components/report/PhotoInput'
import PageHero, { PageBody } from '../components/PageHero'
import { submitReport } from '../lib/reportsApi'
import { EMPTY_LOCATION, hasLocation } from '../lib/location'
import { useToast } from '../lib/toast'
import { categories } from '../data/categories'

const NOTE_MAX = 200
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-ink outline-none transition-colors placeholder:text-slate-400 hover:bg-white focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100'

const NEXT_STEPS = [
  {
    Icon: ClipboardCheck,
    title: 'A ward officer reviews it',
    body: 'Usually within a working day. An AI photo check helps them, but a person decides.',
    chip: 'from-blue-500 to-indigo-600',
  },
  {
    Icon: Wrench,
    title: 'It gets scheduled and fixed',
    body: 'Every status change is recorded on your report.',
    chip: 'from-amber-400 to-orange-500',
  },
  {
    Icon: BellRing,
    title: 'You can follow along',
    body: 'Look it up any time on the Track page with your email.',
    chip: 'from-emerald-500 to-teal-600',
  },
]

function validate({ category, location, photo, note, email }) {
  const errors = {}
  if (!category) errors.category = 'Choose the type of problem.'
  if (!hasLocation(location)) {
    errors.location = 'Use your location or describe where it is, so the ward office can find it.'
  }
  if (!photo) errors.photo = 'Add one photo of the problem.'
  else if (!photo.type.startsWith('image/')) errors.photo = 'That file is not an image.'
  if (note.length > NOTE_MAX) errors.note = `Keep the note under ${NOTE_MAX} characters.`
  if (!email.trim()) errors.email = 'Enter your email so you can track this report.'
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address.'
  return errors
}

export default function ReportIssue() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()

  // ?category=pothole picks the category
  const [category, setCategory] = useState(() => {
    const requested = params.get('category')
    return categories.some((c) => c.id === requested) ? requested : ''
  })
  const [location, setLocation] = useState(EMPTY_LOCATION)
  const [photo, setPhoto] = useState(null)
  const [note, setNote] = useState('')
  const [email, setEmail] = useState('')

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const formRef = useRef(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    // 1. check the form
    setSubmitting(true)
    const nextErrors = validate({ category, location, photo, note, email })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setSubmitting(false)
      formRef.current
        ?.querySelector('[data-error="true"]')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }

    // 2 + 3. send it
    setSubmitError('')
    try {
      const result = await submitReport({
        category,
        lat: location.coords?.lat,
        lng: location.coords?.lng,
        address: location.coords?.address,
        locationDescription: location.description.trim(),
        photo,
        note: note.trim(),
        email: email.trim(),
      })

      // 4. success: go to confirmation with the number in the URL (refresh still works)
      toast.success(`Report #${result.referenceId} submitted. Thank you for helping fix your street!`)
      navigate(`/report/confirmation?id=${encodeURIComponent(result.referenceId)}`, {
        replace: true,
      })
    } catch (err) {
      // 4. failed: show error, keep the fields
      setSubmitError(err.message || 'Something went wrong. Please try again in a moment.')
      setSubmitting(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const progress = [
    { label: 'Category', done: Boolean(category) },
    { label: 'Location', done: hasLocation(location) },
    { label: 'Photo', done: Boolean(photo) },
    { label: 'Your email', done: EMAIL_RE.test(email.trim()) },
  ]

  return (
    <>
      <PageHero
        eyebrow="Report an issue"
        title="Report a street problem"
        subtitle="Tell your ward office about a problem on the street. It takes about a minute — pick the type, say where it is, add a photo, and send."
      >
        {/* progress: ticks each step when filled */}
        <ol className="mt-8 flex flex-wrap gap-2">
          {progress.map((step, i) => (
            <li
              key={step.label}
              className={[
                'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors',
                step.done
                  ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30'
                  : 'bg-white/5 text-slate-300 ring-white/15',
              ].join(' ')}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${
                  step.done ? 'bg-emerald-400 text-slate-950' : 'bg-white/15 text-white'
                }`}
                aria-hidden="true"
              >
                {step.done ? <Check size={12} strokeWidth={3} /> : i + 1}
              </span>
              {step.label}
              <span className="sr-only">{step.done ? '(done)' : '(to do)'}</span>
            </li>
          ))}
        </ol>
      </PageHero>

      <PageBody>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            noValidate
            className="rounded-3xl bg-white p-5 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 sm:p-8"
          >
            {submitError && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-2 rounded-2xl bg-brand-50 p-4 text-sm text-brand-800 ring-1 ring-brand-200"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Your report was not sent.</p>
                  <p className="mt-0.5">{submitError}</p>
                </div>
              </div>
            )}

            {/* disable everything while submitting */}
            <fieldset disabled={submitting} className="space-y-9">
              <FieldShell
                as="fieldset"
                step={1}
                label="What's the problem?"
                required
                error={errors.category}
              >
                <div data-error={Boolean(errors.category)}>
                  <CategoryPicker
                    value={category}
                    onChange={(id) => {
                      setCategory(id)
                      setErrors((e) => ({ ...e, category: undefined }))
                    }}
                  />
                </div>
              </FieldShell>

              <FieldShell
                step={2}
                label="Where is it?"
                required
                error={errors.location}
                hint="We use this to route the report to the right ward office."
              >
                <div data-error={Boolean(errors.location)}>
                  <LocationPicker
                    value={location}
                    onChange={(next) => {
                      setLocation(next)
                      setErrors((e) => ({ ...e, location: undefined }))
                    }}
                  />
                </div>
              </FieldShell>

              <FieldShell step={3} label="Add a photo" required error={errors.photo}>
                <div data-error={Boolean(errors.photo)}>
                  <PhotoInput
                    value={photo}
                    onChange={(file) => {
                      setPhoto(file)
                      setErrors((e) => ({ ...e, photo: undefined }))
                    }}
                  />
                </div>
              </FieldShell>

              <FieldShell
                step={4}
                label="Your email"
                htmlFor="email"
                required
                error={errors.email}
                hint="Use this email to track your report. It appears on the public feed once a ward officer has reviewed it."
              >
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`${INPUT} min-h-[48px]`}
                />
              </FieldShell>

              <FieldShell label="Anything else? (optional)" htmlFor="note" error={errors.note}>
                <textarea
                  id="note"
                  value={note}
                  maxLength={NOTE_MAX}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything that might help, e.g. “Deep hole on the left lane, near the temple”"
                  rows={3}
                  className={`${INPUT} resize-y`}
                />
                <div className="mt-1 text-right text-xs text-ink-soft">
                  {note.length}/{NOTE_MAX}
                </div>
              </FieldShell>

              <button
                type="submit"
                className="btn-primary min-h-[52px] w-full rounded-xl text-base shadow-lg shadow-brand-600/25 disabled:opacity-70"
              >
                {submitting ? 'Sending your report…' : 'Send report'}
                {!submitting && <ArrowRight size={18} aria-hidden="true" />}
              </button>
            </fieldset>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-sm font-bold text-ink">What happens next</h2>
              <ol className="mt-4 space-y-4">
                {NEXT_STEPS.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow ${item.chip}`}
                    >
                      <item.Icon size={16} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.title}</p>
                      <p className="text-xs leading-relaxed text-ink-soft">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200">
              <h2 className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <Lightbulb size={16} aria-hidden="true" />
                Tips for a good photo
              </h2>
              <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-amber-900/80">
                <li>• Get the whole problem in the frame, with a bit of street around it.</li>
                <li>• Take it in daylight if you can.</li>
                <li>• Avoid faces and number plates — the photo is shown publicly.</li>
              </ul>
            </div>
          </aside>
        </div>
      </PageBody>
    </>
  )
}
