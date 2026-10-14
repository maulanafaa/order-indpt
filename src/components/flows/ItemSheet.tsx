import { useMemo, useRef, useState } from 'react'
import type { Item, Modifier, ModifierGroup } from '../../data/schema'
import { round2, type CartLine } from '../../lib/cart'
import { cn } from '../../lib/cn'
import { groupsByItem, modifiersByGroup } from '../../lib/data'
import { menuImage } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { OptionRow } from '../ui/OptionRow'
import { Price } from '../ui/Price'
import { ProductImage } from '../ui/ProductImage'
import { QuantityStepper } from '../ui/QuantityStepper'
import { Textarea } from '../ui/Textarea'
import { ItemBadge } from './MenuItemRow'
import { UpsellRow } from './UpsellRow'

type NewLine = Omit<CartLine, 'id'>

type ItemSheetProps = {
  item: Item | null
  open: boolean
  onClose: () => void
  soldOut: boolean
  unavailableModifiers: Set<string>
  /** Return false if adding had to wait for a confirmation. */
  onAdd: (line: NewLine, done: () => void) => void
  /** Edit from the cart: start from these choices and save instead of add. */
  editing?: { lineId: string; line: NewLine } | null
  /** "Goes well with this" items; "+" adds one straight to the cart. */
  upsell?: Item[]
  onUpsellAdd?: (item: Item) => void
  /** The branch, so upsell cards can show what is already in its cart. */
  storeSlug?: string
  /** Branch not taking online orders: browse only, nothing can be added. */
  ordersPaused?: boolean
}

/** Item page as a bottom sheet: Figma "Item · Food / Drink (customizable)" and "Item · Fixed". */
export function ItemSheet({ item, open, onClose, soldOut, unavailableModifiers, onAdd, editing, upsell, onUpsellAdd, storeSlug, ordersPaused }: ItemSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} bare ariaLabel={item?.name ?? 'Item'}>
      {item && (
        <ItemSheetBody
          key={`${item.id}-${editing?.lineId ?? 'new'}`}
          item={item}
          editing={editing?.line.itemId === item.id ? editing : null}
          onClose={onClose}
          soldOut={soldOut}
          unavailableModifiers={unavailableModifiers}
          onAdd={onAdd}
          upsell={upsell}
          onUpsellAdd={onUpsellAdd}
          storeSlug={storeSlug}
          ordersPaused={ordersPaused}
        />
      )}
    </BottomSheet>
  )
}

type Selections = Record<string, number>

