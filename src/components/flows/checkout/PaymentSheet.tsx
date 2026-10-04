import { useId, useState } from 'react'
import type { PaymentMethod, User } from '../../../data/schema'
import { useAuth } from '../../../lib/auth'
import { APPLE_PAY, CASH, describePayment, type OneOffCard, type PaymentChoice } from '../../../lib/checkout'
import { cn } from '../../../lib/cn'
import { fakeRequest } from '../../../lib/fake'
import { Badge } from '../../ui/Badge'
import { BottomSheet } from '../../ui/BottomSheet'
import { Button } from '../../ui/Button'
import { CheckboxRow } from '../../ui/CheckboxRow'
import { RadioMark } from '../../ui/Controls'
import { Icon, type IconName } from '../../ui/Icon'
import { Input } from '../../ui/Input'
import { SheetHeader } from '../../ui/SheetHeader'

type PaymentSheetProps = {
  open: boolean
  onClose: () => void
  user: User
  value: PaymentChoice | null
  oneOffCard: OneOffCard | null
  onChoose: (choice: PaymentChoice, oneOff?: OneOffCard | null) => void
}

/** Figma "Payment method" sheet: Apple Pay, Cash, saved cards, Add new card (replaces the content). */
export function PaymentSheet(props: PaymentSheetProps) {
  return (
    <BottomSheet open={props.open} onClose={props.onClose} bare ariaLabel="Payment method">
      {props.open && <PaymentBody {...props} />}
    </BottomSheet>
  )
}

