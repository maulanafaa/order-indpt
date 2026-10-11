import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Item, Store } from '../../data/schema'
import { cartCount, cartSubtotal, lineTotal, optionsSummary, useCart, type CartLine } from '../../lib/cart'
import { branchState } from '../../lib/branch'
import { useCheckout } from '../../lib/checkout'
import { cn } from '../../lib/cn'
import { itemById, modifierById } from '../../lib/data'
import { menuImage } from '../../lib/format'
import { useScenario } from '../../lib/scenarios'
import { upsellItems } from '../../lib/upsell'
import { useNow } from '../../lib/useNow'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'
import { Price } from '../ui/Price'
import { ProductImage } from '../ui/ProductImage'
import { QuantityStepper } from '../ui/QuantityStepper'
import { Textarea } from '../ui/Textarea'
import { useToast } from '../ui/toastContext'

type CartSheetProps = {
  store: Store
  open: boolean
  onClose: () => void
  soldOutItems: Set<string>
  unavailableModifiers: Set<string>
  /** "+" on an upsell card: adds the item to the cart. */
  onUpsell: (item: Item) => void
  onCheckout: () => void
  /** Button label override, e.g. "Back to checkout" when opened from checkout. */
  checkoutLabel?: string
  /** Branch is closed: the button schedules instead. */
  closed?: boolean
}

/** Toasts sit 12 px above the checkout bar while the sheet is open. */
const TOAST_OFFSET = 128

/**
 * Figma "4.1 · Cart": "Cart · 5 items" header, item rows with price and stepper,
 * order note, "Goes well with your order", and a pinned "Checkout · total" bar
 * with the VAT line under it.
 */
