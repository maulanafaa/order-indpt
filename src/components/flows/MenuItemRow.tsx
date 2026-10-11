import type { Item } from '../../data/schema'
import { cn } from '../../lib/cn'
import { Badge } from '../ui/Badge'
import { menuImage } from '../../lib/format'
import { IconButton } from '../ui/IconButton'
import { Price } from '../ui/Price'
import { ProductImage } from '../ui/ProductImage'
import { QuantityStepper } from '../ui/QuantityStepper'

export type MenuItemControls = {
  quantity: number
  soldOut: boolean
  onOpen: () => void
  onAdd: () => void
  onDecrease: () => void
  /** Branch not taking online orders: the add button is disabled. */
  disabled?: boolean
}

/** Best seller (promo) or New (solid) badge, or nothing. */
export function ItemBadge({ item, className }: { item: Item; className?: string }) {
  if (item.isNew) return <Badge variant="solid" className={className}>New</Badge>
  if (item.isBestSeller) return <Badge variant="promo" className={className}>Best seller</Badge>
  return null
}

/** Figma "Menu item", Style = Image left: Default / In cart / Sold out, with Best seller or New tags. */
export function MenuItemRow({ item, quantity, soldOut, onOpen, onAdd, onDecrease, disabled }: { item: Item } & MenuItemControls) {
  return (
    <article
      onClick={onOpen}
      className="flex cursor-pointer border-b border-border-default bg-surface-base active:bg-surface-muted/60"
      aria-label={item.name}
    >
      <div className="shrink-0 p-2.5 ps-4">
        <ProductImage src={menuImage(item.slug)} alt={item.name} dimmed={soldOut} className="size-20 rounded-8" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-4 pe-4 ps-2">
        {!soldOut && (item.isNew || item.isBestSeller) && (
          <div className="flex pb-0.5">
            <ItemBadge item={item} />
          </div>
        )}
        <h3 className={cn('product-l', soldOut ? 'text-text-tertiary' : 'text-text-primary')}>{item.name}</h3>
        {item.description && (
          <p className={cn('line-clamp-2 body-s', soldOut ? 'text-text-tertiary' : 'text-text-secondary')}>{item.description}</p>
        )}
        <div className="mt-auto flex min-h-8 items-center justify-between gap-1 pt-1">
          {soldOut ? (
            <span className="label-m text-text-tertiary">Unavailable today</span>
          ) : (
            <>
              <Price amount={item.price} size="md" />
              <AddControl item={item} quantity={quantity} onAdd={onAdd} onDecrease={onDecrease} disabled={disabled} />
            </>
          )}
        </div>
      </div>
    </article>
  )
}

/** Outline + when not in the cart, solid stepper (trash at 1) when it is. */
export function AddControl({
  item,
  quantity,
  onAdd,
  onDecrease,
  disabled,
}: {
  item: Item
  quantity: number
  onAdd: () => void
  onDecrease: () => void
  disabled?: boolean
}) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      {quantity > 0 ? (
        <QuantityStepper
          variant="solid"
          size="sm"
          value={quantity}
          itemName={item.name}
          onChange={(next) => (next > quantity ? onAdd() : onDecrease())}
        />
      ) : (
        <IconButton icon="plus" label={`Add ${item.name}`} variant="outline" size={32} onClick={onAdd} disabled={disabled} />
      )}
    </div>
  )
}
