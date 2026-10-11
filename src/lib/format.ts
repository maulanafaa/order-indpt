import { imageUrl } from './supabase'
/**
 * Prices are numbers in SAR. Always render them with <Price/> (which draws
 * the riyal sign as an SVG); this only formats the number part.
 */
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
