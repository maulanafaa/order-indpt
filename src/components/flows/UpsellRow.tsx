import { useEffect } from 'react'
import type { Item } from '../../data/schema'
import { useCart } from '../../lib/cart'
import { menuImage } from '../../lib/format'
import { Icon } from '../ui/Icon'
import { Price } from '../ui/Price'
import { ProductImage } from '../ui/ProductImage'
import { QuantityStepper } from '../ui/QuantityStepper'
import { useToast } from '../ui/toastContext'

/** Toasts sit 12 px above the item sheet's Add bar while this row is on screen. */
const TOAST_OFFSET = 104

/**
 * Figma "Upsell" in the item sheet: "Goes well with this" row of Upsell cards. Same
 * interaction as the cart: "+" adds the item right away with a toast, and the card
 * then shows a quantity stepper (trash at 1) in place, the item staying where it is.
 */
export function UpsellRow({ items, storeSlug, onAdd, disabled }: { items: Item[]; storeSlug: string; onAdd: (item: Item) => void; disabled?: boolean }) {
  const toast = useToast()
  const cartStore = useCart((s) => s.storeSlug)
  const lines = useCart((s) => s.lines)
  const setQuantity = useCart((s) => s.setQuantity)
  const removeLine = useCart((s) => s.removeLine)

  useEffect(() => {
    toast.setBottomOffset(TOAST_OFFSET)
    return () => toast.setBottomOffset(useCart.getState().lines.length ? 104 : 16)
  }, [toast])

  if (!items.length) return null
  /** The plain cart line for an upsell item (no options) at this store, if it is in the cart. */
  const lineFor = (item: Item) => (cartStore === storeSlug ? lines.find((l) => l.itemId === item.id && l.modifiers.length === 0) : undefined)

  return (
    <section className="flex flex-col gap-3 border-t border-border-default py-4" aria-label="Goes well with this">
      <h3 className="title-s">Goes well with this</h3>
      <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const line = lineFor(item)
          return (
            <li key={item.id} className="flex w-24 shrink-0 flex-col gap-1.5">
              <div className="relative">
                <ProductImage src={menuImage(item.slug)} alt={item.name} iconSize={24} className="h-20 w-full rounded-8" />
                {line ? (
                  <QuantityStepper
                    value={line.quantity}
                    onChange={(q) => {
                      if (q > 0) return setQuantity(line.id, q)
                      removeLine(line.id)
                      toast.show({ type: 'info', message: `${item.name} removed` })
                    }}
                    size="sm"
                    itemName={item.name}
                    max={20}
                    className="absolute end-1 bottom-1"
                  />
                ) : (
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Add ${item.name}`}
                    onClick={() => {
                      onAdd(item)
                      toast.show({ type: 'success', message: `${item.name} added to cart` })
                    }}
                    className="absolute end-1 bottom-1 inline-flex size-8 items-center justify-center rounded-full bg-surface-base text-text-primary inset-ring inset-ring-border-default active:bg-surface-muted disabled:opacity-35"
                  >
                    <Icon name="plus" size={16} />
                  </button>
                )}
              </div>
              <p className="truncate product-m text-text-primary">{item.name}</p>
              <Price amount={item.price} size="sm" />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
