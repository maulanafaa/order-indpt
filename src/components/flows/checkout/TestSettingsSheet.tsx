import { useState } from 'react'
import { formatMobile, useAuth } from '../../../lib/auth'
import { useCheckout, useMethodOverrides } from '../../../lib/checkout'
import { methodLabels, supportedServices } from '../../../lib/data'
import { cn } from '../../../lib/cn'
import { BottomSheet } from '../../ui/BottomSheet'
import { Button } from '../../ui/Button'
import { CheckboxRow } from '../../ui/CheckboxRow'
import { Chip } from '../../ui/Chip'
import { Tabs } from '../../ui/Tabs'
import { useToast } from '../../ui/toastContext'
import { useSearchParams } from 'react-router'
import { FILL_EVENT } from './VerifyNumber'

const TABS = [
  { id: 'orderType', label: 'Order type' },
  { id: 'number', label: 'Number' },
  { id: 'checkout', label: 'Checkout issues' },
  { id: 'payment', label: 'Payment' },
] as const
type TabId = (typeof TABS)[number]['id']

/** Place order outcomes, set as the checkout= and payment= URL flags (lib/scenarios.ts). */
const RESULT_GROUPS = [
  { title: 'Goes through', options: [{ key: 'success', label: 'Order placed' }] },
  {
    title: 'Checkout issues',
    options: [
      { key: 'checkout:soldout', label: 'Item sold out' },
      { key: 'checkout:timefull', label: 'Time filled up' },
      { key: 'checkout:paused', label: 'Store paused' },
    ],
  },
  {
    title: 'Payment results',
    options: [
      { key: 'success', label: 'Paid' },
      { key: 'payment:declined', label: 'Card declined' },
      { key: 'payment:insufficient', label: 'Not enough balance' },
      { key: 'payment:gateway', label: 'Payments down' },
      { key: 'payment:offline', label: 'Offline' },
      { key: 'payment:error', label: 'Something went wrong' },
      { key: 'payment:pending', label: 'Payment pending' },
    ],
  },
]

/** Numbers that walk through the Verify your number states (lib/otp.ts). */
const NUMBERS = [
  { digits: '551234567', label: 'Gets a code', detail: 'Then any 6 digits, e.g. 123456' },
  { digits: '5512345', label: 'Invalid number', detail: 'Shows the error under the field' },
  { digits: '500000000', label: 'Code can’t be sent', detail: 'Connection problem' },
  { digits: '599999999', label: 'Too many code requests', detail: '10 minute wait' },
]

const CODES = [
  { code: '123456', label: 'Any 6 digits verify' },
  { code: '000000', label: 'Incorrect (3 tries, then paused 15 minutes)' },
  { code: '111111', label: 'Expired (send a new code)' },
]

/**
 * Prototype only (not in Figma): the gear on the checkout top bar. Log out to try the
 * number check again, fill a test number, and see the test codes.
 */
