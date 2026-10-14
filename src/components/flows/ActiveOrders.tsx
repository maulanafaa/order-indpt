import { useState } from 'react'
import { activeCopy, type ActiveOrder } from '../../lib/activeOrders'
import { cn } from '../../lib/cn'
import { useNow } from '../../lib/useNow'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

/**
 * Figma "Active order" (Status × Order type): under the branch header. Black,
 * green when ready to collect. Carhop ready has an I'm here button instead of the chevron.
 */
export function ActiveOrderCard({
  order,
  onOpen,
  onImHere,
  className,
}: {
  order: ActiveOrder
  onOpen: () => void
  onImHere?: () => void
  className?: string
}) {
  const copy = activeCopy(order, useNow().getTime())
  const imHere = copy.imHere && onImHere
  const body = (
    <>
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-base/16">
        <Icon name={copy.icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate label-l">{copy.title}</span>
        <span className={cn('truncate caption', copy.success ? 'text-text-on-inverse' : 'text-text-on-inverse-muted')}>
          #{order.number} · {copy.detail}
        </span>
      </span>
    </>
  )
  const box = cn(
    'flex w-full items-center gap-4 rounded-8 px-3.5 py-4 text-start text-text-on-inverse',
    copy.success ? 'bg-state-success' : 'bg-surface-inverse',
    className,
  )
  if (imHere)
    return (
      <div className={box}>
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-4 text-start active:opacity-90">
          {body}
        </button>
        <Button variant="secondary" size="md" onClick={onImHere}>
          I’m here
        </Button>
      </div>
    )
  return (
    <button type="button" onClick={onOpen} className={cn(box, 'active:opacity-90')}>
      {body}
      <Icon name="chev" size={20} className="shrink-0" />
    </button>
  )
}

/** Banner area: one card, or a swipeable row with dots for several (Figma 2.4). */
export function ActiveOrderBanner({
  orders,
  onOpen,
  onImHere,
}: {
  orders: ActiveOrder[]
  onOpen: (o: ActiveOrder) => void
  onImHere: (o: ActiveOrder) => void
}) {
  const [index, setIndex] = useState(0)
  if (orders.length === 1) {
    return (
      <div className="px-4 pb-4">
        <ActiveOrderCard order={orders[0]} onOpen={() => onOpen(orders[0])} onImHere={() => onImHere(orders[0])} />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2.5 pb-4" aria-label="Active orders">
      <div
        onScroll={(e) => {
          const el = e.currentTarget
          const card = el.firstElementChild as HTMLElement | null
          if (card) setIndex(Math.round(el.scrollLeft / (card.offsetWidth + 8)))
        }}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {orders.map((o) => (
          <ActiveOrderCard key={o.id} order={o} onOpen={() => onOpen(o)} onImHere={() => onImHere(o)} className="w-78 shrink-0 snap-start" />
        ))}
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden>
        {orders.map((o, i) => (
          <span key={o.id} className={cn('h-1.5 rounded-full transition-[width,background-color] duration-200', i === index ? 'w-4 bg-surface-inverse' : 'w-1.5 bg-border-default')} />
        ))}
      </div>
    </div>
  )
}
