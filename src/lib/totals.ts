import { useCheckout, resolveMethod, vatIncluded } from './checkout'
import { cartCount, cartSubtotal, payableLines, round2, type CartLine } from './cart'
import type { Store } from '../data/schema'
import { checkPromo, type PromoCheck } from './promo'

export type OrderTotals = {
  /** Lines that will be ordered (sold out ones left out). */
  payable: CartLine[]
  count: number
  subtotal: number
  promo: PromoCheck | null
  discount: number
  total: number
  vat: number
}

/** Pure version, for places outside React. */
export function computeTotals(lines: CartLine[], soldOut: Set<string>, promoCode: string | null, method: Parameters<typeof checkPromo>[1]['method']): OrderTotals {
  const payable = payableLines(lines, soldOut)
  const subtotal = cartSubtotal(lines, soldOut)
  const promo = promoCode ? checkPromo(promoCode, { lines: payable, subtotal, method }) : null
  const discount = promo?.ok ? promo.discount : 0
  const total = round2(Math.max(0, subtotal - discount))
  return { payable, count: cartCount(lines, soldOut), subtotal, promo, discount, total, vat: vatIncluded(total) }
}

/** Subtotal, promo, VAT and total for the cart at a store, with the checkout's promo and method. */
export function useOrderTotals(store: Store, lines: CartLine[], soldOut: Set<string>): OrderTotals & { method: ReturnType<typeof resolveMethod> } {
  const promoCode = useCheckout((s) => s.promoCode)
  const chosen = useCheckout((s) => (s.storeSlug === store.slug ? s.method : null))
  const method = resolveMethod(store.id, chosen)
  return { ...computeTotals(lines, soldOut, promoCode, method), method }
}
