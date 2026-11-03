import { useEffect, useRef, useState } from 'react'
import { LocateFixed, MapPin, X } from 'lucide-react'

import { LOCATION_DESCRIPTION_MAX } from '../../lib/location'

// Location: "Use my location" (GPS), a written description, or both.
// With GPS we show the street name from OpenStreetMap (errors ignored).
// value = { coords: { lat, lng, address } | null, description }

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    if (!res.ok) return ''
    const data = await res.json()
    const a = data.address || {}
    const parts = [
      a.road || a.pedestrian || a.footway || a.path || a.neighbourhood,
      a.suburb || a.city_district || a.town,
      a.city || a.village || a.municipality,
    ].filter(Boolean)
    return parts.join(', ') || data.display_name || ''
  } catch {
    return ''
  }
}

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-ink outline-none transition-colors placeholder:text-slate-400 hover:bg-white focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100'

export default function LocationPicker({ value, onChange }) {
  const valueRef = useRef(value)
  const requestIdRef = useRef(0)

  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')

  useEffect(() => {
    valueRef.current = value
  }, [value])

  function setCoords(coords) {
    const next = { ...valueRef.current, coords }
    valueRef.current = next
    onChange(next)
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError('Your browser cannot share a location. Describe the place below instead.')
      return
    }
    setGeoError('')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const requestId = (requestIdRef.current += 1)
        setCoords({ lat, lng, address: '' })
        reverseGeocode(lat, lng).then((address) => {
          if (address && requestId === requestIdRef.current && valueRef.current.coords) {
            setCoords({ lat, lng, address })
          }
        })
      },
      () => {
        setLocating(false)
        setGeoError(
          'Could not get your location. Allow location access, or describe the place below.',
        )
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function clearCoords() {
    requestIdRef.current += 1
    setCoords(null)
  }

  const { coords, description } = value

  return (
    <div>
      {coords ? (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm ring-1 ring-emerald-200">
          <MapPin size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-emerald-900">
              {coords.address || 'Your location is attached'}
            </p>
            <p className="text-xs text-emerald-800/80">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} — the ward office will see this on
              a map.
            </p>
          </div>
          <button
            type="button"
            onClick={clearCoords}
            aria-label="Remove my location"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-emerald-800 hover:bg-emerald-100"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <LocateFixed size={18} aria-hidden="true" />
          {locating ? 'Locating…' : 'Use my location'}
        </button>
      )}

      {geoError && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-brand-700">
          {geoError}
        </p>
      )}

      <label htmlFor="location-description" className="mt-4 block text-sm font-medium text-ink">
        {coords ? 'Add directions (optional)' : 'Or describe where it is'}
      </label>
      <input
        id="location-description"
        type="text"
        value={description}
        maxLength={LOCATION_DESCRIPTION_MAX}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        placeholder="e.g. Ward 6, near Shree Ganesh Temple, Kupondole Road"
        className={`${INPUT} mt-1.5 min-h-[48px]`}
      />
      <p className="mt-1 text-xs text-ink-soft">
        Mention the ward number and a nearby landmark (school, temple, shop, chowk).
      </p>
    </div>
  )
}
