import { MapPin } from 'lucide-react'

import { site } from '../data/site'

/**
 * Wordmark used in the navbar and footer.
 *
 * Props:
 *   - tone: 'dark' (default) for light backgrounds, 'light' for dark ones.
 */
export default function Logo({ tone = 'dark' }) {
  const textColor = tone === 'light' ? 'text-white' : 'text-ink'

  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
        <MapPin size={18} aria-hidden="true" />
      </span>
      <span className={`text-lg font-bold tracking-tight ${textColor}`}>
        {site.name}
      </span>
    </span>
  )
}
