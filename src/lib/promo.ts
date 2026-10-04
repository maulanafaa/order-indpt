/**
 * Promo rules. Codes are case-insensitive, one per order. "Today" is the
 * real date, so the seeds in data/promos.json decide what is valid.
 */
import type { OrderMethod, Promo } from '../data/schema'
import { lineTotal, round2, type CartLine } from './cart'
import { itemById, methodLabels, promos } from './data'

export type PromoContext = {
  lines: CartLine[]
  subtotal: number
  method: OrderMethod | null
  today?: Date
}

export type PromoCheck =
  | { ok: true; promo: Promo; discount: number }
  | { ok: false; promo: Promo | null; reason: 'notFound' | 'expired' | 'notStarted' | 'method' | 'minOrder' | 'requirement'; shortBy?: number }

export const findPromo = (code: string) => promos.find((p) => p.code === code.trim().toUpperCase()) ?? null

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

export function checkPromo(code: string, ctx: PromoContext): PromoCheck {
  const promo = findPromo(code)
  if (!promo) return { ok: false, promo: null, reason: 'notFound' }
  const today = isoDay(ctx.today ?? new Date())
  if (today > promo.validUntil) return { ok: false, promo, reason: 'expired' }
  if (today < promo.validFrom) return { ok: false, promo, reason: 'notStarted' }
  if (ctx.method && !promo.methods.includes(ctx.method)) return { ok: false, promo, reason: 'method' }
  if (ctx.subtotal < promo.minOrder) return { ok: false, promo, reason: 'minOrder', shortBy: round2(promo.minOrder - ctx.subtotal) }

  if (promo.type === 'freeItem') {
    const hasRequired = !promo.requiresCategoryId || ctx.lines.some((l) => itemById.get(l.itemId)?.categoryId === promo.requiresCategoryId)
    const free = ctx.lines.find((l) => l.itemId === promo.freeItemId)
    if (!hasRequired || !free) return { ok: false, promo, reason: 'requirement' }
    return { ok: true, promo, discount: round2(lineTotal({ ...free, quantity: 1 })) }
  }
  const raw = promo.type === 'percent' ? (ctx.subtotal * promo.value) / 100 : promo.value
  const capped = promo.maxDiscount != null ? Math.min(raw, promo.maxDiscount) : raw
  return { ok: true, promo, discount: round2(Math.min(capped, ctx.subtotal)) }
}

/** "31 Oct 2026" */
export const promoDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** "Carhop orders only", "Pickup and Dine-in only" */
export function methodsText(methods: OrderMethod[]) {
  const names = methods.map((m) => methodLabels[m])
  return names.length === 1 ? `${names[0]} orders only` : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} only`
}

/** Offers shown in the promo sheet: current promos only (not expired, already started). */
export function availableOffers(today = new Date()) {
  const d = isoDay(today)
  return promos.filter((p) => p.validFrom <= d && p.validUntil >= d)
}

/** Big stub text on the voucher: "15%" + "OFF", "FREE" + "FRIES". */
export function stubText(p: Promo) {
  if (p.type === 'percent') return { value: `${p.value}%`, label: 'Off' }
  if (p.type === 'freeItem') return { value: 'Free', label: (itemById.get(p.freeItemId ?? '')?.name.split(' ').pop() ?? 'item') }
  return { value: String(p.value), label: 'SAR off' }
}
