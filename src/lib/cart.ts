/**
 * The cart: one store at a time. Persisted to localStorage so it survives a
 * refresh. Prices are always read from src/data, never stored on the line.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { itemById, modifierById } from './data'

export type CartModifier = { modifierId: string; quantity: number }

export type CartLine = {
  id: string
  itemId: string
  quantity: number
  modifiers: CartModifier[]
  note: string
  /** Add-ons the store stopped offering after this line was added. Shown once as a note, never charged. */
  removedModifierIds?: string[]
}

export type NewLine = Omit<CartLine, 'id'>

type CartState = {
  storeSlug: string | null
  lines: CartLine[]
  /** Adds a line, or bumps the quantity of an identical one. */
  addLine: (storeSlug: string, line: NewLine) => void
  setQuantity: (lineId: string, quantity: number) => void
  /** Replaces a line after Edit (same id, same position). */
  updateLine: (lineId: string, line: NewLine) => void
  /** Drops add-ons the store no longer offers and remembers them for the note. */
  dropModifiers: (unavailable: Set<string>) => void
  /** Demo: start from a given cart (scenario cart=demo). */
  replace: (storeSlug: string, lines: NewLine[]) => void
  removeLine: (lineId: string) => void
  clear: () => void
}

const sameConfig = (a: NewLine, b: NewLine) =>
  a.itemId === b.itemId &&
  a.note.trim() === b.note.trim() &&
  a.modifiers.length === b.modifiers.length &&
  a.modifiers.every((m) => b.modifiers.some((n) => n.modifierId === m.modifierId && n.quantity === m.quantity))

const newId = () => Math.random().toString(36).slice(2, 10)

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      storeSlug: null,
      lines: [],
      addLine: (storeSlug, line) =>
        set((s) => {
          const lines = s.storeSlug === storeSlug ? s.lines : []
          const match = lines.find((l) => sameConfig(l, line))
          return {
            storeSlug,
            lines: match
              ? lines.map((l) => (l.id === match.id ? { ...l, quantity: l.quantity + line.quantity } : l))
              : [...lines, { ...line, modifiers: line.modifiers.filter((m) => m.quantity > 0), id: newId() }],
          }
        }),
      setQuantity: (lineId, quantity) =>
        set((s) => {
          const lines = quantity <= 0 ? s.lines.filter((l) => l.id !== lineId) : s.lines.map((l) => (l.id === lineId ? { ...l, quantity } : l))
          return { lines, storeSlug: lines.length ? s.storeSlug : null }
        }),
      updateLine: (lineId, line) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.id === lineId ? { ...line, id: lineId, modifiers: line.modifiers.filter((m) => m.quantity > 0) } : l,
          ),
        })),
      dropModifiers: (unavailable) =>
        set((s) => {
          if (!s.lines.some((l) => l.modifiers.some((m) => unavailable.has(m.modifierId)))) return s
          return {
            lines: s.lines.map((l) => {
              const gone = l.modifiers.filter((m) => unavailable.has(m.modifierId)).map((m) => m.modifierId)
              if (!gone.length) return l
              return {
                ...l,
                modifiers: l.modifiers.filter((m) => !unavailable.has(m.modifierId)),
                removedModifierIds: [...(l.removedModifierIds ?? []), ...gone],
              }
            }),
          }
        }),
      replace: (storeSlug, lines) => set({ storeSlug, lines: lines.map((l) => ({ ...l, id: newId() })) }),
      removeLine: (lineId) =>
        set((s) => {
          const lines = s.lines.filter((l) => l.id !== lineId)
          return { lines, storeSlug: lines.length ? s.storeSlug : null }
        }),
      clear: () => set({ lines: [], storeSlug: null }),
    }),
    { name: 'order-indpt-cart', version: 1 },
  ),
)

/** Price of one unit of a line: item plus its add-ons. */
export function unitPrice(line: Pick<CartLine, 'itemId' | 'modifiers'>): number {
  const item = itemById.get(line.itemId)
  const mods = line.modifiers.reduce((sum, m) => sum + (modifierById.get(m.modifierId)?.price ?? 0) * m.quantity, 0)
  return round2((item?.price ?? 0) + mods)
}

export const lineTotal = (line: CartLine) => round2(unitPrice(line) * line.quantity)
export const round2 = (n: number) => Math.round(n * 100) / 100

/** Lines that can be ordered: sold out items stay in the cart but are left out of counts and totals. */
export const payableLines = (lines: CartLine[], soldOut: Set<string> = new Set()) => lines.filter((l) => !soldOut.has(l.itemId))
export const cartCount = (lines: CartLine[], soldOut?: Set<string>) => payableLines(lines, soldOut).reduce((n, l) => n + l.quantity, 0)
export const cartSubtotal = (lines: CartLine[], soldOut?: Set<string>) =>
  round2(payableLines(lines, soldOut).reduce((n, l) => n + lineTotal(l), 0))
export const quantityOfItem = (lines: CartLine[], itemId: string) =>
  lines.filter((l) => l.itemId === itemId).reduce((n, l) => n + l.quantity, 0)

/** "No onion · Extra jalapeño · + Original Fries", or empty when there are no options or note. */
export function optionsSummary(line: Pick<CartLine, 'modifiers' | 'note'>) {
  const parts = line.modifiers.map((m) => {
    const name = modifierById.get(m.modifierId)?.name ?? ''
    const label = /^(extra|no|add|less|without)\b/i.test(name) ? name : `+ ${name}`
    return m.quantity > 1 ? `${m.quantity}× ${label}` : label
  })
  if (line.note) parts.push(`“${line.note}”`)
  return parts.join(' · ')
}

