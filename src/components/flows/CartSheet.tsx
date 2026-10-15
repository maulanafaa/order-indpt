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
import { Collapse } from '../ui/Collapse'
import { CartTestSheet } from './CartTestSheet'
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

/** A removed row fades and folds away before it leaves the cart. */
const REMOVE_MS = 260

/** Toasts sit 12 px above the checkout bar (92 px) while the sheet is open. */
const TOAST_OFFSET = 104

/**
 * Figma "4.1 · Cart": a full screen sheet with a "Cart · 5 items" header, item rows
 * with price and stepper, order note, "Goes well with your order", and a pinned
 * checkout bar (total and "Incl. VAT" on the left, Checkout on the right).
 */
export function CartSheet({ store, open, onClose, soldOutItems, unavailableModifiers, onUpsell, onCheckout, closed, checkoutLabel }: CartSheetProps) {
  const titleId = useId()
  const toast = useToast()
  /** The header divider shows only once the list is scrolled. */
  const [scrolled, setScrolled] = useState(false)
  /** Prototype test settings (gear in the header). */
  const [testOpen, setTestOpen] = useState(false)
  /** Lines fading out after a remove (taken off the cart once the fade ends). */
  const [leavingIds, setLeavingIds] = useState<Set<string>>(() => new Set())
  /** Upsell items added from this sheet: they stay in place with a stepper instead of "+". */
  const [addedHere, setAddedHere] = useState<Set<string>>(() => new Set())
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setScrolled(false)
      setAddedHere(new Set())
    }
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
  // Items already in the cart are not suggested, except ones added from the carousel just now.
  const exclude = new Set(lines.map((l) => l.itemId).filter((id) => !addedHere.has(id)))
  // No upsell when the branch is not taking online orders.
  const paused = branchState(store, now, scenario.store, scenario.demo).kind === 'paused'
  const upsell = paused ? [] : upsellItems(exclude, soldOutItems)
  /** The plain cart line for an upsell item (no options), if it is in the cart. */
  const upsellLine = (item: Item) => lines.find((l) => l.itemId === item.id && l.modifiers.length === 0)

  const remove = (line: CartLine) => {
    if (leavingIds.has(line.id)) return
    setLeavingIds((prev) => new Set(prev).add(line.id))
    window.setTimeout(() => {
      removeLine(line.id)
      setLeavingIds((prev) => {
        const next = new Set(prev)
        next.delete(line.id)
        return next
      })
      toast.show({ type: 'info', message: `${itemById.get(line.itemId)?.name ?? 'Item'} removed` })
    }, REMOVE_MS)
  }

  return (
    <BottomSheet open={open} onClose={onClose} bare ariaLabel="Cart" className="h-full max-h-full">
      <div className="flex min-h-0 flex-auto flex-col">
        <header
          className={cn(
            'flex shrink-0 flex-col border-b bg-surface-base px-4 pt-2.5 pb-3 transition-colors duration-200',
            scrolled ? 'border-border-default' : 'border-transparent',
          )}
        >
          <div className="flex items-center gap-2">
            <h2 id={titleId} className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="title-l text-text-primary">Cart</span>
              <span className="body-m text-text-secondary">
                {count} {count === 1 ? 'item' : 'items'}
              </span>
            </h2>
            <IconButton icon="settings" label="Test settings" variant="outline" size={32} onClick={() => setTestOpen(true)} />
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
                leaving={leavingIds.has(line.id)}
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
                {upsell.map((item) => {
                  const line = upsellLine(item)
                  return (
                    <li key={item.id} className="flex w-24 shrink-0 flex-col gap-1.5">
                      <div className="relative">
                        <ProductImage src={menuImage(item.slug)} alt={item.name} iconSize={24} className="h-20 w-full rounded-8" />
                        {line ? (
                          <QuantityStepper
                            value={line.quantity}
                            onChange={(q) => (q <= 0 ? remove(line) : setQuantity(line.id, q))}
                            size="sm"
                            itemName={item.name}
                            max={20}
                            className="absolute end-1 bottom-1"
                          />
                        ) : (
                          <button
                            type="button"
                            aria-label={`Add ${item.name}`}
                            onClick={() => {
                              setAddedHere((prev) => new Set(prev).add(item.id))
                              onUpsell(item)
                              toast.show({ type: 'success', message: `${item.name} added to cart` })
                            }}
                            className="absolute end-1 bottom-1 inline-flex size-8 items-center justify-center rounded-full bg-surface-base text-text-primary inset-ring inset-ring-border-default active:bg-surface-muted"
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
          )}
        </div>

        {/* Figma "CTA bar", Type = With total. */}
        <div className="flex shrink-0 items-center gap-4 bg-surface-base px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))] shadow-bar">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Price amount={subtotal} size="lg" />
            <span className="caption text-text-secondary">Incl. VAT</span>
          </div>
          <Button disabled={count === 0} onClick={onCheckout}>
            {checkoutLabel ?? (closed ? 'Schedule order' : 'Checkout')}
          </Button>
        </div>
      </div>
      <CartTestSheet storeSlug={store.slug} open={testOpen} onClose={() => setTestOpen(false)} />
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------------ */

/** Figma "Cart item": options summary, price and stepper (trash at 1). Sold out lines are dimmed and left out. */
function CartRow({ line, soldOut, leaving, onQuantity }: { line: CartLine; soldOut: boolean; leaving: boolean; onQuantity: (q: number) => void }) {
  const item = itemById.get(line.itemId)
  if (!item) return null
  const removed = (line.removedModifierIds ?? []).map((id) => modifierById.get(id)?.name).filter(Boolean) as string[]
  const summary = optionsSummary(line)

  return (
    // Removing: the row fades out and its height folds to 0 (REMOVE_MS).
    <li
      inert={leaving}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-[260ms] ease-card motion-reduce:transition-none',
        leaving ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className={cn('flex items-start gap-3 border-b border-border-default py-4', soldOut && 'opacity-50')}>
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
        </div>
      </div>
    </li>
  )
}

/**
 * Figma "Cart note" (595:41581): "Add order note" opens a note field. Once there is a
 * note, the field stays open. Saved with the checkout choices.
 */
function OrderNote({ store }: { store: Store }) {
  const note = useCheckout((s) => (s.storeSlug === store.slug ? s.note : ''))
  const hasNote = Boolean(note.trim())
  const [open, setOpen] = useState(hasNote)
  /** Bumped when the field is opened by a tap, to focus it (not when the cart opens with a note). */
  const [focusKey, setFocusKey] = useState(0)
  const expanded = open || hasNote
  const fieldId = useId()

  const save = (value: string) => {
    const co = useCheckout.getState()
    // Notes belong to this store's checkout; start it if it is for another store.
    if (co.storeSlug !== store.slug) co.startFor(store.slug)
    useCheckout.getState().set({ note: value })
  }

  return (
    <div className={cn('flex flex-col py-3.5 transition-[gap] duration-300 ease-card', expanded ? 'gap-2.5' : 'gap-0')}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={fieldId}
        // Empty note: tap again to hide the field. With a note, the field always stays open.
        disabled={hasNote}
        onClick={() => {
          if (!expanded) setFocusKey((k) => k + 1)
          setOpen(!expanded)
        }}
        className="flex items-center gap-2.5 self-start text-start disabled:cursor-default"
      >
        <Icon name="note-text" size={20} className="shrink-0" />
        <span className="pb-0.5 cta-m text-text-primary underline underline-offset-4">Add order note</span>
      </button>
      <Collapse open={expanded} id={fieldId} className="-mx-0.5">
        {/* Padding inside the fold so the field's focus ring is not clipped. */}
        <div className="p-0.5">
          <NoteField focusKey={focusKey} value={note} onChange={save} />
        </div>
      </Collapse>
    </div>
  )
}

/** The note field: focused when "Add order note" opens it (it stays mounted, so autoFocus would not run again). */
function NoteField({ focusKey, value, onChange }: { focusKey: number; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focusKey > 0) ref.current?.querySelector('textarea')?.focus({ preventScroll: true })
  }, [focusKey])
  return (
    <div ref={ref}>
      <Textarea value={value} onChange={onChange} placeholder="e.g. sauces on the side" aria-label="Order note" />
    </div>
  )
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
