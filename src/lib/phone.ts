/**
 * Mobile numbers for the checkout number check (Figma 4.7 "Verify your number").
 * Gulf countries only; numbers are typed without the country code.
 */
export type PhoneCountry = {
  id: 'SA' | 'AE' | 'QA' | 'KW' | 'BH' | 'OM'
  name: string
  dial: string
  /** Digits in a local mobile number. */
  length: number
  /** A valid local mobile number (digits only). */
  pattern: RegExp
  /** Digit groups for display, e.g. [2, 3, 4] → "55 123 4567". */
  groups: number[]
}

export const phoneCountries: PhoneCountry[] = [
  { id: 'SA', name: 'Saudi Arabia', dial: '+966', length: 9, pattern: /^5\d{8}$/, groups: [2, 3, 4] },
  { id: 'AE', name: 'UAE', dial: '+971', length: 9, pattern: /^5\d{8}$/, groups: [2, 3, 4] },
  { id: 'QA', name: 'Qatar', dial: '+974', length: 8, pattern: /^[3567]\d{7}$/, groups: [4, 4] },
  { id: 'KW', name: 'Kuwait', dial: '+965', length: 8, pattern: /^[569]\d{7}$/, groups: [4, 4] },
  { id: 'BH', name: 'Bahrain', dial: '+973', length: 8, pattern: /^[36]\d{7}$/, groups: [4, 4] },
  { id: 'OM', name: 'Oman', dial: '+968', length: 8, pattern: /^[79]\d{7}$/, groups: [4, 4] },
]

export const countryById = new Map(phoneCountries.map((c) => [c.id, c]))

/** Digits only, without a leading 0, cut to the country's length. */
export const cleanDigits = (value: string, c: PhoneCountry) => value.replace(/\D/g, '').replace(/^0+/, '').slice(0, c.length)

/** "551234567" → "55 123 4567" (partial input is fine). */
export function formatLocal(digits: string, c: PhoneCountry) {
  const parts: string[] = []
  let i = 0
  for (const g of c.groups) {
    const part = digits.slice(i, i + g)
    if (part) parts.push(part)
    i += g
  }
  return parts.join(' ')
}

/** Placeholder in the same groups: "xx xxx xxxx". */
export const placeholderFor = (c: PhoneCountry) => c.groups.map((g) => 'x'.repeat(g)).join(' ')

export const isValidMobile = (digits: string, c: PhoneCountry) => c.pattern.test(digits)
