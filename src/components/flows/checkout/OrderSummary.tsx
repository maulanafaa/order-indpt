import ApplePayMark from '../../../assets/brands/apple-pay-mark.svg?react'
import { useId, type ReactNode } from 'react'
import { lineTotal, type CartLine } from '../../../lib/cart'
import { cn } from '../../../lib/cn'
import { itemById } from '../../../lib/data'
import { Button } from '../../ui/Button'
import { Collapse } from '../../ui/Collapse'
import { Icon } from '../../ui/Icon'
import { Price } from '../../ui/Price'
import { Spinner } from '../../ui/Spinner'
import { Minus } from './PaymentOptions'

type OrderSummaryProps = {
  lines: CartLine[]
  count: number
  subtotal: number
  vat: number
  total: number
  note: string
  /** INDPT balance used on this order (0 when none). */
  balance: number
  /** Item list open. */
  open: boolean
  onToggle: () => void
}

/**
 * Figma "OrderSummary" (38:2960, 226:16896, 435:67329, 582:39105): item count with a
 * chevron that shows the item list, the cart's order note, the Subtotal and VAT
 * breakdown, then Total. With INDPT balance: Total, balance and To pay.
 * 16 px between blocks. The note shows with the item list.
 */
export function OrderSummary({ lines, count, subtotal, vat, total, note, balance, open, onToggle }: OrderSummaryProps) {
  const listId = useId()
  const hasNote = Boolean(note.trim())
  return (
    <section aria-labelledby={`${listId}-title`} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${listId}-title`} className="title-l text-text-primary">
          Order summary
        </h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={onToggle}
          className="-my-2 -me-1 flex items-center gap-1 py-2 ps-2 pe-1 body-s text-text-secondary"
        >
          {count} {count === 1 ? 'item' : 'items'}
          <Icon name="down" size={16} className={cn('transition-transform duration-300 ease-card', open && 'rotate-180')} />
        </button>
      </div>

      {/* Pulled up by the 16 px gap while closed, so a closed list takes no space. */}
      <Collapse open={open} id={listId} className="-mt-4">
        <ul className="flex flex-col gap-2.5 pt-4">
          {lines.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-3">
              <span className="body-m whitespace-pre-wrap text-text-primary">
                {l.quantity}×{'  '}
                {itemById.get(l.itemId)?.name}
              </span>
              <Price amount={lineTotal(l)} size="md" />
            </li>
          ))}
        </ul>
        {/* The order note opens and closes with the items. */}
        {hasNote && <p className="mt-4 rounded-4 bg-surface-muted p-3 body-s break-words text-text-primary">Note: {note.trim()}</p>}
      </Collapse>

      <Divider />

      <div className="flex flex-col gap-2.5">
        <Row label="Subtotal">
          <Price amount={subtotal} size="md" />
        </Row>
        <Row label="Includes VAT (15%)">
          <Price amount={vat} size="md" />
        </Row>
      </div>

      <Divider />
      {balance > 0 ? (
        <>
          <Row label="Total">
            <Price amount={total} size="md" />
          </Row>
          <Row label="INDPT balance" tone="success">
            <Minus amount={balance} />
          </Row>
          <Divider />
          <Row label="To pay" strong>
            <Price amount={Math.max(0, total - balance)} size="lg" />
          </Row>
        </>
      ) : (
        <Row label="Total" strong>
          <Price amount={total} size="lg" />
        </Row>
      )}
    </section>
  )
}

const Divider = () => <span aria-hidden className="h-px shrink-0 bg-border-default" />

function Row({ label, strong, tone, children }: { label: string; strong?: boolean; tone?: 'success'; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn(strong ? 'label-l text-text-primary' : 'body-m', !strong && (tone === 'success' ? 'text-state-success' : 'text-text-secondary'))}>
        {label}
      </span>
      {children}
    </div>
  )
}

/**
 * Figma "CTA bar" at the end of the checkout (not sticky): Pay with Apple Pay, or
 * Place order. Disabled until the number is verified.
 */
export function PlaceOrderBar({
  applePay,
  label,
  disabled,
  loading,
  onPlace,
}: {
  applePay: boolean
  label: string
  disabled: boolean
  loading: boolean
  onPlace: () => void
}) {
  return (
    <div className="mt-auto bg-surface-base px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))]">
      {applePay && !disabled ? (
        <button
          type="button"
          onClick={onPlace}
          disabled={loading}
          data-loading={loading || undefined}
          className="relative flex h-13 w-full items-center justify-center rounded-full bg-surface-inverse text-text-on-inverse active:opacity-85 data-loading:pointer-events-none"
        >
          {/* Figma "Apple Pay button": "Pay with" (CTA/L) and the Apple Pay mark. */}
          <span aria-hidden className={cn('flex items-center gap-2 px-1', loading && 'invisible')}>
            <span className="cta-l">Pay with</span>
            {/* Nudged down so the mark sits on the same baseline as "Pay with" (measured: 2.5 px high when centred). */}
            <ApplePayMark width={39} height={16} className="translate-y-[2.5px]" />
          </span>
          <span className="sr-only">Pay with Apple Pay</span>
          {loading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner />
              <span className="sr-only">Loading</span>
            </span>
          )}
        </button>
      ) : (
        <Button fullWidth disabled={disabled} loading={loading} onClick={onPlace}>
          {label}
        </Button>
      )}
    </div>
  )
}
