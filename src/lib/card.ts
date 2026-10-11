/**
 * Card entry at checkout (Figma "Payment options" with Card selected).
 * The prototype never stores a full card number: only brand and last 4
 * digits go on the order.
 */
import type { BrandName } from '../components/ui/PaymentBrand'

export type CardFields = { number: string; expiry: string; cvv: string; name: string }
export type CardErrors = Partial<Record<keyof CardFields, string>>

export const emptyCard = (name = ''): CardFields => ({ number: '', expiry: '', cvv: '', name })

const digits = (v: string) => v.replace(/\D/g, '')

/** A few mada BIN prefixes, enough for the demo cards (4417..., 5588..., 9682...). */
const MADA_PREFIXES = ['4417', '4406', '4464', '4578', '4847', '5043', '5297', '5588', '6046', '9682']

export function detectBrand(number: string): Exclude<BrandName, 'applePay'> | null {
  const d = digits(number)
  if (d.length < 4) return null
  if (MADA_PREFIXES.some((p) => d.startsWith(p))) return 'mada'
  if (d.startsWith('4')) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard'
  return null
}

/** "4417 1234 5678 4417" while typing. */
export const formatCardNumber = (v: string) =>
  digits(v)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')

/** "08/27" while typing. */
export function formatExpiry(v: string) {
  const d = digits(v).slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

export const formatCvv = (v: string) => digits(v).slice(0, 3)

/** Field errors, in the order the form shows them. Empty object when the card can be charged. */
export function validateCard(card: CardFields, now = new Date()): CardErrors {
  const errors: CardErrors = {}
  const number = digits(card.number)
  if (!number) errors.number = 'Enter your card number'
  else if (number.length < 16) errors.number = 'Card number is incomplete'

  const [mm, yy] = card.expiry.split('/')
  const month = Number(mm)
  if (!card.expiry) errors.expiry = 'Enter the expiry date'
  else if (!yy || yy.length < 2 || month < 1 || month > 12) errors.expiry = 'Enter a valid date'
  else {
    const year = 2000 + Number(yy)
    // A card is valid until the end of its expiry month.
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) errors.expiry = 'Card has expired'
  }

  if (digits(card.cvv).length < 3) errors.cvv = 'Enter the 3 digits'
  if (!card.name.trim()) errors.name = 'Enter the name on the card'
  return errors
}

const brandLabel: Record<Exclude<BrandName, 'applePay'>, string> = { mada: 'mada', visa: 'Visa', mastercard: 'Mastercard' }

/** "mada •••• 4417" for the order. */
export function cardLabel(card: CardFields) {
  const brand = detectBrand(card.number)
  const last4 = digits(card.number).slice(-4)
  return `${brand ? brandLabel[brand] : 'Card'} •••• ${last4}`
}
