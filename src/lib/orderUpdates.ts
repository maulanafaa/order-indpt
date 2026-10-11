/**
 * Local changes to orders the prototype cannot change on a server: the status
 * picked in the Order status sheet (prototype control) and the carhop I'm here
 * details. Applied on top of placed, demo and seed orders. Persisted.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Order } from '../data/schema'

export type OrderPatch = Partial<Pick<Order, 'status' | 'timeline' | 'completedAt' | 'arrivedAt' | 'parkingSpot' | 'carDetails'>>

type UpdatesState = {
  patches: Record<string, OrderPatch>
  patch: (id: string, patch: OrderPatch) => void
}

export const useOrderUpdates = create<UpdatesState>()(
  persist(
    (set) => ({
      patches: {},
      patch: (id, patch) => set((s) => ({ patches: { ...s.patches, [id]: { ...s.patches[id], ...patch } } })),
    }),
    { name: 'order-indpt-order-updates', version: 1 },
  ),
)

export const applyPatch = (order: Order, patch?: OrderPatch): Order => (patch ? { ...order, ...patch } : order)

/** Statuses in the order a timeline moves through them. */
const flow: Order['status'][] = ['placed', 'preparing', 'ready', 'arrived', 'pickedUp']

/**
 * Prototype: move an order to a status. The timeline is rebuilt so earlier
 * steps keep their times and later ones are dropped; a step reached now gets now.
 */
export function moveTo(order: Order, status: Order['status'], now = new Date()): OrderPatch {
  const keep = order.timeline.filter((t) => t.status !== 'accepted' && flow.indexOf(t.status) >= 0 && flow.indexOf(t.status) <= flow.indexOf(status))
  const have = new Set(keep.map((t) => t.status))
  const timeline = [...keep]
  for (const s of flow.slice(0, flow.indexOf(status) + 1)) {
    if (!have.has(s) && s !== 'arrived') timeline.push({ status: s, at: now.toISOString() })
  }
  if (status === 'arrived' && !have.has('arrived')) timeline.push({ status: 'arrived', at: now.toISOString() })
  timeline.sort((a, b) => flow.indexOf(a.status) - flow.indexOf(b.status))
  const done = timeline.find((t) => t.status === 'pickedUp')
  const arrived = timeline.find((t) => t.status === 'arrived')
  return {
    status,
    timeline,
    completedAt: done ? done.at : null,
    arrivedAt: arrived ? arrived.at : undefined,
  }
}
