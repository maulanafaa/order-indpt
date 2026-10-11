/**
 * Built-in demo branches: each one shows a different state without any URL
 * flag, so a tester can open the branch and see it. Listed in TESTING.md
 * ("Demo branches"). Turn them all off with ?demo=off.
 *
 *   Riyadh (default location)
 *     salt-u-walk            open, no active orders (the clean base for flags)
 *     salt-saad-square       active Carhop order, being prepared
 *     salt-riyadh-park-mall  active Pickup order, ready to collect
 *     salt-nakheel-mall-riyadh  two active Pickup orders (ready + being prepared)
 *     salt-jaks-riyadh       online ordering paused (from the data, not this file)
 *   Eastern Province (?near=khobar)
 *     salt-al-bahar-resort-khobar  active Dine-in order, order placed
 *     salt-olaya-khobar      opening soon (in 25 min): Order ahead
 *     salt-west-field        closed: Schedule order for tomorrow
 *   AlUla
 *     salt-al-ula            order just picked up: Enjoy your meal!
 */
import type { OrderMethod, OrderStatus } from '../data/schema'
import type { StoreFlag } from './scenarios'

/** An example order on a demo branch. Full orders are built in lib/demoOrders.ts. */
export type DemoOrder = { number: string; method: OrderMethod; status: OrderStatus; balance?: 'partial' | 'full' }
export type DemoBranch = {
  /** Shown in the docs. */
  label: string
  /** Opening state forced for this branch (opening soon, or closed). */
  state?: Extract<StoreFlag, 'soon' | 'closed'>
  orders?: DemoOrder[]
}

/** Keyed by store id (slug in the comment). */
export const demoBranches: Record<string, DemoBranch> = {
  // salt-saad-square
  'store-7': { label: 'Active Carhop order', orders: [{ number: '48310', method: 'carhop', status: 'preparing' }] },
  // salt-riyadh-park-mall
  'store-1': { label: 'Active Pickup order', orders: [{ number: '48201', method: 'pickup', status: 'ready' }] },
  // salt-nakheel-mall-riyadh
  'store-5': {
    label: 'Several active Pickup orders',
    orders: [
      { number: '51930', method: 'pickup', status: 'ready' },
      { number: '51947', method: 'pickup', status: 'preparing', balance: 'partial' },
    ],
  },
  // salt-al-bahar-resort-khobar
  'store-79': { label: 'Active Dine-in order', orders: [{ number: '60412', method: 'dineIn', status: 'placed' }] },
  // salt-olaya-khobar
  'store-2': { label: 'Opening soon', state: 'soon' },
  // salt-west-field
  'store-6': { label: 'Closed, schedule order', state: 'closed' },
  // salt-al-ula
  'store-4': { label: 'Order just picked up', orders: [{ number: '70118', method: 'pickup', status: 'pickedUp', balance: 'full' }] },
}

/** Opening state for a demo branch, or null. */
export function demoStateFor(storeId: string, enabled: boolean): StoreFlag | null {
  return enabled ? (demoBranches[storeId]?.state ?? null) : null
}
