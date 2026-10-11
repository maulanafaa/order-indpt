/**
 * In-progress orders for the branch page banner, the floating pill and map pins.
 * Real orders come from lib/orders (placed in this browser or loaded from
 * Supabase). The demo flag ?order=placed|preparing|ready|done|multi adds
 * example orders to the branch being viewed (or SALT U Walk on Find a store),
 * and the built-in demo branches (lib/demoBranches.ts) always have theirs.
 */
import { useMemo } from 'react'
import type { Order, OrderMethod } from '../data/schema'
import { demoOrders } from './demoOrders'
import { applyPatch, useOrderUpdates } from './orderUpdates'
import { useOrders } from './orders'
import { useScenario, type OrderFlag } from './scenarios'
import { useNow } from './useNow'

export type ActiveStage = 'placed' | 'preparing' | 'ready' | 'done'

export type ActiveOrder = {
  id: string
  /** "48201": the order number customers show at the counter. */
  number: string
  storeId: string
  method: OrderMethod
  stage: ActiveStage
  /** "19:05": ready time while preparing, pickup time when done. */
  time?: string
}

/** Orders picked up within this window still show "Enjoy your meal!". */
const DONE_WINDOW_MS = 30 * 60_000
/** Older open orders are treated as finished (the prototype has no live status). */
const ACTIVE_WINDOW_MS = 6 * 3600_000

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (iso?: string | null) => {
  if (!iso) return undefined
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function stageOf(order: Order, now: number): ActiveStage | null {
  const placed = new Date(order.placedAt).getTime()
  switch (order.status) {
    case 'placed':
    case 'accepted':
      return now - placed < ACTIVE_WINDOW_MS ? 'placed' : null
    case 'preparing':
      return now - placed < ACTIVE_WINDOW_MS ? 'preparing' : null
    case 'ready':
    case 'arrived':
      return now - placed < ACTIVE_WINDOW_MS ? 'ready' : null
    case 'pickedUp':
      return order.completedAt && now - new Date(order.completedAt).getTime() < DONE_WINDOW_MS ? 'done' : null
    default:
      return null
  }
}

export function toActive(order: Order, now = Date.now()): ActiveOrder | null {
  const stage = stageOf(order, now)
  if (!stage) return null
  return {
    id: order.id,
    number: order.id.replace(/^SLT-/, ''),
    storeId: order.storeId,
    method: order.method,
    stage,
    time: stage === 'done' ? clock(order.completedAt) : clock(order.readyAt),
  }
}

/** Example orders for ?order=... (Figma 2.1 and 2.4). */
function flagOrders(flag: OrderFlag, storeId: string, now: number): ActiveOrder[] {
  const base = { storeId, method: 'pickup' as const }
  const soon = clock(new Date(now + 20 * 60_000).toISOString())
  const justNow = clock(new Date(now - 5 * 60_000).toISOString())
  if (flag === 'multi') {
    return [
      { ...base, id: 'SLT-48201', number: '48201', stage: 'ready' },
      { ...base, id: 'SLT-51930', number: '51930', stage: 'preparing', time: soon },
    ]
  }
  return [{ ...base, id: 'SLT-48201', number: '48201', stage: flag, time: flag === 'done' ? justNow : soon }]
}

/** Default branch for demo orders on Find a store. */
const DEMO_STORE_ID = 'store-3'

/** Active orders, newest first. Pass a store id to keep only that branch. */
export function useActiveOrders(storeId?: string): ActiveOrder[] {
  const placed = useOrders((s) => s.placed)
  const patches = useOrderUpdates((s) => s.patches)
  const { order: flag, demo: demoOn } = useScenario()
  const clockNow = useNow()
  return useMemo(() => {
    const now = clockNow.getTime()
    // Placed orders and the demo branch orders, with any status picked in the Order status sheet.
    const known = [...placed, ...(demoOn ? demoOrders().filter((d) => !placed.some((p) => p.id === d.id)) : [])]
    const real = known.map((o) => toActive(applyPatch(o, patches[o.id]), now)).filter((o): o is ActiveOrder => Boolean(o))
    const demo = flag ? flagOrders(flag, storeId ?? DEMO_STORE_ID, now) : []
    const all = [...demo, ...real.filter((r) => !demo.some((d) => d.id === r.id))]
    return storeId ? all.filter((o) => o.storeId === storeId) : all
  }, [placed, patches, flag, demoOn, storeId, clockNow])
}

/** Copy per stage. Pickup copy from Figma; Carhop and Dine-in adapt the ready line. */
export function activeCopy(o: ActiveOrder, many = false) {
  switch (o.stage) {
    case 'placed':
      return { title: 'Order placed', detail: 'Waiting for confirmation', icon: 'desk-bell' as const }
    case 'preparing':
      return {
        title: 'Being prepared',
        detail: many && o.time ? `Ready around ${o.time}` : 'We’ll notify you when it’s ready',
        icon: 'chef-hat' as const,
      }
    case 'ready':
      return {
        title: o.method === 'carhop' ? 'Ready, on its way' : o.method === 'dineIn' ? 'Ready, on its way to your table' : 'Ready to collect',
        detail: o.method === 'pickup' ? 'Show your order number' : 'Stay where you are',
        icon: 'order-bag' as const,
      }
    case 'done':
      return { title: 'Enjoy your meal!', detail: o.time ? `Picked up at ${o.time}` : 'Picked up', icon: 'check' as const }
  }
}

/** Pill text: "Order placed", or "2 active orders · 1 ready" for several. */
export function pillText(orders: ActiveOrder[]) {
  if (orders.length === 1) return activeCopy(orders[0]).title
  const ready = orders.filter((o) => o.stage === 'ready').length
  return `${orders.length} active orders${ready ? ` · ${ready} ready` : ''}`
}
