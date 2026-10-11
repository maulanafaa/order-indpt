/** Countries SALT is in, in the order of the Find a store filter (Figma FilterRow). */
export const countries = [
  { id: 'Saudi Arabia', label: 'Saudi Arabia', cities: ['Riyadh', 'Al Khobar', 'Dammam', 'Makkah', 'Abha', 'AlUla'] },
  { id: 'United Arab Emirates', label: 'UAE', cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah', 'Al Ain'] },
  { id: 'Qatar', label: 'Qatar', cities: ['Doha'] },
  { id: 'Kuwait', label: 'Kuwait', cities: ['Kuwait City', 'Salmiya', 'Al Khiran'] },
  { id: 'Bahrain', label: 'Bahrain', cities: ['Samaheej'] },
] as const

export type CountryId = (typeof countries)[number]['id']

export const countryById = new Map<string, (typeof countries)[number]>(countries.map((c) => [c.id, c]))

/** "Riyadh, Al Khobar and Dammam" (first three cities). */
export function citiesText(country: string) {
  const list = countryById.get(country)?.cities.slice(0, 3) ?? []
  return list.length <= 1 ? (list[0] ?? country) : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}
