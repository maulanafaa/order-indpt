/**
 * In-progress orders for the branch page banner and map pins.
 * Real orders come from lib/orders (placed in this browser or loaded from
 * Supabase). The demo flag ?order=scheduled|placed|preparing|ready|delivering|done|multi adds
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
import { time12 } from './format'

/** Figma "Active order" Status: scheduled for later, placed, preparing, ready, delivering (carhop, after I'm here), done. */
export type ActiveStage = 'scheduled' | 'placed' | 'preparing' | 'ready' | 'delivering' | 'done'

export type ActiveOrder = {
  id: string
  /** "48201": the order number customers show at the counter. */
  number: string
  storeId: string
  method: OrderMethod
  stage: ActiveStage
  /** Chosen pickup or arrival time (ISO). */
  readyAt?: string
  /** When the order was handed over (ISO). */
  completedAt?: string
}

/** Orders picked up within this window still show on the branch page. */
const DONE_WINDOW_MS = 30 * 60_000
/** Older open orders are treated as finished (the prototype has no live status). */
const ACTIVE_WINDOW_MS = 6 * 3600_000

function stageOf(order: Order, now: number): ActiveStage | null {
  const placed = new Date(order.placedAt).getTime()
  // A scheduled order stays active until a while after its time.
  const until = Math.max(placed, order.readyAt ? new Date(order.readyAt).getTime() : 0) + ACTIVE_WINDOW_MS
  const open = now < until
  switch (order.status) {
    case 'placed':
    case 'accepted':
      return open ? (order.scheduled ? 'scheduled' : 'placed') : null
    case 'preparing':
      return open ? 'preparing' : null
    case 'ready':
      return open ? 'ready' : null
    case 'arrived':
      return open ? (order.method === 'carhop' ? 'delivering' : 'ready') : null
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
    readyAt: order.readyAt,
    completedAt: order.completedAt ?? undefined,
  }
}

/** Example orders for ?order=... (Figma 2.1 to 2.5). */
function flagOrders(flag: OrderFlag, storeId: string, now: number): ActiveOrder[] {
  const base = { storeId, method: 'pickup' as const }
  const iso = (minutes: number) => new Date(now + minutes * 60_000).toISOString()
  if (flag === 'multi') {
    return [
      { ...base, id: 'SLT-48201', number: '48201', stage: 'ready', readyAt: iso(-2) },
      { ...base, id: 'SLT-51930', number: '51930', stage: 'preparing', readyAt: iso(20) },
    ]
  }
  // Delivering only exists for Carhop.
  const method = flag === 'delivering' ? ('carhop' as const) : base.method
  return [
    {
      ...base,
      method,
      id: 'SLT-48201',
      number: '48201',
      stage: flag,
      readyAt: iso(flag === 'scheduled' ? 90 : 20),
      completedAt: flag === 'done' ? iso(-5) : undefined,
    },
  ]
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


/** "Arrive 7:15 PM", "Tomorrow, 7:30 AM" or "Sat 17 Oct, 7:30 AM" for a later day. */
function arriveText(iso?: string, now = Date.now()) {
  if (!iso) return ''
  const d = new Date(iso)
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(d) - day(new Date(now))) / 86_400_000)
  if (diff <= 0) return `Arrive ${time12(iso)}`
  if (diff === 1) return `Tomorrow, ${time12(iso)}`
  return `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time12(iso)}`
}

const methodWord: Record<OrderMethod, string> = { pickup: 'pickup', carhop: 'carhop', dineIn: 'dine-in' }
const doneWord: Record<OrderMethod, string> = { pickup: 'Picked up', carhop: 'Delivered', dineIn: 'Collected' }

export type ActiveCopy = {
  title: string
  detail: string
  icon: 'clock' | 'desk-bell' | 'chef-hat' | 'bag' | 'car' | 'check'
  /** Green card (Ready to collect, Ready at the counter). */
  success?: boolean
  /** Carhop ready: an I'm here button instead of the chevron. */
  imHere?: boolean
}

/** Copy per status and order type (Figma "Active order"). */
export function activeCopy(o: ActiveOrder, now = Date.now()): ActiveCopy {
  switch (o.stage) {
    case 'scheduled':
      return { title: `Scheduled ${methodWord[o.method]}`, detail: arriveText(o.readyAt, now), icon: 'clock' }
    case 'placed':
      return { title: 'Order placed', detail: arriveText(o.readyAt, now) || 'Waiting for confirmation', icon: 'desk-bell' }
    case 'preparing':
      return { title: 'Being prepared', detail: 'We’ll notify you when it’s ready', icon: 'chef-hat' }
    case 'ready':
      if (o.method === 'carhop') return { title: 'Ready for you', detail: 'Tap when you arrive', icon: 'car', imHere: true }
      return { title: o.method === 'dineIn' ? 'Ready at the counter' : 'Ready to collect', detail: 'Show your order number', icon: 'bag', success: true }
    case 'delivering':
      return { title: 'Delivering to you', detail: 'Be ready in your car', icon: 'car' }
    case 'done':
      return {
        title: doneWord[o.method],
        detail: o.completedAt ? `${doneWord[o.method]} at ${time12(o.completedAt)}` : doneWord[o.method],
        icon: 'check',
      }
  }
}
