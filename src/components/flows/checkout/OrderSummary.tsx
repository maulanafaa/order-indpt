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
 * 16 px between blocks; the note box stands in for the first divider.
 */
export function OrderSummary({ lines, count, subtotal, vat, total, note, balance, open, onToggle }: OrderSummaryProps) {
  const listId = useId()
  const hasNote = Boolean(note.trim())
  return (
    <section aria-labelledby={`${listId}-title`} className="flex flex-col gap-4 rounded-8 bg-surface-base p-4">
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
      </Collapse>

      {hasNote ? (
        <p className="rounded-4 bg-surface-muted p-3 body-s break-words text-text-primary">Note: {note.trim()}</p>
      ) : (
        <Divider />
      )}

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
 * Figma "PlaceOrderBar": Type=Apple Pay (black Pay with Apple Pay button) or
 * Type=Default (Place order · price, centred). No caption.
 */
export function PlaceOrderBar({
  applePay,
  label,
  amount,
  loading,
  onPlace,
}: {
  applePay: boolean
  label: string
  /** Shown after the label; left out when nothing is left to pay. */
  amount: number | null
  loading: boolean
  onPlace: () => void
}) {
  return (
    <div className="sticky bottom-0 z-20 mt-auto bg-surface-base px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))] shadow-bar">
      {applePay ? (
        <button
          type="button"
          onClick={onPlace}
          disabled={loading}
          data-loading={loading || undefined}
          className="relative flex h-13 w-full items-center justify-center rounded-full bg-surface-inverse text-[17px] leading-none font-semibold text-text-on-inverse data-loading:pointer-events-none"
        >
          <span className={cn('font-sans', loading && 'invisible')}>Pay with Apple Pay</span>
          {loading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner />
              <span className="sr-only">Loading</span>
            </span>
          )}
        </button>
      ) : (
        <Button fullWidth loading={loading} onClick={onPlace}>
          <span className="inline-flex items-center gap-2">
            {label}
            {amount !== null && (
              <>
                <span aria-hidden>·</span>
                <Price amount={amount} size="cta" tone="inverse" />
              </>
            )}
          </span>
        </Button>
      )}
    </div>
  )
}
