import type { ReactNode } from 'react'
import type { Order, Store } from '../../../data/schema'
import { cn } from '../../../lib/cn'
import { itemById } from '../../../lib/data'
import { menuImage } from '../../../lib/format'
import { directionsUrl } from '../../../lib/geo'
import { cardPart, dateTime, lineOptions, lineTotals, paymentLabelOf, type Hero, type Step } from '../../../lib/orderDetail'
import { vatIncluded } from '../../../lib/checkout'
import { Button } from '../../ui/Button'
import { Icon } from '../../ui/Icon'
import { Price } from '../../ui/Price'
import { ProductImage } from '../../ui/ProductImage'

/* ------------------------------- Status hero ------------------------------ */

const heroTones = {
  dark: { box: 'bg-surface-inverse', number: 'text-text-on-inverse', tag: 'bg-surface-base text-text-primary' },
  success: { box: 'bg-state-success', number: 'text-text-on-inverse', tag: 'bg-surface-base text-state-success' },
  base: { box: 'bg-surface-base', number: 'text-text-primary', tag: 'bg-surface-muted text-text-primary' },
  error: { box: 'bg-state-error-subtle', number: 'text-state-error', tag: 'bg-surface-base text-state-error' },
} as const

/** Figma "Status hero": the order number (Title/XL) and a status tag with a chevron. Opens the Order status sheet. */
export function StatusHero({ hero, number, onOpen }: { hero: Hero; number: string; onOpen: () => void }) {
  const t = heroTones[hero.tone]
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Order ${number}, ${hero.label}. Show order status`}
      className={cn('flex w-full items-center justify-between gap-3 rounded-8 p-4 text-start transition-colors duration-300 ease-card', t.box)}
    >
      <span className={cn('min-w-0 truncate title-xl', t.number)}>#{number}</span>
      <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-4 py-1 ps-2 pe-1.5 label-m transition-colors duration-300 ease-card', t.tag)}>
        {hero.label}
        <Icon name="chev" size={16} className="shrink-0" />
      </span>
    </button>
  )
}

/* ------------------------------ Shared pieces ----------------------------- */

export function Card({ title, aside, className, children }: { title?: string; aside?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn('flex flex-col rounded-8 bg-surface-base p-4', className)}>
      {title && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="title-l text-text-primary">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  )
}

/** "Label ........ value" in Body/M secondary and Label/M primary. */
export function InfoRow({ label, children, labelClass }: { label: string; children: ReactNode; labelClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn('body-m text-text-secondary', labelClass)}>{label}</span>
      <span className="text-end label-m text-text-primary">{children}</span>
    </div>
  )
}

const Divider = () => <span aria-hidden className="h-px shrink-0 bg-border-default" />

/** Caption label over a Label/L value. */
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="caption text-text-tertiary">{label}</span>
      <span className="label-l text-text-primary">{children}</span>
    </div>
  )
}

/* ------------------------------- Location card ---------------------------- */

type LocationProps = {
  order: Order
  store: Store
  /** Carhop car text, split into lines at " · ". */
  car: string
  /** Carhop and active: Edit opens the parking sheet. */
  onEditCar?: () => void
}

/** Figma "PickupLocation": branch with Directions; carhop adds the car (and parking once arrived); dine-in starts with the arrival time. */
export function LocationCard({ order, store, car, onEditCar }: LocationProps) {
  const arrived = order.status === 'arrived'
  const branch = (
    <div className="flex items-center gap-3">
      <Detail label="Branch">{store.name}</Detail>
      {!arrived && (
        <Button
          variant="secondary"
          size="md"
          leadingIcon="nav"
          className="w-33"
          onClick={() => window.open(directionsUrl({ lat: store.lat, lng: store.lng }), '_blank', 'noopener')}
        >
          Directions
        </Button>
      )}
    </div>
  )
  return (
    <section className="flex flex-col gap-3 rounded-8 bg-surface-base p-4">
      {order.method === 'dineIn' && order.readyAt && <Detail label="Arrival">Dine-in · arriving at {dateTimeClock(order.readyAt)}</Detail>}
      {branch}
      {order.method === 'carhop' && car && (
        <div className="flex items-center gap-3">
          <Detail label="Your car">
            {car.split(' · ').map((part) => (
              <span key={part} className="block">
                {part}
              </span>
            ))}
          </Detail>
          {onEditCar && !arrived && (
            <button type="button" onClick={onEditCar} className="shrink-0 cta-m text-text-primary underline underline-offset-4">
              Edit
            </button>
          )}
        </div>
      )}
      {arrived && order.parkingSpot && <Detail label="Parking spot">{order.parkingSpot}</Detail>}
      {arrived && (
        <Button fullWidth size="md" disabled leadingIcon="check">
          Arrived at {dateTimeClock(order.arrivedAt)}
        </Button>
      )}
    </section>
  )
}

const dateTimeClock = (iso?: string) => dateTime(iso).split(' · ').pop()

/* -------------------------------- Your order ------------------------------ */

/** Figma "Items": item count, Order item rows with dividers, and the order note. */
export function ItemsCard({ order }: { order: Order }) {
  const totals = lineTotals(order)
  const count = order.items.reduce((n, i) => n + i.quantity, 0)
  return (
    <Card title="Your order" aside={<span className="caption text-text-tertiary">{count} {count === 1 ? 'item' : 'items'}</span>} className="gap-1">
      <ul className="flex flex-col">
        {order.items.map((i, k) => {
          const slug = itemById.get(i.itemId)?.slug
          const options = lineOptions(i)
          return (
            <li key={`${i.itemId}-${k}`} className={cn('flex items-start gap-3 py-3', k > 0 && 'border-t border-border-default')}>
              <ProductImage src={slug ? menuImage(slug) : ''} alt={i.name} iconSize={18} className="size-12 shrink-0 rounded-8" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="flex gap-1.5 product-m text-text-primary">
                  <span className="shrink-0">{i.quantity}×</span>
                  <span className="min-w-0 flex-1">{i.name}</span>
                </p>
                {options && <p className="body-s text-text-secondary">{options}</p>}
              </div>
              <Price amount={totals[k]} size="md" />
            </li>
          )
        })}
      </ul>
      {order.note && <p className="rounded-4 bg-surface-muted p-3 body-s break-words text-text-primary">Note: {order.note}</p>}
    </Card>
  )
}

/* ------------------------------ Payment details --------------------------- */

/** Figma "PaymentDetails": totals, then how it was paid (balance and card split when balance was used). */
export function PaymentCard({ order }: { order: Order }) {
  const balance = order.balanceUsed ?? 0
  const rest = Math.max(0, order.total - balance)
  const label = paymentLabelOf(order)
  return (
    <Card title="Payment details" className="gap-2.5">
      <InfoRow label="Subtotal">
        <Price amount={order.subtotal} size="md" />
      </InfoRow>
      <InfoRow label="Includes VAT (15%)">
        <Price amount={vatIncluded(order.total)} size="md" />
      </InfoRow>
      <Divider />
      <div className="flex items-center justify-between gap-3">
        <span className="label-l text-text-primary">Total</span>
        <Price amount={order.total} size="lg" />
      </div>
      <Divider />
      {balance > 0 ? (
        <>
          <InfoRow label="INDPT balance">
            <Price amount={balance} size="md" />
          </InfoRow>
          {rest > 0 && (
            <InfoRow label={cardPart(label)}>
              <Price amount={rest} size="md" />
            </InfoRow>
          )}
        </>
      ) : (
        <InfoRow label="Paid with">{label}</InfoRow>
      )}
      <InfoRow label="Paid on">{dateTime(order.placedAt)}</InfoRow>
      <InfoRow label="Status">{order.status === 'cancelled' ? 'Refunded' : 'Paid'}</InfoRow>
    </Card>
  )
}

/** Figma "Refund": amount, where it went, when, and the INDPT balance note. */
export function RefundCard({ order }: { order: Order }) {
  if (!order.refund) return null
  return (
    <Card title="Refund" className="gap-2.5">
      <InfoRow label="Amount">
        <Price amount={order.refund.amount} size="md" />
      </InfoRow>
      <InfoRow label="Refunded to">INDPT balance</InfoRow>
      <InfoRow label="Refunded on">{dateTime(order.refund.refundedAt)}</InfoRow>
      <p className="flex items-center gap-1.5 rounded-6 bg-surface-muted px-2.5 py-2 body-s text-text-secondary">
        <Icon name="info" size={16} className="shrink-0" />
        Refund added to your INDPT balance. It will be used automatically on your next order.
      </p>
      <a href="https://indpt.app" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 self-start label-m text-text-primary underline underline-offset-4">
        INDPT account
        <Icon name="external" size={16} />
      </a>
    </Card>
  )
}

/** Figma "OrderInfo": order number (past orders), order type, store. */
export function OrderInfoCard({ order, store, past, methodLabel }: { order: Order; store: Store; past: boolean; methodLabel: string }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-8 bg-surface-base p-4">
      {past && <InfoRow label="Order number">#{order.id.replace(/^SLT-/, '')}</InfoRow>}
      <InfoRow label="Order type">{methodLabel}</InfoRow>
      <InfoRow label="Store">{store.name}</InfoRow>
    </section>
  )
}

/* ------------------------------ Status timeline --------------------------- */

/**
 * Figma "Order timeline" in the Order status sheet. Prototype: tapping a step
 * moves the order to that status.
 */
export function Timeline({ steps, onPick }: { steps: Step[]; onPick?: (s: Step) => void }) {
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => {
        const last = i === steps.length - 1
        const marker = {
          done: 'bg-state-success text-text-on-inverse',
          failed: 'bg-state-error text-text-on-inverse',
          current: 'border-2 border-border-strong',
          upcoming: 'border-[1.5px] border-text-tertiary',
        }[s.state]
        const pickable = onPick && s.state !== 'failed'
        const Row = pickable ? 'button' : 'div'
        return (
          <li key={s.status}>
            <Row
              {...(pickable ? { type: 'button' as const, onClick: () => onPick(s) } : {})}
              className={cn('flex h-12 w-full gap-3 text-start', pickable && 'active:opacity-70')}
            >
              <span className="flex h-full flex-col items-center">
                <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-2', marker)}>
                  {s.state === 'done' && <Icon name="check" size={14} />}
                  {s.state === 'failed' && <Icon name="x" size={14} />}
                  {s.state === 'current' && <span className="size-2 bg-surface-inverse" />}
                </span>
                {!last && <span className={cn('w-0.5 flex-1', s.state === 'done' ? 'bg-state-success' : 'bg-border-default')} />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 pb-2.5">
                <span
                  className={cn(
                    s.state === 'upcoming' ? 'body-m text-text-tertiary' : 'label-l',
                    s.state === 'failed' ? 'text-state-error' : s.state !== 'upcoming' && 'text-text-primary',
                  )}
                >
                  {s.label}
                </span>
                {s.time && <span className="caption text-text-tertiary">{s.time}</span>}
              </span>
            </Row>
          </li>
        )
      })}
    </ol>
  )
}
