/**
 * Area name for a map position ("Al Malqa, Riyadh") from OpenStreetMap's
 * Nominatim reverse geocoder. Results are cached by ~1 km cell and calls are
 * made only after the map settles, well inside Nominatim's 1 request/second rule.
 */
import type { LatLng } from './geo'

type NominatimAddress = Partial<
  Record<'neighbourhood' | 'suburb' | 'quarter' | 'city_district' | 'district' | 'city' | 'town' | 'village' | 'municipality' | 'state' | 'country', string>
>

const cache = new Map<string, string | null>()
const key = (p: LatLng) => `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`

export async function placeName(p: LatLng, signal?: AbortSignal): Promise<string | null> {
  const k = key(p)
  if (cache.has(k)) return cache.get(k) ?? null
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&addressdetails=1&accept-language=en&lat=${p.lat}&lon=${p.lng}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const data = (await res.json()) as { address?: NominatimAddress }
  const a = data.address ?? {}
  const area = a.neighbourhood ?? a.suburb ?? a.quarter ?? a.city_district ?? a.district
  // Nominatim often has no city in KSA: fall back to the region without "Region"/"Province".
  const city = a.city ?? a.town ?? a.village ?? a.state?.replace(/\s+(Region|Province|Governorate)$/i, '')
  const name = [area, city].filter(Boolean).join(', ') || a.country || null
  cache.set(k, name)
  return name
}
