import type { ReactNode } from 'react'
import { APPLE_PAY, CARD, type CheckoutPayment } from '../../../lib/checkout'
import { detectBrand, formatCardNumber, formatCvv, formatExpiry, type CardErrors, type CardFields } from '../../../lib/card'
import { cn } from '../../../lib/cn'
import { Collapse } from '../../ui/Collapse'
import { RadioMark } from '../../ui/Controls'
import { Icon } from '../../ui/Icon'
import { Input } from '../../ui/Input'
import { PaymentBrand } from '../../ui/PaymentBrand'
import { Price } from '../../ui/Price'

type PaymentOptionsProps = {
  /** Apple Pay is available on this device. Without it the card form shows inline. */
  applePay: boolean
  value: CheckoutPayment
  onChange: (value: CheckoutPayment) => void
  card: CardFields
  onCard: (patch: Partial<CardFields>) => void
  /** Shown only after Place order was tapped. */
  errors: CardErrors
}

/**
 * Figma "Payment options": Apple Pay (default when available) and Card,
 * which expands into the card form when chosen. Card only: the form, no radios.
 */
export function PaymentOptions({ applePay, value, onChange, card, onCard, errors }: PaymentOptionsProps) {
  if (!applePay) return <CardForm card={card} onCard={onCard} errors={errors} />

  return (
    <div role="radiogroup" aria-label="Payment method" className="flex flex-col gap-3">
      <Option
        selected={value === APPLE_PAY}
        onSelect={() => onChange(APPLE_PAY)}
        title="Apple Pay"
        brands={<PaymentBrand brand="applePay" />}
      />
      <Option
        selected={value === CARD}
        onSelect={() => onChange(CARD)}
        title="Card"
        brands={
          (
            <span
              aria-hidden={value === CARD}
              className={cn('flex items-center gap-1 transition-opacity duration-300 ease-card', value === CARD && 'opacity-0')}
            >
              <PaymentBrand brand="mada" />
              <PaymentBrand brand="visa" />
              <PaymentBrand brand="mastercard" />
            </span>
          )
        }
      >
        <CardForm card={card} onCard={onCard} errors={errors} />
      </Option>
    </div>
  )
}

function Option({
  selected,
  onSelect,
  title,
  brands,
  children,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  brands: ReactNode
  /** Shown under the header while selected. */
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-4 bg-surface-base p-3.5 transition-shadow duration-300 ease-card',
        selected ? 'inset-ring inset-ring-text-primary' : 'inset-ring inset-ring-border-default',
      )}
    >
      <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className="flex min-h-5 items-center gap-3 text-start">
        <RadioMark checked={selected} />
        <span className="min-w-0 flex-1 label-m text-text-primary">{title}</span>
        {brands}
      </button>
      {children && (
        <Collapse open={selected}>
          <div className="pt-4">{children}</div>
        </Collapse>
      )}
    </div>
  )
}

/** Figma "Card fields": number (with the detected brand), expiry, CVV, name, secure note. */
function CardForm({ card, onCard, errors }: { card: CardFields; onCard: (patch: Partial<CardFields>) => void; errors: CardErrors }) {
  const brand = detectBrand(card.number)
  return (
    <div className="flex flex-col gap-3">
      <Input
        id="field-card-number"
        label="Card number"
        value={card.number}
        onChange={(v) => onCard({ number: formatCardNumber(v) })}
        placeholder="Enter card number"
        inputMode="numeric"
        autoComplete="cc-number"
        error={errors.number}
        trailing={
          brand ? (
            <PaymentBrand brand={brand} height={16} />
          ) : (
            <span aria-hidden className="flex items-center gap-1.5 opacity-60 mix-blend-luminosity">
              <PaymentBrand brand="mada" height={16} />
              <PaymentBrand brand="visa" height={16} />
              <PaymentBrand brand="mastercard" height={16} />
            </span>
          )
        }
      />
      <div className="flex items-start gap-3">
        <Input
          id="field-card-expiry"
          label="Expiry"
          value={card.expiry}
          onChange={(v) => onCard({ expiry: formatExpiry(v) })}
          placeholder="MM/YY"
          inputMode="numeric"
          autoComplete="cc-exp"
          error={errors.expiry}
          className="min-w-0 flex-1"
        />
        <Input
          id="field-card-cvv"
          label="CVV"
          value={card.cvv}
          onChange={(v) => onCard({ cvv: formatCvv(v) })}
          placeholder="123"
          inputMode="numeric"
          autoComplete="cc-csc"
          type="password"
          error={errors.cvv}
          className="min-w-0 flex-1"
        />
      </div>
      <Input
        id="field-card-name"
        label="Name on card"
        value={card.name}
        onChange={(v) => onCard({ name: v })}
        placeholder="As shown on card"
        autoComplete="cc-name"
        error={errors.name}
      />
      <p className="flex items-center gap-1.5 caption text-text-tertiary">
        <Icon name="lock" size={14} className="shrink-0" />
        Payments are encrypted and processed securely
      </p>
    </div>
  )
}

/** Figma "Balance": wallet icon, INDPT balance, and the amount it covers in green. */
export function BalanceRow({ amount }: { amount: number }) {
  return (
    <div className="flex items-start gap-4 rounded-4 bg-surface-base p-3.5 inset-ring inset-ring-border-default">
      <Icon name="wallet" size={20} className="shrink-0 text-text-primary" />
      <span className="min-w-0 flex-1 label-m text-text-primary">INDPT balance</span>
      <Minus amount={amount} />
    </div>
  )
}

/** "− ⃁40.00" in the success colour. */
export function Minus({ amount }: { amount: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-state-success">
      <span aria-hidden className="label-m">
        −
      </span>
      <span className="sr-only">minus</span>
      <Price amount={amount} size="md" tone="inherit" />
    </span>
  )
}
