/**
 * Orders: the seeds from data/orders.json plus orders placed in this browser.
 * Persisted so Stage 5 (order tracking, order history) can read them.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Order } from '../data/schema'
import { seedOrders } from './data'

type OrdersState = {
  /** Orders placed in this browser, newest first. */
  placed: Order[]
  add: (order: Order) => void
}

export const useOrders = create<OrdersState>()(
  persist(
    (set) => ({
      placed: [],
      add: (order) => set((s) => ({ placed: [order, ...s.placed.filter((o) => o.id !== order.id)] })),
    }),
    { name: 'order-indpt-orders', version: 1 },
  ),
)

/** Every order the prototype knows about, newest first. */
export const allOrders = (placed: Order[]) => [...placed, ...seedOrders].sort((a, b) => b.placedAt.localeCompare(a.placedAt))

/** "SLT-24091": five digits, not clashing with existing orders. */
export function newOrderId(existing: Order[]) {
  const taken = new Set([...existing, ...seedOrders].map((o) => o.id))
  for (;;) {
    const id = `SLT-${String(20000 + Math.floor(Math.random() * 80000))}`
    if (!taken.has(id)) return id
  }
}
