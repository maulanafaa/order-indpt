import type { Item } from '../../data/schema'
import { cn } from '../../lib/cn'
import { menuImage } from '../../lib/format'
import { Price } from '../ui/Price'
import { ProductImage } from '../ui/ProductImage'
import { AddControl, ItemBadge, type MenuItemControls } from './MenuItemRow'

/** Figma "Menu card": used for the For you 2 by 2 grid (Best seller and New items). */
export function MenuTile({ item, quantity, soldOut, onOpen, onAdd, onDecrease, disabled }: { item: Item } & MenuItemControls) {
  return (
    <article onClick={onOpen} aria-label={item.name} className="flex cursor-pointer flex-col bg-surface-base active:bg-surface-muted/60">
      <div className="relative">
        <ProductImage src={menuImage(item.slug)} alt={item.name} dimmed={soldOut} className="h-[170px] w-full" />
        <ItemBadge item={item} className="absolute start-2.5 top-2.5" />
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 pt-2.5 pb-4">
        <h3 className={cn('truncate product-l', soldOut ? 'text-text-tertiary' : 'text-text-primary')}>{item.name}</h3>
        <div className="mt-auto flex min-h-8 items-center justify-between gap-1">
          {soldOut ? (
            <span className="body-s text-text-tertiary">Unavailable today</span>
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