function PaymentBody({ onClose, user, value, oneOffCard, onChoose }: PaymentSheetProps) {
  const cards = user.paymentMethods.filter((p) => p.brand !== 'applePay')
  const [view, setView] = useState<'list' | 'add'>('list')
  const [picked, setPicked] = useState<PaymentChoice | null>(value)
  const titleId = useId()

  if (view === 'add')
    return (
      <AddCard
        user={user}
        onBack={() => setView('list')}
        onClose={onClose}
        onSaved={(choice, oneOff) => {
          onChoose(choice, oneOff)
          onClose()
        }}
      />
    )

  const options: { id: string; icon: IconName; title: string; subtitle: string; isDefault?: boolean }[] = [
    { id: APPLE_PAY, icon: 'wallet', title: 'Apple Pay', subtitle: 'Pay with Face ID' },
    { id: CASH, icon: 'cash', title: 'Cash', subtitle: 'Pay at the counter when you collect' },
    ...cards.map((c) => {
      const d = describePayment(c.id, user, null)!
      return { id: c.id, icon: 'card' as IconName, title: d.title, subtitle: d.subtitle, isDefault: c.isDefault }
    }),
    ...(oneOffCard ? [{ id: 'card-once', icon: 'card' as IconName, ...pick(describePayment('card-once', user, oneOffCard)) }] : []),
  ]
  const chosen = describePayment(picked, user, oneOffCard)

  return (
    <div className="flex min-h-0 flex-col">
      <SheetHeader title="Payment method" titleId={titleId} onClose={onClose} />
      <p className="px-4 pt-1 body-s text-text-secondary">
        {cards.length ? 'Choose how to pay for this order.' : 'You don’t have a saved card yet. Pick how you’d like to pay.'}
      </p>
      <div className="min-h-0 overflow-y-auto px-4 pt-4" role="radiogroup" aria-labelledby={titleId}>
        <div className="flex flex-col gap-2.5">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={picked === o.id}
              onClick={() => setPicked(o.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-8 bg-surface-base p-3 text-start',
                picked === o.id ? 'inset-ring-[1.5px] inset-ring-border-strong' : 'inset-ring inset-ring-border-default',
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                <Icon name={o.icon} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2 label-l text-text-primary">
                  {o.title}
                  {o.isDefault && <Badge variant="solid">Default</Badge>}
                </span>
                <span className="body-s text-text-secondary">{o.subtitle}</span>
              </span>
              <RadioMark checked={picked === o.id} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setView('add')}
            className="flex w-full items-center gap-3 rounded-8 bg-surface-base p-3 text-start inset-ring inset-ring-border-default active:bg-surface-muted"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted">
              <Icon name="plus" size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="label-l text-text-primary">Add new card</span>
              <span className="body-s text-text-secondary">mada, Visa, Mastercard</span>
            </span>
            <Icon name="chev" size={20} />
          </button>
        </div>
      </div>
      <div className="px-4 pt-4 pb-[max(28px,env(safe-area-inset-bottom))]">
        <Button
          fullWidth
          disabled={!chosen}
          onClick={() => {
            if (!picked) return
            onChoose(picked)
            onClose()
          }}
        >
          {chosen ? `Use ${chosen.title === 'Cash' ? 'cash' : chosen.title}` : 'Choose a payment method'}
        </Button>
      </div>
    </div>
  )
}

const pick = (d: ReturnType<typeof describePayment>) => ({ title: d?.title ?? 'Card', subtitle: d?.subtitle ?? '' })

/* ------------------------------------------------------------------------ */

/** mada BINs (a few common ones) for the prototype; 4 = Visa, 5 = Mastercard. */
const MADA_PREFIXES = ['4847', '5888', '4406', '4462', '5297']

function brandOf(digits: string): PaymentMethod['brand'] | null {
  if (MADA_PREFIXES.some((p) => digits.startsWith(p))) return 'mada'
  if (digits.startsWith('4')) return 'visa'
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'mastercard'
  return null
}

const groupCard = (d: string) => d.replace(/(\d{4})(?=\d)/g, '$1 ')

function expiryError(v: string) {
  const m = /^(\d{2}) \/ (\d{2})$/.exec(v)
  if (!m) return 'Enter the expiry as MM / YY.'
  const month = Number(m[1])
  const year = 2000 + Number(m[2])
  if (month < 1 || month > 12) return 'Enter a month from 01 to 12.'
  const now = new Date()
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return 'This card has expired.'
  return null
}

function AddCard({
  user,
  onBack,
  onClose,
  onSaved,
}: {
  user: User
  onBack: () => void
  onClose: () => void
  onSaved: (choice: PaymentChoice, oneOff: OneOffCard | null) => void
}) {
  const updateUser = useAuth((s) => s.updateUser)
  const titleId = useId()
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [name, setName] = useState(user.name)
  const [save, setSave] = useState(true)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  const digits = number.replace(/\D/g, '')
  const brand = brandOf(digits)
  const errors = {
    number: digits.length !== 16 ? 'Enter the 16-digit card number.' : !brand ? 'We accept mada, Visa and Mastercard.' : null,
    expiry: expiryError(expiry),
    cvv: /^\d{3}$/.test(cvv) ? null : 'Enter the 3 digits on the back.',
    name: name.trim() ? null : 'Enter the name on the card.',
  }
  const show = (k: keyof typeof errors) => (touched[k] ? (errors[k] ?? undefined) : undefined)

  const submit = async () => {
    setTouched({ number: true, expiry: true, cvv: true, name: true })
    if (Object.values(errors).some(Boolean) || !brand) return
    setSaving(true)
    await fakeRequest()
    setSaving(false)
    const card = { brand, last4: digits.slice(-4), expiry: expiry.replace(' / ', '/') }
    if (save) {
      const id = `pm-${brand}-${card.last4}`
      updateUser((u) => ({
        paymentMethods: [
          ...u.paymentMethods.filter((p) => p.id !== id),
          { id, ...card, isDefault: !u.paymentMethods.some((p) => p.brand !== 'applePay' && p.id !== id) },
        ],
      }))
      onSaved(id, null)
    } else onSaved('card-once', { id: 'card-once', ...card })
  }

  return (
    <div className="flex min-h-0 flex-col">
      <SheetHeader title="Add new card" titleId={titleId} onClose={onClose} onBack={onBack} />
      <form
        className="flex min-h-0 flex-col"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pt-5">
          <Input
            label="Card number"
            value={groupCard(digits)}
            onChange={(v) => setNumber(v.replace(/\D/g, '').slice(0, 16))}
            onBlur={() => setTouched((t) => ({ ...t, number: true }))}
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            helper="mada, Visa and Mastercard are accepted"
            error={show('number')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Expiry"
              value={expiry}
              onChange={(v) => {
                const d = v.replace(/\D/g, '').slice(0, 4)
                setExpiry(d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d)
              }}
              onBlur={() => setTouched((t) => ({ ...t, expiry: true }))}
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM / YY"
              error={show('expiry')}
            />
            <Input
              label="Security code"
              value={cvv}
              onChange={(v) => setCvv(v.replace(/\D/g, '').slice(0, 3))}
              onBlur={() => setTouched((t) => ({ ...t, cvv: true }))}
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="3 digits"
              error={show('cvv')}
            />
          </div>
          <Input
            label="Name on card"
            value={name}
            onChange={setName}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            autoComplete="cc-name"
            error={show('name')}
          />
          <CheckboxRow checked={save} onChange={setSave} label="Save this card for next time" />
        </div>
        <div className="flex flex-col gap-2.5 px-4 pt-4 pb-[max(28px,env(safe-area-inset-bottom))]">
          <Button type="submit" fullWidth loading={saving}>
            Save and use this card
          </Button>
          <p className="flex items-center justify-center gap-1 caption text-text-tertiary">
            <Icon name="lock" size={12} />
            Payments are encrypted and processed securely
          </p>
        </div>
      </form>
    </div>
  )
}
