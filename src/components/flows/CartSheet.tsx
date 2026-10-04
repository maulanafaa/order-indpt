import { useEffect, useId, useMemo, useRef } from 'react'
import type { Item, Store } from '../../data/schema'
import { cartCount, cartSubtotal, lineTotal, optionsSummary, useCart, type CartLine } from '../../lib/cart'
import { cn } from '../../lib/cn'
import { isCustomisable, itemById, itemBySlug, modifierById } from '../../lib/data'
import { menuImage } from '../../lib/format'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Notice } from '../ui/Notice'
import { Price } from '../ui/Price'
import { ProductImage } from '../ui/ProductImage'
import { QuantityStepper } from '../ui/QuantityStepper'
import { SheetHeader } from '../ui/SheetHeader'

type CartSheetProps = {
  store: Store
  open: boolean
  onClose: () => void
  soldOutItems: Set<string>
  unavailableModifiers: Set<string>
  /** Edit: reopen the item sheet with this line's choices. */
  onEdit: (line: CartLine) => void
  /** "+" on an upsell card. */
  onUpsell: (item: Item) => void
  onCheckout: () => void
  /** Button label override, e.g. "Back to checkout" when opened from checkout. */
  checkoutLabel?: string
  /** Branch is closed: the button schedules instead. */
  closed?: boolean
}

/** Upsell picks, in order. Items already in the cart or sold out are skipped. */
const UPSELL_SLUGS = ['original-fries', 'pink-lemonade', 'chicken-popcorn', 'brownie-softie', 'mint-lemonade', 'cheese-fries', 'lotus-softie']

