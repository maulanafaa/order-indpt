import { useState } from 'react'
import type { Item, Store } from '../../data/schema'
import { cartCount, quantityOfItem, useCart, type CartLine } from '../../lib/cart'
import { isCustomisable, storeBySlug } from '../../lib/data'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { useToast } from '../ui/toastContext'

type NewLine = Omit<CartLine, 'id'>

/**
 * Cart actions for one store. Adding from a different store asks first
 * (Figma "Leave store · cart will be cleared"), because menus differ by store.
 */
export function useStoreCart(store: Store, openItem: (item: Item) => void) {
  const toast = useToast()
  const cartStore = useCart((s) => s.storeSlug)
  const allLines = useCart((s) => s.lines)
  const addLine = useCart((s) => s.addLine)
  const setQuantity = useCart((s) => s.setQuantity)
  const clear = useCart((s) => s.clear)
  const lines = cartStore === store.slug ? allLines : []
  const [pending, setPending] = useState<{ line: NewLine; done?: () => void } | null>(null)

  const commit = (line: NewLine, quiet = false) => {
    addLine(store.slug, line)
    if (!quiet) toast.show({ type: 'success', message: 'Added to your order' })
  }

  /**
   * Returns false when it had to ask first (the sheet calls `done` after).
   * `quiet` skips the toast (the item sheet upsell shows its own tooltip).
   */
  const add = (line: NewLine, done?: () => void, quiet = false) => {
    if (cartStore && cartStore !== store.slug && allLines.length) {
      setPending({ line, done })
      return false
    }
    commit(line, quiet)
    done?.()
    return true
  }

  /** "+" on a menu row: customisable items open the sheet, fixed ones add 1. */
  const quickAdd = (item: Item) => {
    if (isCustomisable(item.id)) openItem(item)
    else add({ itemId: item.id, quantity: 1, modifiers: [], note: '' })
  }

  /** "-" on a menu row: takes one off the most recent line for this item. */
  const decrease = (item: Item) => {
    const line = [...lines].reverse().find((l) => l.itemId === item.id)
    if (line) setQuantity(line.id, line.quantity - 1)
  }

  const otherStore = cartStore ? storeBySlug.get(cartStore) : undefined
  const count = cartCount(allLines)
  const leaveSheet = (
    <BottomSheet open={Boolean(pending)} onClose={() => setPending(null)} ariaLabel="Leave store">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="title-l pe-10">Leave {otherStore?.name ?? 'this store'}?</h2>
          <p className="body-m text-text-secondary">
            You have {count} {count === 1 ? 'item' : 'items'} in your cart. Changing store will clear your cart, since menu
            availability can differ between stores.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            fullWidth
            onClick={() => {
              if (!pending) return
              clear()
              commit(pending.line)
              pending.done?.()
              setPending(null)
            }}
          >
            Clear cart and add
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setPending(null)}>
            Keep my cart
          </Button>
        </div>
      </div>
    </BottomSheet>
  )

  return {
    lines,
    add,
    quickAdd,
    decrease,
    quantityOf: (itemId: string) => quantityOfItem(lines, itemId),
    leaveSheet,
  }
}
