import { imageUrl } from './supabase'
/**
 * Prices are numbers in SAR. Always render them with <Price/> (which draws
 * the riyal sign as an SVG); this only formats the number part.
 */
/**
 * Times are shown in 12-hour format everywhere: "7:15 PM".
 * Takes "19:15" (store hours, "24:00" is midnight), minutes since midnight, or a date / ISO string (device time).
 */
export function time12(t: string | number | Date | null | undefined): string {
  if (t == null || t === '') return ''
  let h: number
  let m: number
  if (typeof t === 'number') {
    const mins = ((Math.round(t) % 1440) + 1440) % 1440
    h = Math.floor(mins / 60)
    m = mins % 60
  } else if (typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t)) {
    ;[h, m] = t.split(':').map(Number)
  } else {
    const d = new Date(t)
    h = d.getHours()
    m = d.getMinutes()
  }
  h %= 24
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Slug used for image file names and URLs.
 * "Spanish Latte (Iced)" -> "spanish-latte-iced". Keep in sync with
 * scripts/check-images.mjs.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Photos live in the Supabase Storage bucket `images` (upload with npm run images:upload). */
export const menuImage = (slug: string) => imageUrl(`menu/${slug}.webp`)
export const storeImage = (slug: string) => imageUrl(`stores/${slug}.webp`)