export function CartSheet({ store, open, onClose, soldOutItems, unavailableModifiers, onUpsell, onCheckout, closed, checkoutLabel }: CartSheetProps) {
  const titleId = useId()
  const toast = useToast()
  /** The header divider shows only once the list is scrolled. */
  const [scrolled, setScrolled] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setScrolled(false)
  }
  const scenario = useScenario()
  const now = useNow()
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

  // Keep toasts above the checkout bar while the sheet is open.
  useEffect(() => {
    if (!open) return
    toast.setBottomOffset(TOAST_OFFSET)
    return () => toast.setBottomOffset(lines.length ? 104 : 16)
  }, [open, toast, lines.length])

  const count = cartCount(lines, soldOutItems)
  const subtotal = cartSubtotal(lines, soldOutItems)
  const inCart = new Set(lines.map((l) => l.itemId))
  // No upsell when the branch is not taking online orders.
  const paused = branchState(store, now, scenario.store, scenario.demo).kind === 'paused'
  const upsell = paused ? [] : upsellItems(inCart, soldOutItems)

  const remove = (line: CartLine) => {
    removeLine(line.id)
    toast.show({ type: 'info', message: `${itemById.get(line.itemId)?.name ?? 'Item'} removed` })
  }

  return (
    <BottomSheet open={open} onClose={onClose} bare ariaLabel="Cart">
      <div className="flex min-h-0 flex-auto flex-col">
        <header
          className={cn(
            'flex shrink-0 flex-col gap-2.5 border-b bg-surface-base px-4 pt-2.5 pb-3 transition-colors duration-200',
            scrolled ? 'border-border-default' : 'border-transparent',
          )}
        >
          <span aria-hidden className="mx-auto h-1 w-9 rounded-2 bg-border-default" />
          <div className="flex items-center gap-2">
            <h2 id={titleId} className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="title-l text-text-primary">Cart</span>
              <span className="body-m text-text-secondary">
                {count} {count === 1 ? 'item' : 'items'}
              </span>
            </h2>
            <IconButton icon="x" label="Close" variant="outline" size={32} onClick={onClose} />
          </div>
        </header>

        <div
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
          className="min-h-0 flex-auto overflow-y-auto overscroll-contain bg-surface-base px-4 pb-4"
        >
          <ul aria-label="Items">
            {lines.map((line) => (
              <CartRow
                key={line.id}
                line={line}
                soldOut={soldOutItems.has(line.itemId)}
                onQuantity={(q) => (q <= 0 ? remove(line) : setQuantity(line.id, q))}
              />
            ))}
          </ul>

          <OrderNote store={store} />

          {upsell.length > 0 && (
            <section aria-labelledby={`${titleId}-upsell`} className="flex flex-col gap-3 pt-8">
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
                        onClick={() => {
                          onUpsell(item)
                          toast.show({ type: 'success', message: `${item.name} added to cart` })
                        }}
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
        </div>

        <div className="flex shrink-0 flex-col gap-2 bg-surface-base px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))] shadow-bar">
          <Button fullWidth disabled={count === 0} onClick={onCheckout}>
            <span className="inline-flex items-center gap-2">
              {checkoutLabel ?? (closed ? 'Schedule order' : 'Checkout')}
              <span aria-hidden>·</span>
              <Price amount={subtotal} size="cta" tone={count === 0 ? 'inherit' : 'inverse'} />
            </span>
          </Button>
          <p className="text-center caption text-text-tertiary">Prices are inclusive of VAT</p>
        </div>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------------ */

/** Figma "Cart item": options summary, price and stepper (trash at 1). Sold out lines are dimmed and left out. */
function CartRow({ line, soldOut, onQuantity }: { line: CartLine; soldOut: boolean; onQuantity: (q: number) => void }) {
  const item = itemById.get(line.itemId)
  if (!item) return null
  const removed = (line.removedModifierIds ?? []).map((id) => modifierById.get(id)?.name).filter(Boolean) as string[]
  const summary = optionsSummary(line)

  return (
    <li className={cn('flex items-start gap-3 border-b border-border-default py-4', soldOut && 'opacity-50')}>
      <ProductImage src={menuImage(item.slug)} alt={item.name} dimmed={soldOut} iconSize={22} className="size-16 shrink-0 rounded-8" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <p className={cn('product-l', soldOut ? 'text-text-tertiary' : 'text-text-primary')}>{item.name}</p>
        {soldOut ? (
          <p className="body-s text-state-error">Sold out today · not included</p>
        ) : (
          <>
            {summary && <p className="body-s text-text-secondary">{summary}</p>}
            {removed.length > 0 && (
              <p className="flex items-start gap-1 caption text-state-warning">
                <Icon name="alert" size={14} className="mt-px shrink-0" />
                <span>
                  {joinNames(removed)} {removed.length === 1 ? 'is' : 'are'} unavailable
                </span>
              </p>
            )}
          </>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-3">
        <Price amount={lineTotal(line)} size="md" tone={soldOut ? 'inherit' : 'default'} className={cn(soldOut && 'text-text-secondary')} />
        {!soldOut && <QuantityStepper value={line.quantity} onChange={onQuantity} size="sm" itemName={item.name} max={20} />}
      </div>
    </li>
  )
}

/**
 * Figma "Cart note" (595:41581): Collapsed ("Add order note"), Expanded (note field) and
 * Added (the saved note with Edit). Saved with the checkout choices.
 */
function OrderNote({ store }: { store: Store }) {
  const note = useCheckout((s) => (s.storeSlug === store.slug ? s.note : ''))
  const hasNote = Boolean(note.trim())
  const [state, setState] = useState<'collapsed' | 'expanded' | 'added'>(hasNote ? 'added' : 'collapsed')
  const fieldId = useId()

  const save = (value: string) => {
    const co = useCheckout.getState()
    // Notes belong to this store's checkout; start it if it is for another store.
    if (co.storeSlug !== store.slug) co.startFor(store.slug)
    useCheckout.getState().set({ note: value })
  }

  if (state === 'added' && hasNote) {
    return (
      <div className="flex items-start gap-2.5 py-3.5">
        <Icon name="note-text" size={20} className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="caption text-text-secondary">Order note</p>
          <p className="body-m break-words text-text-primary">{note}</p>
        </div>
        <button
          type="button"
          aria-label="Edit order note"
          onClick={() => setState('expanded')}
          className="shrink-0 label-m text-text-primary underline underline-offset-4"
        >
          Edit
        </button>
      </div>
    )
  }

  const expanded = state !== 'collapsed'
  return (
    <div className="flex flex-col gap-2.5 py-3.5">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={fieldId}
        // Empty note: tap again to hide the field. With text, the field stays until it loses focus.
        disabled={expanded && hasNote}
        onClick={() => setState(expanded ? 'collapsed' : 'expanded')}
        className="flex items-center gap-2.5 self-start text-start disabled:cursor-default"
      >
        <Icon name="note-text" size={20} className="shrink-0" />
        <span className="pb-0.5 cta-m text-text-primary underline underline-offset-4">
          Add order note
        </span>
      </button>
      {expanded && (
        <Textarea
          id={fieldId}
          value={note}
          onChange={save}
          onBlur={() => hasNote && setState('added')}
          placeholder="e.g. sauces on the side"
          aria-label="Order note"
          autoFocus
        />
      )}
    </div>
  )
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
