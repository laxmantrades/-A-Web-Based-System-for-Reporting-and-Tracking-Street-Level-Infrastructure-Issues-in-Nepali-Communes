import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { makePinIcon } from '../../lib/mapPin'

// small map with one pin, can't be moved or zoomed
export default function StaticMap({ lat, lng }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current || !elRef.current) return undefined

    const map = L.map(elRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      tap: false,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    L.marker([lat, lng], { icon: makePinIcon(), interactive: false }).addTo(map)

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={elRef}
      role="img"
      aria-label="Map of the reported location"
      className="relative z-0 h-48 w-full overflow-hidden rounded-xl border border-slate-200"
    />
  )
}
