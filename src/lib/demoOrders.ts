/**
 * Full example orders for the demo branches (lib/demoBranches.ts), so their
 * active order cards open a real Order detail page. Times are anchored to when
 * the app was opened, so they don't drift while you look at them.
 */
import type { Order, OrderItem, OrderStatus } from '../data/schema'
import { round2 } from './cart'
import { demoBranches, type DemoOrder } from './demoBranches'
import { groupsByItem, itemBySlug, modifiersByGroup } from './data'
import { PARTIAL_BALANCE } from './balance'

const START = Math.floor(Date.now() / 60_000) * 60_000
const at = (minutes: number) => new Date(START + minutes * 60_000).toISOString()

/** An order line from the catalog, with add-ons found by name. */
function line(slug: string, quantity: number, modifierNames: string[] = []): OrderItem | null {
  const item = itemBySlug.get(slug)
  if (!item) return null
  const mods = (groupsByItem.get(item.id) ?? []).flatMap((g) => modifiersByGroup.get(g.id) ?? [])
  const modifiers = modifierNames
    .map((n) => mods.find((m) => m.name === n))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map((m) => ({ modifierId: m.id, name: m.name, quantity: 1, price: m.price }))
  // unitPrice includes add-ons, like orders placed at checkout.
  const unitPrice = round2(item.price + modifiers.reduce((s, m) => s + m.price, 0))
  return { itemId: item.id, name: item.name, quantity, unitPrice, modifiers }
}

/** The Figma order: Salt Burger, Spanish Latte, Original Beef Slider, 2 Lotus Softie. */
const figmaItems = () =>
  [
    line('salt-burger', 1, ['Extra Jalapeno Sliced', 'Sweet Potato Fries']),
    line('spanish-latte-cold', 1, ['Oat Milk']),
    line('original-beef-slider', 1, ['Extra Pickle']),
    line('lotus-softie', 2),
  ].filter((l): l is OrderItem => Boolean(l))

/** Minutes after placing when each step happened (demo). */
const STEP_AT: Partial<Record<OrderStatus, number>> = { placed: 0, preparing: 3, ready: 10, pickedUp: 14 }

function build(storeId: string, d: DemoOrder): Order {
  const items = figmaItems()
  const total = round2(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0))
  const done = d.status === 'pickedUp'
  // Active orders were placed a few minutes ago; the picked up one about 20 minutes ago.
  const placedAt = done ? -20 : d.status === 'ready' ? -12 : -5
  const reached = (['placed', 'preparing', 'ready', 'pickedUp'] as const).slice(0, ['placed', 'preparing', 'ready', 'pickedUp'].indexOf(d.status) + 1)
  const timeline = reached.map((s) => ({ status: s, at: at(placedAt + (STEP_AT[s] ?? 0)) }))
  const balance = d.balance === 'full' ? total : d.balance === 'partial' ? PARTIAL_BALANCE : 0
  return {
    id: `SLT-${d.number}`,
    userId: 'user-demo',
    storeId,
    method: d.method,
    status: d.status,
    placedAt: at(placedAt),
    completedAt: done ? at(placedAt + (STEP_AT.pickedUp ?? 0)) : null,
    items,
    subtotal: total,
    discount: 0,
    total,
    promoCode: null,
    paymentMethodId: balance >= total ? 'balance' : 'pm-mada-4417',
    paymentLabel: balance >= total ? 'INDPT balance' : balance > 0 ? 'INDPT balance + mada •••• 4417' : 'mada •••• 4417',
    ...(balance > 0 ? { balanceUsed: balance } : {}),
    carId: d.method === 'carhop' ? 'car-land-cruiser' : null,
    ...(d.method === 'carhop' ? { carDetails: 'Toyota Land Cruiser, White · Plate RKD 4821' } : {}),
    // Dine-in: arriving in 30 minutes. Others: ready around 15 minutes after placing.
    readyAt: at(d.method === 'dineIn' ? 30 : placedAt + 15),
    scheduled: d.method === 'dineIn',
    note: 'sauces on the side',
    refund: null,
    timeline,
  }
}

let cache: Order[] | null = null

/** Every demo branch order (built once, after the catalog has loaded). */
export function demoOrders(): Order[] {
  if (!cache || cache.length === 0 || cache.some((o) => o.items.length === 0)) {
    cache = Object.entries(demoBranches).flatMap(([storeId, b]) => (b.orders ?? []).map((d) => build(storeId, d)))
  }
  return cache
}
