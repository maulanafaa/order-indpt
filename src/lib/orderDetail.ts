/**
 * Order detail helpers: find an order (placed, demo or seed, with local status
 * changes), and the copy for the Status hero and Order status timeline
 * (Figma 110:723 Status hero, 110:687 Order timeline).
 */
import type { Order, OrderMethod } from '../data/schema'
import { seedOrders } from './data'
import { demoOrders } from './demoOrders'
import { applyPatch, useOrderUpdates } from './orderUpdates'
import { useOrders } from './orders'
import { time12 } from './format'

/** The order with this id, or null. */
export function useOrder(id: string | undefined): Order | null {
  const placed = useOrders((s) => s.placed)
  const patch = useOrderUpdates((s) => (id ? s.patches[id] : undefined))
  if (!id) return null
  const base = placed.find((o) => o.id === id) ?? demoOrders().find((o) => o.id === id) ?? seedOrders.find((o) => o.id === id)
  return base ? applyPatch(base, patch) : null
}

export type HeroTone = 'dark' | 'success' | 'base' | 'error'
export type Stage = 'placed' | 'preparing' | 'ready' | 'arrived' | 'done' | 'cancelled'

export function stageOf(o: Order): Stage {
  switch (o.status) {
    case 'placed':
    case 'accepted':
      return 'placed'
    case 'pickedUp':
      return 'done'
    default:
      return o.status
  }
}

/** "6:41 PM" in this device's time. */
export const clock = (iso?: string | null) => time12(iso)
/** "Tue, 29 Sep 2026 · 6:41 PM". */
export function dateTime(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-GB', { weekday: 'short' })
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${day}, ${date} · ${clock(iso)}`
}

const at = (o: Order, status: Order['status']) => o.timeline.find((t) => t.status === status)?.at

export type Hero = { label: string; tone: HeroTone }

const readyHero: Record<OrderMethod, string> = { pickup: 'Ready to collect', carhop: 'Ready for you', dineIn: 'Ready at the counter' }
const doneHero: Record<OrderMethod, string> = { pickup: 'Picked up', carhop: 'Delivered', dineIn: 'Collected' }

/** Figma "Status hero" (Status × Order type): the order number with a status tag. */
export function heroFor(o: Order): Hero {
  switch (stageOf(o)) {
    case 'placed':
      return { label: o.scheduled ? 'Order scheduled' : 'Order placed', tone: 'dark' }
    case 'preparing':
      return { label: 'Being prepared', tone: 'dark' }
    case 'ready':
      return { label: readyHero[o.method], tone: 'success' }
    case 'arrived':
      // Carhop after I'm here (same words as the Active order card).
      return { label: 'Delivering to you', tone: 'dark' }
    case 'done':
      return { label: doneHero[o.method], tone: 'base' }
    case 'cancelled':
      return { label: 'Order cancelled', tone: 'error' }
  }
}

export type StepState = 'done' | 'current' | 'upcoming' | 'failed'
export type Step = { status: Order['status']; label: string; time?: string; state: StepState }

const readyLabel: Record<OrderMethod, string> = { pickup: 'Ready for pickup', carhop: 'Ready for you', dineIn: 'Ready at the counter' }
const doneLabel: Record<OrderMethod, string> = { pickup: 'Picked up', carhop: 'Delivered to your car', dineIn: 'Collected' }

/** Order status timeline steps (Figma Order timeline variants). */
export function stepsFor(o: Order): Step[] {
  if (stageOf(o) === 'cancelled') {
    const cancelledAt = at(o, 'cancelled') ?? o.refund?.refundedAt
    return [
      { status: 'placed', label: 'Order placed', time: clock(o.placedAt), state: 'done' },
      {
        status: 'cancelled',
        label: 'Cancelled by store',
        time: `${clock(cancelledAt)} · ${o.refund ? 'Refund added to your INDPT balance' : `Full refund sent to ${paymentLabelOf(o)}`}`,
        state: 'failed',
      },
    ]
  }
  const order: Stage[] = ['placed', 'preparing', 'ready', 'done']
  // Arrived is part of Ready for carhop.
  const stage = stageOf(o) === 'arrived' ? 'ready' : stageOf(o)
  const idx = order.indexOf(stage)
  const state = (i: number): StepState => (i < idx || stage === 'done' ? 'done' : i === idx ? 'current' : 'upcoming')
  const placed = clock(o.placedAt)
  const prep = clock(at(o, 'preparing'))
  const ready = clock(at(o, 'ready'))
  const done = clock(o.completedAt ?? at(o, 'pickedUp'))
  return [
    { status: 'placed', label: 'Order placed', time: placed, state: state(0) },
    { status: 'preparing', label: 'Preparing', time: state(1) === 'current' ? `Started ${prep}` : state(1) === 'done' ? prep : undefined, state: state(1) },
    {
      status: 'ready',
      label: readyLabel[o.method],
      time: state(2) === 'current' ? `Ready since ${ready}` : state(2) === 'done' ? ready : 'We’ll notify you',
      state: state(2),
    },
    { status: 'pickedUp', label: doneLabel[o.method], time: state(3) === 'done' ? done : undefined, state: state(3) },
  ]
}

/** Line totals: checkout orders store add-ons in unitPrice; older seeds list them separately. */
export function lineTotals(o: Order): number[] {
  const plain = o.items.map((i) => i.unitPrice * i.quantity)
  if (Math.abs(plain.reduce((a, b) => a + b, 0) - o.subtotal) < 0.01) return plain
  return o.items.map((i) => (i.unitPrice + i.modifiers.reduce((s, m) => s + m.price * m.quantity, 0)) * i.quantity)
}

/** "No onion · Extra jalapeño · + Original Fries · “note”" for an order line. */
export function lineOptions(i: Order['items'][number]) {
  const parts = i.modifiers.map((m) => {
    const label = /^(extra|no|add|less|without)\b/i.test(m.name) ? m.name : `+ ${m.name}`
    return m.quantity > 1 ? `${m.quantity}× ${label}` : label
  })
  if (i.note) parts.push(`“${i.note}”`)
  return parts.join(' · ')
}

/** The card part of a payment label: "INDPT balance + mada •••• 4417" gives "mada •••• 4417". */
export const cardPart = (label?: string) => (label?.includes('+') ? label.split('+').pop()!.trim() : (label ?? ''))

/** "mada •••• 4417": the saved label, or one made from a seed's payment id (pm-mada-4417). */
export function paymentLabelOf(o: Order) {
  if (o.paymentLabel) return o.paymentLabel
  const m = /^pm-(mada|visa|mastercard)-(\d{4})$/.exec(o.paymentMethodId)
  if (m) return `${m[1] === 'mada' ? 'mada' : m[1][0].toUpperCase() + m[1].slice(1)} •••• ${m[2]}`
  return o.paymentMethodId === 'apple-pay' ? 'Apple Pay' : 'Card'
}
