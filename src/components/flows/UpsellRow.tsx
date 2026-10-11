import { useEffect, useState } from 'react'
import type { Item } from '../../data/schema'
import { cn } from '../../lib/cn'
import { menuImage } from '../../lib/format'
import { Icon } from '../ui/Icon'
import { Price } from '../ui/Price'
import { ProductImage } from '../ui/ProductImage'

const TOOLTIP_MS = 2000

/**
 * Figma "Upsell" in the item sheet: "Goes well with this" row of Upsell cards.
 * "+" adds the item to the cart right away; the button turns into a check and a
 * tooltip ("Original Fries added to your cart") shows for about 2 seconds.
 */
export function UpsellRow({ items, onAdd, disabled }: { items: Item[]; onAdd: (item: Item) => void; disabled?: boolean }) {
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [tip, setTip] = useState<Item | null>(null)

  useEffect(() => {
    if (!tip) return
    const t = window.setTimeout(() => setTip(null), TOOLTIP_MS)
    return () => window.clearTimeout(t)
  }, [tip])

  if (!items.length) return null
  return (
    <section className="flex flex-col gap-3 border-t border-border-default py-4" aria-label="Goes well with this">
      <h3 className="title-s">Goes well with this</h3>
      <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pt-12 -mt-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const isAdded = added.has(item.id)
          return (
            <li key={item.id} className="relative flex w-24 shrink-0 flex-col gap-1.5">
              {tip?.id === item.id && (
                <div role="status" className="pointer-events-none absolute start-0 -top-12 z-10 flex flex-col items-start">
                  <span className="rounded-4 bg-surface-inverse px-3 py-2 label-m whitespace-nowrap text-text-on-inverse">
                    {item.name} added to your cart
                  </span>
                  <span aria-hidden className="ms-[41px] border-x-[7px] border-t-[7px] border-x-transparent border-t-surface-inverse" />
                </div>
              )}
              <div className="relative">
                <ProductImage src={menuImage(item.slug)} alt={item.name} iconSize={24} className="h-20 w-full rounded-8" />
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={isAdded ? `${item.name} added. Add another` : `Add ${item.name}`}
                  onClick={() => {
                    onAdd(item)
                    setAdded((s) => new Set(s).add(item.id))
                    setTip(item)
                  }}
                  className={cn(
                    'absolute end-1 bottom-1 inline-flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-35',
                    isAdded
                      ? 'bg-surface-inverse text-text-on-inverse'
                      : 'bg-surface-base text-text-primary inset-ring inset-ring-border-default active:bg-surface-muted',
                  )}
                >
                  <Icon name={isAdded ? 'check' : 'plus'} size={16} />
                </button>
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
