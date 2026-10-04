export type LatLng = { lat: number; lng: number }

/** Great-circle distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** "350 m", "1.1 km", "12 km", "850 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  if (km < 100) return `${Math.round(km)} km`
  return `${Math.round(km / 10) * 10} km`
}

/** Opens directions in Google Maps (new tab). */
export const directionsUrl = (p: LatLng) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
