import type { ReactNode } from 'react'
import type { Order } from '../../../data/schema'
import { cn } from '../../../lib/cn'
import { itemById } from '../../../lib/data'
import { menuImage } from '../../../lib/format'
import { cardPart, lineOptions, lineTotals, paymentLabelOf, type Hero, type Step } from '../../../lib/orderDetail'
import { vatIncluded } from '../../../lib/checkout'
import { Button } from '../../ui/Button'
import { Icon, type IconName } from '../../ui/Icon'
import { Price } from '../../ui/Price'
import { ProductImage } from '../../ui/ProductImage'
import { Spinner } from '../../ui/Spinner'

/* ------------------------------- Status hero ------------------------------ */

const heroTones = {
  dark: { box: 'bg-surface-inverse', text: 'text-text-on-inverse' },
  success: { box: 'bg-state-success', text: 'text-text-on-inverse' },
  base: { box: 'bg-surface-base inset-ring inset-ring-border-default', text: 'text-text-primary' },
  error: { box: 'bg-state-error-subtle', text: 'text-state-error' },
} as const

/**
 * Figma 110:723 "Status hero": the order number (Title/XL) and the status (icon + Label/M).
 * Tapping it opens the Order status sheet; only a past order shows the chevron.
 */
export function StatusHero({ hero, number, chevron, onOpen }: { hero: Hero; number: string; chevron?: boolean; onOpen: () => void }) {
  const t = heroTones[hero.tone]
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Order ${number}, ${hero.label}. Show order status`}
      className={cn('flex w-full items-center justify-between gap-3 rounded-8 px-5 py-4 text-start transition-colors duration-300 ease-card', t.box, t.text)}
    >
      <span className="min-w-0 truncate title-xl">#{number}</span>
      <span className="inline-flex shrink-0 items-center gap-1.5 label-m">
        <Icon name={hero.icon} size={18} className="shrink-0" />
        {hero.label}
        {chevron && <Icon name="chev" size={16} className="shrink-0" />}
      </span>
    </button>
  )
}

/** Figma 847:107943 "StaffNotice": carhop after I'm here. */
export function StaffNotice({ onCall }: { onCall: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-8 bg-surface-muted p-3.5 animate-content-in">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="title-s text-text-primary">Staff is on the way</p>
        <p className="body-s text-text-secondary">Stay in your car, we’ll bring it to you.</p>
      </div>
      <Button variant="secondary" size="md" leadingIcon="phone" onClick={onCall}>
        Call
      </Button>
    </div>
  )
}

/* ------------------------------ Shared pieces ----------------------------- */

/** "Label ........ value" in Body/M secondary and Label/M primary. */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 body-m text-text-secondary">{label}</span>
      <span className="min-w-0 text-end label-m text-text-primary">{children}</span>
    </div>
  )
}

const Divider = () => <span aria-hidden className="h-px shrink-0 bg-border-default" />

/** Underlined text link with a 16px icon (Store, Download invoice). */
function IconLink({ icon, loading, onClick, children }: { icon: IconName; loading?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading || undefined}
      className="inline-flex items-center gap-1.5 label-m text-text-primary active:opacity-70"
    >
      {loading ? <Spinner size={16} /> : <Icon name={icon} size={16} className="shrink-0" />}
      <span className="underline underline-offset-2">{children}</span>
    </button>
  )
}

/* ------------------------------- Order info ------------------------------- */

type InfoProps = {
  /** "Pickup at 7:15 PM". */
  typeText: string
  storeName: string
  /** Active pickup and dine-in: the store opens directions. */
  onDirections?: () => void
  /** Carhop details under a divider. */
  children?: ReactNode
}

/** Figma "PickupLocation": order type and store, plus the carhop car and parking. */
export function OrderInfo({ typeText, storeName, onDirections, children }: InfoProps) {
  return (
    <section aria-label="Order info" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <InfoRow label="Order type">{typeText}</InfoRow>
        <InfoRow label="Store">
          {onDirections ? (
            <IconLink icon="nav" onClick={onDirections}>
              {storeName}
            </IconLink>
          ) : (
            storeName
          )}
        </InfoRow>
      </div>
      {children && (
        <>
          <Divider />
          {children}
        </>
      )}
    </section>
  )
}

/** Figma "Car": a label with a link, over a muted box with an icon. */
function CarhopDetail({ label, action, onAction, icon, children }: { label: string; action?: string; onAction?: () => void; icon: IconName; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-3">
        <span className="body-m text-text-secondary">{label}</span>
        {action && onAction && (
          <button type="button" onClick={onAction} className="cta-m text-text-primary underline underline-offset-2 active:opacity-70">
            {action}
          </button>
        )}
      </div>
      <div className="flex items-start gap-2 rounded-4 bg-surface-muted px-2.5 py-3">
        <span className="flex shrink-0 p-0.5">
          <Icon name={icon} size={16} className="text-text-primary" />
        </span>
        <p className="min-w-0 flex-1 body-s break-words text-text-primary">{children}</p>
      </div>
    </div>
  )
}

/** Carhop: the car (Edit) and where to park, or where they parked (Change spot). */
export function CarhopInfo({ car, parking, onEditCar, onChangeSpot }: { car: string; parking: string; onEditCar?: () => void; onChangeSpot?: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <CarhopDetail label="Your car" action="Edit" onAction={onEditCar} icon="car">
        {car || 'Add your car so staff can find you.'}
      </CarhopDetail>
      <CarhopDetail label="Parking spot" action="Change spot" onAction={onChangeSpot} icon="parking">
        {parking}
      </CarhopDetail>
    </div>
  )
}

/* -------------------------------- Your order ------------------------------ */

/** Figma "Items": item count, Order item rows with dividers, and the order note. */
export function ItemsSection({ order }: { order: Order }) {
  const totals = lineTotals(order)
  const count = order.items.reduce((n, i) => n + i.quantity, 0)
  return (
    <section aria-labelledby="items-title" className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <h2 id="items-title" className="title-l text-text-primary">
          Your order
        </h2>
        <span className="caption text-text-tertiary">
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </div>
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
    </section>
  )
}

/* ------------------------------ Payment details --------------------------- */

/** Figma "PaymentDetails": totals, how it was paid (balance and card split when balance was used), and the invoice link. */
export function PaymentSection({ order, downloading, onDownload }: { order: Order; downloading: boolean; onDownload: () => void }) {
  const balance = order.balanceUsed ?? 0
  const rest = Math.max(0, order.total - balance)
  const label = paymentLabelOf(order)
  return (
    <section aria-labelledby="payment-title" className="flex flex-col gap-2.5">
      <h2 id="payment-title" className="title-l text-text-primary">
        Payment details
      </h2>
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
      <div className="flex justify-end pt-1">
        <IconLink icon="receipt" loading={downloading} onClick={onDownload}>
          Download invoice
        </IconLink>
      </div>
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
