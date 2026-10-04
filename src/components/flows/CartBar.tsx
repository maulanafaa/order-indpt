import { useEffect } from 'react'
import { cartCount, cartSubtotal, useCart } from '../../lib/cart'
import { Button } from '../ui/Button'
import { CartButton } from '../ui/CartButton'
import { Price } from '../ui/Price'
import { useToast } from '../ui/toastContext'

type CartBarProps = {
  storeSlug: string
  closed: boolean
  /** Sold out lines are left out of the count and total. */
  soldOutItems?: Set<string>
  /** Opens the cart sheet. */
  onOpen: () => void
}

/**
 * Figma "CartBar": sticky at the bottom of store pages when the cart holds items
 * from this store. Cart button (no outline) at the start; total, then a hug-width
 * Checkout button 16 px after it. Both open the cart sheet.
 */
export function CartBar({ storeSlug, closed, soldOutItems, onOpen }: CartBarProps) {
  const toast = useToast()
  const cartStore = useCart((s) => s.storeSlug)
  const allLines = useCart((s) => s.lines)
  const lines = cartStore === storeSlug ? allLines : []
  const count = cartCount(lines)
  const payable = cartCount(lines, soldOutItems)

  // Keep toasts above the bar.
  useEffect(() => {
    toast.setBottomOffset(count > 0 ? 104 : 16)
    return () => toast.setBottomOffset(16)
  }, [count, toast])

  if (count === 0) return null
  return (
    <div className="sticky bottom-0 z-20 flex items-start justify-between gap-3 bg-surface-base px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))] shadow-bar">
      <CartButton count={payable} onClick={onOpen} />
      <div className="flex items-center gap-4">
        <Price amount={cartSubtotal(lines, soldOutItems)} size="lg" />
        <Button onClick={onOpen}>{closed ? 'Schedule order' : 'Checkout'}</Button>
      </div>
    </div>
  )
}
