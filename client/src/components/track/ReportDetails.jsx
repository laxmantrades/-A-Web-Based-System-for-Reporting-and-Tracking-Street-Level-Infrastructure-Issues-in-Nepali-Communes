import { EyeOff, MapPin, MessageSquareText } from 'lucide-react'

import { locationLabel } from '../../lib/location'

function Label({ children }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </p>
  )
}

// photo (with moderation), location and note. Never shows the email (API doesn't send it).
export default function ReportDetails({ report }) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Photo</Label>
        {report.photoStatus === 'hidden' || !report.photoUrl ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-sm text-ink-soft">
            <EyeOff size={16} aria-hidden="true" />
            Photo hidden by moderator
          </div>
        ) : (
          <figure>
            <img
              src={report.photoUrl}
              alt="The problem that was reported"
              loading="lazy"
              className="max-h-96 w-full rounded-2xl bg-slate-900 object-contain shadow-sm"
            />
            {report.photoStatus === 'redacted' && (
              <figcaption className="mt-1.5 text-xs text-ink-soft">
                This photo has been edited by a moderator to remove personal details.
              </figcaption>
            )}
          </figure>
        )}
      </div>

      <div>
        <Label>Location</Label>
        <p className="flex items-start gap-1.5 text-sm font-medium text-ink">
          <MapPin size={15} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
          <span>
            {locationLabel(report)}
            {report.locationDescription && report.location?.address && (
              <span className="block text-xs font-normal text-ink-soft">
                {report.location.address}
              </span>
            )}
          </span>
        </p>
      </div>

      {report.note && (
        <div>
          <Label>Note from the person who reported this</Label>
          <p className="flex gap-2 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-ink ring-1 ring-slate-200">
            <MessageSquareText size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            {report.note}
          </p>
        </div>
      )}
    </div>
  )
}