export function TestSettingsSheet({
  storeId,
  open,
  onClose,
  newUser,
  onNewUser,
  onResultChange,
}: {
  storeId: string
  open: boolean
  onClose: () => void
  newUser: boolean
  onNewUser: (v: boolean) => void
  /** A new place order result was picked: the next attempt should use it. */
  onResultChange: () => void
}) {
  const toast = useToast()
  const [tab, setTab] = useState<TabId>('orderType')
  const [params, setParams] = useSearchParams()
  const setParam = (key: string, value: string | null) =>
    setParams(
      (p) => {
        if (value === null) p.delete(key)
        else p.set(key, value)
        return p
      },
      { replace: true },
    )
  const result = params.get('checkout') ? `checkout:${params.get('checkout')}` : params.get('payment') && params.get('payment') !== 'success' ? `payment:${params.get('payment')}` : 'success'
  const setResult = (key: string) => {
    setParams(
      (p) => {
        p.delete('checkout')
        p.delete('payment')
        const [kind, value] = key.split(':')
        if (value) p.set(kind, value)
        return p
      },
      { replace: true },
    )
    onResultChange()
  }
  const applePay = params.get('applepay') === 'off' ? 'off' : 'on'
  const balance = params.get('balance') === 'partial' || params.get('balance') === 'full' ? (params.get('balance') as 'partial' | 'full') : 'none'
  const user = useAuth((s) => s.user)
  const signOut = useAuth((s) => s.signOut)
  const modes = useMethodOverrides((s) => s.modes)
  const setMode = useMethodOverrides((s) => s.setMode)
  // Order types this branch offers; ones paused in the data can't be switched on here.
  const services = supportedServices(storeId)
  const onCount = services.filter((s) => s.availableNow && (modes[s.method] ?? 'on') === 'on').length

  const logOut = () => {
    signOut()
    // The name typed at checkout belonged to that login.
    useCheckout.getState().set({ name: null })
    toast.show({ type: 'success', message: 'Logged out' })
  }

  const fill = (digits: string) => {
    onClose()
    // After the sheet has gone, as if the number was typed and the field left.
    window.setTimeout(() => window.dispatchEvent(new CustomEvent(FILL_EVENT, { detail: digits })), 380)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Test settings">
      <div className="flex flex-col gap-6">
        <Tabs items={[...TABS]} value={tab} onChange={(id) => setTab(id as TabId)} label="Test settings" fill className="-mx-4 -mt-2 border-b border-border-default" />
        {/* Same height for every tab, so the sheet does not jump when switching. */}
        <div className="flex min-h-[460px] flex-col gap-6">
        {tab === 'orderType' && (
          <>
            <section className="flex flex-col gap-3">
              <h3 className="title-s text-text-primary">Order types at this branch</h3>
              <ul className="flex flex-col gap-2">
                {(['carhop', 'pickup', 'dineIn'] as const).map((m) => {
                  const service = services.find((x) => x.method === m)
                  if (!service) return null
                  const mode = modes[m] ?? 'on'
                  // Keep at least one order type on.
                  const lastOn = service.availableNow && mode === 'on' && onCount === 1
                  return (
                    <li key={m} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 label-m text-text-primary">{methodLabels[m]}</span>
                      <div role="radiogroup" aria-label={`${methodLabels[m]} order type`} className="flex gap-1.5">
                        {(['on', 'disabled', 'hidden'] as const).map((opt) => (
                          <Chip
                            key={opt}
                            role="radio"
                            aria-checked={mode === opt}
                            selected={mode === opt}
                            disabled={(opt !== 'on' && lastOn) || (opt === 'on' && !service.availableNow)}
                            onClick={() => setMode(m, opt)}
                            className="h-8 px-2.5"
                          >
                            {opt === 'on' ? 'On' : opt === 'disabled' ? 'Disabled' : 'Hidden'}
                          </Chip>
                        ))}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {services.some((x) => !x.availableNow) && <p className="body-s text-text-secondary">Greyed out: paused at this branch.</p>}
            </section>
          </>
        )}
        {tab === 'number' && (
          <>
            <section className="flex flex-col gap-3">
              <h3 className="title-s text-text-primary">Account</h3>
              {user ? (
                <>
                  <p className="body-m text-text-secondary">
                    Verified as <span className="label-m text-text-primary">+966 {formatMobile(user.mobile)}</span>
                    {user.name ? ` (${user.name})` : ''}.
                  </p>
                  <Button variant="secondary" fullWidth leadingIcon="logout" onClick={logOut}>
                    Log out
                  </Button>
                </>
              ) : (
                <p className="body-m text-text-secondary">Not verified yet. Pick a number below to try the flow.</p>
              )}
              <CheckboxRow checked={newUser} onChange={onNewUser} label="Verify as a new customer (no name or car saved)" />
            </section>
            <section className="flex flex-col gap-3">
              <h3 className="title-s text-text-primary">Phone numbers</h3>
              {user && <p className="body-s text-text-secondary">Log out first to try these.</p>}
              <ul className="flex flex-col">
                {NUMBERS.map((n) => (
                  <li key={n.digits} className="border-b border-border-default last:border-b-0">
                    <button
                      type="button"
                      disabled={Boolean(user)}
                      onClick={() => fill(n.digits)}
                      className={cn('flex w-full items-center gap-3 py-3 text-start disabled:opacity-40', !user && 'active:bg-surface-muted')}
                    >
                      <span className="w-28 shrink-0 label-m text-text-primary">{formatMobile(n.digits)}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="label-m text-text-primary">{n.label}</span>
                        <span className="body-s text-text-secondary">{n.detail}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <section className="flex flex-col gap-3">
              <h3 className="title-s text-text-primary">Codes</h3>
              <ul className="flex flex-col gap-2">
                {CODES.map((c) => (
                  <li key={c.code} className="flex items-baseline gap-3">
                    <span className="w-28 shrink-0 label-m tracking-wider text-text-primary">{c.code}</span>
                    <span className="body-s text-text-secondary">{c.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
        {tab === 'checkout' && (
          <>
            <section className="flex flex-col gap-3">
              <h3 className="title-s text-text-primary">When you place the order</h3>
              {RESULT_GROUPS.slice(0, 2).map((g) => (
                <div key={g.title} className="flex flex-col gap-2">
                  <p className="caption text-text-secondary">{g.title}</p>
                  <div role="radiogroup" aria-label={g.title} className="flex flex-wrap gap-2">
                    {g.options.map((o) => (
                      <Chip
                        key={o.key}
                        role="radio"
                        aria-checked={result === o.key}
                        selected={result === o.key}
                        onClick={() => setResult(o.key)}
                        className="h-8 px-2.5"
                      >
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
              <p className="body-s text-text-secondary">
                Applies to the next Place order; trying again then goes through.
              </p>
            </section>
          </>
        )}
        {tab === 'payment' && (
          <>
            <section className="flex flex-col gap-3">
              <h3 className="title-s text-text-primary">Payment result</h3>
              {RESULT_GROUPS.slice(2).map((g) => (
                <div key={g.title} className="flex flex-col gap-2">
                  
                  <div role="radiogroup" aria-label={g.title} className="flex flex-wrap gap-2">
                    {g.options.map((o) => (
                      <Chip
                        key={o.key}
                        role="radio"
                        aria-checked={result === o.key}
                        selected={result === o.key}
                        onClick={() => setResult(o.key)}
                        className="h-8 px-2.5"
                      >
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
              <p className="body-s text-text-secondary">
                Applies to the next Place order; trying again then goes through. Needs something left to pay by card or Apple Pay.
              </p>
            </section>
            <section className="flex flex-col gap-3">
              <h3 className="title-s text-text-primary">Payment options</h3>
              <div className="flex flex-col gap-2">
                <p className="caption text-text-secondary">Apple Pay</p>
                <div role="radiogroup" aria-label="Apple Pay" className="flex gap-2">
                  {(['on', 'off'] as const).map((v) => (
                    <Chip
                      key={v}
                      role="radio"
                      aria-checked={applePay === v}
                      selected={applePay === v}
                      onClick={() => setParam('applepay', v === 'off' ? 'off' : null)}
                      className="h-8 px-2.5"
                    >
                      {v === 'on' ? 'Offered' : 'Not available (card only)'}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="caption text-text-secondary">INDPT balance</p>
                <div role="radiogroup" aria-label="INDPT balance" className="flex gap-2">
                  {(['none', 'partial', 'full'] as const).map((v) => (
                    <Chip
                      key={v}
                      role="radio"
                      aria-checked={balance === v}
                      selected={balance === v}
                      onClick={() => setParam('balance', v === 'none' ? null : v)}
                      className="h-8 px-2.5"
                    >
                      {v === 'none' ? 'None' : v === 'partial' ? 'Covers part' : 'Covers all'}
                    </Chip>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
        </div>
      </div>
    </BottomSheet>
  )
}