/** Figma "4.1 · Cart": white rows on a grey sheet, upsell row, subtotal, pinned checkout bar. */
export function CartSheet({
  store,
  open,
  onClose,
  soldOutItems,
  unavailableModifiers,
  onEdit,
  onUpsell,
  onCheckout,
  closed,
  checkoutLabel,
}: CartSheetProps) {
  const titleId = useId()
  const cartStore = useCart((s) => s.storeSlug)
  const allLines = useCart((s) => s.lines)
  const setQuantity = useCart((s) => s.setQuantity)
  const removeLine = useCart((s) => s.removeLine)
  const dropModifiers = useCart((s) => s.dropModifiers)
  const lines = useMemo(() => (cartStore === store.slug ? allLines : []), [allLines, cartStore, store.slug])

  // Add-ons this branch stopped offering are taken off the line (and noted on it).
  // Runs again when lines change (e.g. the demo cart arrives after the sheet opened).
  useEffect(() => {
    if (open) dropModifiers(unavailableModifiers)
  }, [open, lines, dropModifiers, unavailableModifiers])

  // Close once the last line is removed (not when it opens before a demo cart arrives).
  const hadLines = useRef(false)
  useEffect(() => {
    if (lines.length > 0) hadLines.current = true
    else if (open && hadLines.current) {
      hadLines.current = false
      onClose()
    }
  }, [open, lines.length, onClose])

  const count = cartCount(lines, soldOutItems)
  const subtotal = cartSubtotal(lines, soldOutItems)
  const soldOutCount = lines.filter((l) => soldOutItems.has(l.itemId)).length
  const inCart = new Set(lines.map((l) => l.itemId))
  const upsell = UPSELL_SLUGS.map((s) => itemBySlug.get(s))
    .filter((i): i is Item => Boolean(i) && !inCart.has(i!.id) && !soldOutItems.has(i!.id))
    .slice(0, 6)

  return (
    <BottomSheet open={open} onClose={onClose} bare ariaLabel="Your cart">
      <div className="flex min-h-0 flex-auto flex-col">
        <SheetHeader title="Your cart" titleId={titleId} onClose={onClose} divider />

        <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain bg-surface-base">
          {soldOutCount > 0 && (
            <div className="bg-surface-base px-4 pt-3">
              <Notice tone="warning" icon="alert">
                {soldOutCount === 1 ? '1 item is' : `${soldOutCount} items are`} sold out and won’t be included.
              </Notice>
            </div>
          )}

          <ul aria-label="Items" className={cn('bg-surface-base px-4 pb-2', soldOutCount > 0 && 'pt-1')}>
            {lines.map((line) => (
              <CartRow
                key={line.id}
                line={line}
                soldOut={soldOutItems.has(line.itemId)}
                onQuantity={(q) => setQuantity(line.id, q)}
                onEdit={() => onEdit(line)}
                onRemove={() => removeLine(line.id)}
              />
            ))}
          </ul>

          {upsell.length > 0 && (
            <section aria-labelledby={`${titleId}-upsell`} className="mx-4 mt-2 flex flex-col gap-3 border-t border-border-default pt-6 pb-6">
              <h3 id={`${titleId}-upsell`} className="title-s text-text-primary">
                Goes well with your order
              </h3>
              <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {upsell.map((item) => (
                  <li key={item.id} className="flex w-24 shrink-0 flex-col gap-1.5">
                    <div className="relative">
                      <ProductImage src={menuImage(item.slug)} alt={item.name} iconSize={24} className="h-20 w-full rounded-8" />
                      <button
                        type="button"
                        aria-label={`Add ${item.name}`}
                        onClick={() => onUpsell(item)}
                        className="absolute end-1 bottom-1 inline-flex size-8 items-center justify-center rounded-full bg-surface-base text-text-primary inset-ring inset-ring-border-default active:bg-surface-muted"
                      >
                        <Icon name="plus" size={16} />
                      </button>
                    </div>
                    <p className="truncate product-m text-text-primary">{item.name}</p>
                    <Price amount={item.price} size="sm" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mx-4 mt-2 flex flex-col gap-3 border-t border-border-default pt-6 pb-5">
            <div className="flex items-center justify-between gap-3">
              <p className="body-m text-text-secondary">
                Subtotal · {count} {count === 1 ? 'item' : 'items'}
              </p>
              <Price amount={subtotal} size="lg" />
            </div>
            <p className="caption text-text-tertiary">Prices are inclusive of VAT</p>
          </div>
          <div className="h-4" aria-hidden />
        </div>

        <div className="shrink-0 bg-surface-base px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))] shadow-bar">
          <Button fullWidth spread price={subtotal} disabled={count === 0} onClick={onCheckout}>
            {checkoutLabel ?? (closed ? 'Schedule order' : 'Go to checkout')}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------------ */

function CartRow({
  line,
  soldOut,
  onQuantity,
  onEdit,
  onRemove,
}: {
  line: CartLine
  soldOut: boolean
  onQuantity: (q: number) => void
  onEdit: () => void
  onRemove: () => void
}) {
  const item = itemById.get(line.itemId)
  if (!item) return null
  const removed = (line.removedModifierIds ?? []).map((id) => modifierById.get(id)?.name).filter(Boolean) as string[]
  const editable = isCustomisable(item.id)

  return (
    <li className="flex items-start gap-3 border-b border-border-default py-4 last:border-b-0">
      <ProductImage src={menuImage(item.slug)} alt={item.name} dimmed={soldOut} iconSize={22} className="size-16 shrink-0 rounded-8" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <p className={cn('product-l', soldOut ? 'text-text-disabled' : 'text-text-primary')}>{item.name}</p>
        {soldOut ? (
          <p className="truncate body-s text-state-error">Sold out today · not included</p>
        ) : (
          <>
            <p className="body-s text-text-secondary">{optionsSummary(line)}</p>
            {removed.length > 0 && (
              <p className="flex items-start gap-1 caption text-state-warning">
                <Icon name="alert" size={14} className="mt-px shrink-0" />
                <span>
                  {joinNames(removed)} {removed.length === 1 ? 'is' : 'are'} unavailable, so we removed {removed.length === 1 ? 'it' : 'them'}
                </span>
              </p>
            )}
          </>
        )}
        {soldOut ? (
          <button type="button" className="cta-m text-text-primary underline" onClick={onRemove}>
            Remove
          </button>
        ) : (
          editable && (
            <button type="button" className="cta-m text-text-primary underline" onClick={onEdit} aria-label={`Edit ${item.name}`}>
              Edit
            </button>
          )
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-3">
        <Price amount={lineTotal(line)} size="md" tone={soldOut ? 'inherit' : 'default'} className={cn(soldOut && 'text-text-disabled')} />
        {!soldOut && <QuantityStepper value={line.quantity} onChange={onQuantity} size="sm" itemName={item.name} max={20} />}
      </div>
    </li>
  )
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
