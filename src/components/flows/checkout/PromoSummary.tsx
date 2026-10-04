import type { OrderTotals } from '../../../lib/totals'
import { useCheckout } from '../../../lib/checkout'
import { Icon } from '../../ui/Icon'
import { Price } from '../../ui/Price'

/** "Add promo code" row, or the applied promo card with Remove (cart sheet). */
export function PromoRow({ totals, onOpen }: { totals: OrderTotals; onOpen: () => void }) {
  const code = useCheckout((s) => s.promoCode)
  const setCheckout = useCheckout((s) => s.set)
  if (!code)
    return (
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-8 bg-surface-base p-4 text-start active:bg-surface-muted">
        <Icon name="tag" size={20} />
        <span className="flex-1 label-l text-text-primary">Add promo code</span>
        <Icon name="chev" size={18} />
      </button>
    )
  const ok = totals.promo?.ok
  return (
    <div className={ok ? 'flex items-center gap-3 rounded-8 border border-state-success bg-state-success-subtle p-3.5' : 'flex items-center gap-3 rounded-8 border border-state-warning bg-state-warning-subtle p-3.5'}>
      <Icon name="tag" size={20} className={ok ? 'text-state-success' : 'text-state-warning'} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="label-m text-text-primary">{code} {ok ? 'applied' : 'can’t be used yet'}</p>
        {ok ? (
          <p className="inline-flex items-center gap-1 body-s text-state-success">
            You save <Price amount={totals.discount} size="sm" tone="inherit" />
          </p>
        ) : (
          <p className="body-s text-state-warning">{whyNot(totals)}</p>
        )}
      </div>
      <button type="button" className="cta-m text-text-primary underline" onClick={() => setCheckout({ promoCode: null })}>
        Remove
      </button>
    </div>
  )
}

function whyNot(t: OrderTotals) {
  const p = t.promo
  if (!p || p.ok) return ''
  if (p.reason === 'minOrder') return 'Add more items to reach the minimum order.'
  if (p.reason === 'method') return 'Not valid for the order type you picked.'
  if (p.reason === 'requirement') return 'Add a burger and Original Fries to use it.'
  if (p.reason === 'expired') return 'This code has expired.'
  return 'This code isn’t valid.'
}

/** Subtotal, promo, VAT, total rows (cart "Payment details" and checkout "Order summary"). */
export function TotalsRows({ totals }: { totals: OrderTotals }) {
  return (
    <>
      <Row label={`Subtotal · ${totals.count} ${totals.count === 1 ? 'item' : 'items'}`} amount={totals.subtotal} />
      {totals.promo?.ok && (
        <div className="flex items-center justify-between gap-3 body-m text-state-success">
          <span>Promo · {totals.promo.promo.code}</span>
          <span className="inline-flex items-center gap-0.5 price-m">
            −<Price amount={totals.discount} size="md" tone="inherit" />
          </span>
        </div>
      )}
      <Row label="Includes VAT (15%)" amount={totals.vat} />
      <span aria-hidden className="h-px bg-border-default" />
      <div className="flex items-center justify-between gap-3">
        <span className="label-l text-text-primary">Total</span>
        <Price amount={totals.total} size="lg" />
      </div>
    </>
  )
}

function Row({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="body-m text-text-secondary">{label}</span>
      <Price amount={amount} size="md" />
    </div>
  )
}
