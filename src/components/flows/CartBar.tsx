import { useEffect } from 'react'
import { cartCount, cartSubtotal, useCart } from '../../lib/cart'
import { Button } from '../ui/Button'
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
 * from this store. Item count and total on the left, a hug-width View cart
 * (Schedule order when the branch is closed) button on the right. Opens the cart sheet.
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
    <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 bg-surface-base px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))] shadow-bar">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-col items-start gap-0.5 text-start" aria-label={`Cart, ${payable} ${payable === 1 ? 'item' : 'items'}`}>
        <span className="body-s text-text-secondary">
          {payable} {payable === 1 ? 'item' : 'items'}
        </span>
        <Price amount={cartSubtotal(lines, soldOutItems)} size="lg" />
      </button>
      <Button onClick={onOpen}>{closed ? 'Schedule order' : 'View cart'}</Button>
    </div>
  )
}