function ItemSheetBody({
  item,
  onClose,
  soldOut,
  unavailableModifiers,
  onAdd,
  editing,
  upsell = [],
  onUpsellAdd,
  storeSlug,
  ordersPaused = false,
}: Omit<ItemSheetProps, 'open' | 'item'> & { item: Item }) {
  const groups = useMemo(() => groupsByItem.get(item.id) ?? [], [item.id])
  const [picked, setPicked] = useState<Selections>(() =>
    Object.fromEntries((editing?.line.modifiers ?? []).filter((m) => !unavailableModifiers.has(m.modifierId)).map((m) => [m.modifierId, m.quantity])),
  )
  const [quantity, setQuantity] = useState(editing?.line.quantity ?? 1)
  const [note, setNote] = useState(editing?.line.note ?? '')
  const [errors, setErrors] = useState<Set<string>>(new Set())
  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const modsOf = (g: ModifierGroup) => modifiersByGroup.get(g.id) ?? []
  const groupTotal = (g: ModifierGroup) => modsOf(g).reduce((n, m) => n + (picked[m.id] ?? 0), 0)

  const setQty = (g: ModifierGroup, m: Modifier, qty: number) => {
    setPicked((p) => {
      const next = { ...p }
      if (g.type === 'single') for (const other of modsOf(g)) delete next[other.id]
      if (qty > 0) next[m.id] = qty
      else delete next[m.id]
      return next
    })
    setErrors((e) => {
      if (!e.has(g.id)) return e
      const n = new Set(e)
      n.delete(g.id)
      return n
    })
  }

  const extras = Object.entries(picked).reduce((sum, [id, qty]) => {
    const m = groups.flatMap(modsOf).find((x) => x.id === id)
    return sum + (m?.price ?? 0) * qty
  }, 0)
  const total = round2((item.price + extras) * quantity)

  const submit = () => {
    const missing = groups.filter((g) => g.min > 0 && groupTotal(g) < g.min)
    if (missing.length) {
      setErrors(new Set(missing.map((g) => g.id)))
      scrollRef.current?.querySelector(`[data-group="${missing[0].id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    onAdd(
      {
        itemId: item.id,
        quantity,
        note: note.trim(),
        modifiers: Object.entries(picked).map(([modifierId, q]) => ({ modifierId, quantity: q })),
      },
      onClose,
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 250)}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {/* Sticky header: transparent over the photo, solid with the name once scrolled. Close stays top right. */}
        <div
          className={cn(
            'sticky top-0 z-10 -mb-14 flex h-14 items-center justify-center px-14 transition-colors',
            scrolled ? 'border-b border-border-default bg-surface-base' : 'pointer-events-none',
          )}
        >
          <p className={cn('truncate product-l transition-opacity', scrolled ? 'opacity-100' : 'opacity-0')}>{item.name}</p>
          <IconButton
            icon="x"
            label="Close"
            variant={scrolled ? 'outline' : 'elevated'}
            size={32}
            onClick={onClose}
            className="pointer-events-auto absolute end-4 top-3"
          />
        </div>

        <div className="flex justify-center pt-2.5" aria-hidden>
          <span className="h-1 w-9 rounded-2 bg-border-default" />
        </div>

        <div className="flex flex-col gap-5 px-4 pt-3 pb-6">
          <ProductImage src={menuImage(item.slug)} alt={item.name} dimmed={soldOut} iconSize={32} className="h-[260px] w-full rounded-8" />

          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-start gap-1">
              <ItemBadge item={item} />
              <h2 className="title-xl text-text-primary">{item.name}</h2>
              {item.description && <p className="body-m text-text-secondary">{item.description}</p>}
            </div>
            <div className="flex items-center gap-2.5">
              {soldOut ? (
                <span className="label-m text-text-tertiary">Unavailable today</span>
              ) : (
                <Price amount={item.price} size="lg" />
              )}
              {item.calories != null && (
                <>
                  <span aria-hidden className="size-1 rounded-full bg-text-tertiary" />
                  <span className="label-m text-text-secondary">{item.calories} kcal</span>
                </>
              )}
            </div>
            {item.allergens.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Allergens">
                {item.allergens.map((a) => (
                  <li key={a}>
                    <Badge variant="subtle">{a}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {groups.map((g) => (
            <GroupBlock
              key={g.id}
              group={g}
              mods={modsOf(g)}
              picked={picked}
              total={groupTotal(g)}
              error={errors.has(g.id)}
              disabled={soldOut}
              unavailable={unavailableModifiers}
              onChange={(m, q) => setQty(g, m, q)}
            />
          ))}

          {groups.length > 0 && (
            <section className="flex flex-col gap-3 border-t border-border-default pt-5">
              <h3 className="title-s">Note for the kitchen</h3>
              <Textarea
                value={note}
                onChange={setNote}
                placeholder="e.g. cut in half"
                maxLength={140}
                aria-label="Note for the kitchen"
                disabled={soldOut}
              />
            </section>
          )}

          {!editing && !soldOut && !ordersPaused && onUpsellAdd && (
            <UpsellRow items={upsell.filter((u) => u.id !== item.id)} storeSlug={storeSlug ?? ''} onAdd={onUpsellAdd} />
          )}
        </div>
      </div>

      <footer className="flex shrink-0 items-center gap-3 bg-surface-base px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))] shadow-bar">
        {soldOut || ordersPaused ? (
          <Button fullWidth disabled>
            {soldOut ? 'Unavailable today' : 'Online ordering unavailable'}
          </Button>
        ) : (
          <>
            <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={20} trashAtOne={false} itemName={item.name} />
            <Button className="flex-1" spread price={total} onClick={submit}>
              {editing ? 'Update' : 'Add to cart'}
            </Button>
          </>
        )}
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

function GroupBlock({
  group,
  mods,
  picked,
  total,
  error,
  disabled,
  unavailable,
  onChange,
}: {
  group: ModifierGroup
  mods: Modifier[]
  picked: Selections
  total: number
  error: boolean
  disabled: boolean
  unavailable: Set<string>
  onChange: (m: Modifier, qty: number) => void
}) {
  const full = total >= group.max
  const free = mods.every((m) => m.price === 0)
  const maxQty = Math.max(...mods.map((m) => m.maxQty))
  const caption =
    group.type === 'single'
      ? group.required
        ? 'Pick 1'
        : 'Pick up to 1'
      : group.type === 'stepper'
        ? group.max >= mods.length * maxQty
          ? `Pick any · up to ${maxQty} of each`
          : `Pick up to ${group.max} · up to ${maxQty} of each`
        : free
          ? 'Pick any · no charge'
          : group.max >= mods.length
            ? 'Pick any'
            : `Pick up to ${group.max}`
  // Optional single choice uses a checkbox so it can be cleared (Figma "Add fries").
  const control = group.type === 'single' && group.required ? 'radio' : 'checkbox'

  return (
    <section data-group={group.id} className="flex scroll-mt-16 flex-col gap-1 border-t border-border-default pt-5">
      <div className="flex items-start justify-between gap-3 pb-1">
        <div className="flex flex-col gap-0.5">
          <h3 className="title-s">{group.name}</h3>
          <p className={cn('caption', error ? 'text-state-error' : 'text-text-tertiary')}>
            {error ? `Choose ${group.min} to continue` : caption}
          </p>
        </div>
        <Badge variant={error ? 'error' : group.required ? 'solid' : 'outline'}>{group.required ? 'Required' : 'Optional'}</Badge>
      </div>
      <div className="flex flex-col">
        {mods.map((m) => {
          const qty = picked[m.id] ?? 0
          const isUnavailable = unavailable.has(m.id)
          const common = {
            label: m.name,
            surcharge: m.price > 0 ? m.price : undefined,
            unavailable: isUnavailable,
          }
          if (group.type === 'stepper') {
            return (
              <OptionRow
                key={m.id}
                {...common}
                control="stepper"
                quantity={qty}
                max={Math.min(m.maxQty, qty + (group.max - total))}
                disabled={disabled || (full && qty === 0)}
                onQuantityChange={(q) => onChange(m, q)}
              />
            )
          }
          return (
            <OptionRow
              key={m.id}
              {...common}
              control={control}
              name={group.id}
              selected={qty > 0}
              // Single choice can always switch; multi stops at max.
              disabled={disabled || (group.type === 'multi' && full && qty === 0)}
              onChange={(checked) => onChange(m, group.type === 'single' ? (qty > 0 && control === 'checkbox' ? 0 : 1) : checked ? 1 : 0)}
            />
          )
        })}
      </div>
    </section>
  )
}
