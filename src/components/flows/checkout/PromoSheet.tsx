import { useId, useState, type ReactNode } from 'react'
import type { OrderMethod, Promo } from '../../../data/schema'
import type { CartLine } from '../../../lib/cart'
import { useCheckout } from '../../../lib/checkout'
import { fakeRequest } from '../../../lib/fake'
import { availableOffers, checkPromo, methodsText, promoDate, stubText, type PromoCheck } from '../../../lib/promo'
import { BottomSheet } from '../../ui/BottomSheet'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { OfferCard } from '../../ui/OfferCard'
import { Price } from '../../ui/Price'
import { SheetHeader } from '../../ui/SheetHeader'
import { useToast } from '../../ui/toastContext'

type PromoSheetProps = {
  open: boolean
  onClose: () => void
  lines: CartLine[]
  subtotal: number
  /** Chosen (or default) order method, for method-only codes. */
  method: OrderMethod | null
}

/** Figma "5 · Promo code": enter a code or use an offer. One code per order. */
export function PromoSheet(props: PromoSheetProps) {
  return (
    <BottomSheet open={props.open} onClose={props.onClose} bare ariaLabel="Promo code">
      {props.open && <PromoBody {...props} />}
    </BottomSheet>
  )
}

function PromoBody({ onClose, lines, subtotal, method }: PromoSheetProps) {
  const toast = useToast()
  const setCheckout = useCheckout((s) => s.set)
  const titleId = useId()
  const [code, setCode] = useState('')
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<ReactNode>(null)

  const apply = async (raw: string) => {
    const value = raw.trim().toUpperCase()
    if (!value) return
    setCode(value)
    setError(null)
    setApplying(true)
    await fakeRequest()
    setApplying(false)
    const result = checkPromo(value, { lines, subtotal, method })
    if (!result.ok) {
      setError(errorText(result))
      return
    }
    setCheckout({ promoCode: result.promo.code })
    toast.show({
      type: 'success',
      message: result.promo.type === 'percent' ? `Promo applied. You save ${result.promo.value}% on this order.` : 'Promo applied to your order.',
    })
    onClose()
  }

  const offers = availableOffers()

  return (
    <div className="flex min-h-0 flex-col">
      <SheetHeader title="Promo code" titleId={titleId} onClose={onClose} />
      <p className="px-4 pt-1 body-m text-text-secondary">One code per order.</p>
      <div className="min-h-0 overflow-y-auto px-4 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void apply(code)
          }}
        >
          <Input
            label="Promo code"
            value={code}
            onChange={(v) => {
              setCode(v.toUpperCase().replace(/\s/g, ''))
              setError(null)
            }}
            placeholder="Enter code"
            autoCapitalize="characters"
            autoComplete="off"
            clearable
            error={error ?? undefined}
          />
          <Button type="submit" fullWidth loading={applying} disabled={!code.trim()}>
            Apply
          </Button>
        </form>

        {offers.length > 0 && (
          <section aria-labelledby={`${titleId}-offers`} className="mt-4 flex flex-col gap-3">
            <h3 id={`${titleId}-offers`} className="overline-text text-text-secondary">
              Available for you
            </h3>
            {offers.map((p) => (
              <Offer key={p.code} promo={p} method={method} onUse={() => void apply(p.code)} />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

function errorText(r: Extract<PromoCheck, { ok: false }>): ReactNode {
  switch (r.reason) {
    case 'notFound':
      return 'We couldn’t find this code. Check the spelling and try again.'
    case 'expired':
      return `This code expired on ${promoDate(r.promo!.validUntil)}.`
    case 'notStarted':
      return `This code starts on ${promoDate(r.promo!.validFrom)}.`
    case 'method':
      return `This code is for ${methodsText(r.promo!.methods).replace(' only', '')} only. Change the order type at checkout to use it.`
    case 'minOrder':
      return (
        <span className="inline-flex flex-wrap items-center gap-x-1">
          Add <Price amount={r.shortBy ?? 0} size="sm" tone="inherit" /> more to use this code.
        </span>
      )
    case 'requirement':
      return 'Add a burger and Original Fries to your cart to use this code.'
  }
}

function Offer({ promo, method, onUse }: { promo: Promo; method: OrderMethod | null; onUse: () => void }) {
  const stub = stubText(promo)
  const wrongMethod = method != null && !promo.methods.includes(method)
  const allMethods = promo.methods.length === 3
  return (
    <OfferCard
      value={stub.value}
      valueLabel={stub.label}
      code={promo.code}
      title={promo.title}
      conditions={
        <>
          {promo.minOrder > 0 && (
            <span className="inline-flex items-center gap-1">
              Min. order <Price amount={promo.minOrder} size="sm" tone="muted" />
            </span>
          )}
          {promo.maxDiscount != null && (
            <span className="inline-flex items-center gap-1">
              · up to <Price amount={promo.maxDiscount} size="sm" tone="muted" /> off
            </span>
          )}
          {!allMethods && !wrongMethod && <span>{methodsText(promo.methods)}</span>}
        </>
      }
      ends={`Ends ${promoDate(promo.validUntil)}${promo.oncePerCustomer ? ' · once per customer' : ''}`}
      unavailableNote={wrongMethod ? `Only for ${methodsText(promo.methods).replace(' only', '')}. Change the order type at checkout to use it.` : undefined}
      onUse={onUse}
    />
  )
}
