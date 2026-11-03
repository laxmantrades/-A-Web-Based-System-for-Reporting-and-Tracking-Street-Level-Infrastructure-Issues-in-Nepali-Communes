import L from 'leaflet'

// red map pin (inline SVG, no image files)
export function makePinIcon() {
  return L.divIcon({
    className: 'merosadak-pin',
    html: `<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 20 12 20s12-11.5 12-20C24 5.373 18.627 0 12 0z" fill="#c8102e"/>
        <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
      </svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 39],
  })
}
