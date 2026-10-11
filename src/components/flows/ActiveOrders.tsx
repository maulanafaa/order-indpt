import { useId, useState } from 'react'
import { activeCopy, pillText, type ActiveOrder } from '../../lib/activeOrders'
import { cn } from '../../lib/cn'
import { BottomSheet } from '../ui/BottomSheet'
import { Icon } from '../ui/Icon'
import { SheetHeader } from '../ui/SheetHeader'

/**
 * Figma "Active order", Style = Card: under the branch header. Black, green when ready.
 * Tapping opens the order.
 */
export function ActiveOrderCard({ order, many = false, onOpen, className }: { order: ActiveOrder; many?: boolean; onOpen: () => void; className?: string }) {
  const copy = activeCopy(order, many)
  const ready = order.stage === 'ready'
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full items-center gap-4 rounded-8 px-3.5 py-4 text-start text-text-on-inverse active:opacity-90',
        ready ? 'bg-state-success' : 'bg-surface-inverse',
        className,
      )}
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-base/16">
        <Icon name={copy.icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate label-l">{copy.title}</span>
        <span className={cn('truncate caption', ready ? 'text-text-on-inverse' : 'text-text-on-inverse-muted')}>
          #{order.number} · {copy.detail}
        </span>
      </span>
      <Icon name="chev" size={20} className="shrink-0" />
    </button>
  )
}

/** Banner area: one card, or a swipeable row with dots for several (Figma 2.4). */
export function ActiveOrderBanner({ orders, onOpen }: { orders: ActiveOrder[]; onOpen: (o: ActiveOrder) => void }) {
  const [index, setIndex] = useState(0)
  if (orders.length === 1) {
    return (
      <div className="px-4 pb-4">
        <ActiveOrderCard order={orders[0]} onOpen={() => onOpen(orders[0])} />
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
          <ActiveOrderCard key={o.id} order={o} many onOpen={() => onOpen(o)} className="w-78 shrink-0 snap-start" />
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

/** Figma "Active order", Style = Pill: floats above the cart bar once the header has scrolled away. */
export function ActiveOrderPill({ orders, onClick, className }: { orders: ActiveOrder[]; onClick: () => void; className?: string }) {
  const one = orders.length === 1 ? orders[0] : null
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-surface-inverse py-2.5 ps-3.5 pe-3 label-m text-text-on-inverse drop-shadow-[0_4px_6px_rgb(0_0_0/0.16)]',
        className,
      )}
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-state-success" />
      <span className="whitespace-nowrap">{pillText(orders)}</span>
      {one && <span className="whitespace-nowrap text-text-on-inverse-muted">#{one.number}</span>}
      <Icon name="chev" size={16} className="shrink-0" />
    </button>
  )
}

/** "Your active orders" sheet for several orders on this branch. */
export function ActiveOrdersSheet({
  open,
  orders,
  onClose,
  onOpen,
}: {
  open: boolean
  orders: ActiveOrder[]
  onClose: () => void
  onOpen: (o: ActiveOrder) => void
}) {
  const titleId = useId()
  return (
    <BottomSheet open={open} onClose={onClose} bare ariaLabel="Your active orders">
      <SheetHeader title="Your active orders" titleId={titleId} onClose={onClose} />
      <div className="flex flex-col gap-2 px-4 pt-6 pb-8">
        {orders.map((o) => (
          <ActiveOrderCard key={o.id} order={o} many onOpen={() => onOpen(o)} />
        ))}
      </div>
    </BottomSheet>
  )
}
