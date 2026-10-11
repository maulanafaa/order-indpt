/**
 * Checkout choices, persisted so a refresh keeps them: order method, time,
 * car, payment method, note and promo code. Reset when the cart's store changes.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Car, OrderMethod, PaymentMethod, StoreService, User } from '../data/schema'
import { round2 } from './cart'
import { supportedServices } from './data'

/** As soon as possible, or a slot (store time) today or tomorrow. */
export type TimeChoice = { kind: 'asap' } | { kind: 'later'; dayOffset: 0 | 1; minutes: number }

/** A card entered at checkout without "Save this card": used for this order only. */
export type OneOffCard = Pick<PaymentMethod, 'brand' | 'last4' | 'expiry'> & { id: 'card-once'; bank?: string }

/** "apple-pay", "cash", a saved card id, or "card-once". */
export type PaymentChoice = string

type CheckoutState = {
  storeSlug: string | null
  method: OrderMethod | null
  time: TimeChoice
  /** Dine-in arrival: "asap" or minutes (store time, today). */
  dineIn: 'asap' | number
  note: string
  /** Contact name typed at checkout (saved to the profile when placing). */
  name: string | null
  payment: PaymentChoice | null
  oneOffCard: OneOffCard | null
  carId: string | null
  /** Carhop: the car as typed at checkout ("Toyota Land Cruiser, White · Plate RKD 4821"). Null until edited. */
  carText: string | null
  /** A car added without saving it to the profile. */
  oneOffCar: Car | null
  promoCode: string | null
  set: (patch: Partial<Omit<CheckoutState, 'set' | 'startFor' | 'reset'>>) => void
  /** Called when checkout opens for a store: keeps choices for the same store, else starts fresh. */
  startFor: (storeSlug: string) => void
  reset: () => void
}

const fresh = {
  storeSlug: null,
  method: null,
  time: { kind: 'asap' } as TimeChoice,
  dineIn: 'asap' as const,
  note: '',
  name: null,
  payment: null,
  oneOffCard: null,
  carId: null,
  carText: null,
  oneOffCar: null,
  promoCode: null,
}

export const useCheckout = create<CheckoutState>()(
  persist(
    (set) => ({
      ...fresh,
      set: (patch) => set(patch),
      startFor: (storeSlug) =>
        set((s) => (s.storeSlug === storeSlug ? s : { ...fresh, payment: s.payment, carId: s.carId, carText: s.carText, storeSlug })),
      reset: () => set({ ...fresh }),
    }),
    { name: 'order-indpt-checkout', version: 1 },
  ),
)

export const APPLE_PAY = 'apple-pay'
export const CASH = 'cash'
/** A card typed into the inline card form at checkout. */
export const CARD = 'card'

/** Checkout payment options: Apple Pay (when this device has it, chosen by default) or a card. */
export type CheckoutPayment = typeof APPLE_PAY | typeof CARD
export function resolvePayment(choice: PaymentChoice | null, applePay: boolean): CheckoutPayment {
  if (choice === CARD) return CARD
  return applePay ? APPLE_PAY : CARD
}

/** "Toyota Land Cruiser, White · Plate RKD 4821" for the carhop field. */
export const carText = (c: { make: string; model: string; colour: string; plate: string }) =>
  [`${c.make} ${c.model}`.trim() + (c.colour ? `, ${c.colour}` : ''), c.plate ? `Plate ${c.plate}` : ''].filter(Boolean).join(' · ')

/**
 * Tiles for the order method picker: unsupported methods are hidden,
 * paused ones go to the end (disabled).
 */
export function methodTiles(storeId: string): StoreService[] {
  const all = supportedServices(storeId)
  return [...all.filter((s) => s.availableNow), ...all.filter((s) => !s.availableNow)]
}

/** The leftmost available method, or the stored one when it is still available. */
export function resolveMethod(storeId: string, chosen: OrderMethod | null): OrderMethod | null {
  const tiles = methodTiles(storeId)
  if (chosen && tiles.some((t) => t.method === chosen && t.availableNow)) return chosen
  return tiles.find((t) => t.availableNow)?.method ?? null
}

/** Default payment: the user's default card, else nothing (they must choose). */
export function defaultPayment(user: User | null): PaymentChoice | null {
  return user?.paymentMethods.find((p) => p.isDefault && p.brand !== 'applePay')?.id ?? null
}

/** VAT is included in menu prices (15%): the VAT part of a total. */
export const vatIncluded = (total: number) => round2((total * 15) / 115)

export type PaymentDisplay = { id: string; icon: 'card' | 'cash' | 'wallet'; title: string; subtitle: string; isCard: boolean }

const brandName: Record<PaymentMethod['brand'], string> = { mada: 'mada', visa: 'Visa', mastercard: 'Mastercard', applePay: 'Apple Pay' }

/** Title and subtitle for a payment choice: "mada •••• 4417", "Al Rajhi Bank · Expires 08/28". */
export function describePayment(choice: PaymentChoice | null, user: User | null, oneOff: OneOffCard | null): PaymentDisplay | null {
  if (!choice) return null
  if (choice === APPLE_PAY) return { id: choice, icon: 'wallet', title: 'Apple Pay', subtitle: 'Pay with Face ID', isCard: false }
  if (choice === CASH) return { id: choice, icon: 'cash', title: 'Cash', subtitle: 'Pay at the counter when you collect', isCard: false }
  const card = choice === 'card-once' ? oneOff : user?.paymentMethods.find((p) => p.id === choice)
  if (!card || card.brand === 'applePay') return null
  const parts = [card.bank, card.expiry ? `Expires ${card.expiry}` : null].filter(Boolean)
  return {
    id: choice,
    icon: 'card',
    title: `${brandName[card.brand]} •••• ${card.last4}`,
    subtitle: choice === 'card-once' ? `This order only · Expires ${card.expiry}` : parts.join(' · '),
    isCard: true,
  }
}

/** "Toyota Land Cruiser · White" */
export const carTitle = (c: { make: string; model: string; colour: string }) => `${c.make} ${c.model}`.trim() + (c.colour ? ` · ${c.colour}` : '')
