export const LOCATION_DESCRIPTION_MAX = 200

// starting value for LocationPicker
export const EMPTY_LOCATION = { coords: null, description: '' }

// true when there's GPS or a description
export function hasLocation(value) {
  return Boolean(value?.coords || value?.description.trim())
}

// one-line location: citizen's description first, then street name.
// works with a report view or an officer queue row
export function locationLabel(report, fallback = 'Location not given') {
  return (
    report.locationDescription ||
    report.location?.address ||
    report.address ||
    fallback
  )
}
