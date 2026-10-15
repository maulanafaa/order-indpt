import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { OrderSummary, PlaceOrderBar } from '../components/flows/checkout/OrderSummary'
import { BalanceRow, PaymentOptions } from '../components/flows/checkout/PaymentOptions'
import {
  CheckoutErrorSheet,
  OrderPlacedSplash,
  PaymentPending,
  StorePaused,
  type RecoverableError,
} from '../components/flows/checkout/ResultScreens'
import { TestSettingsSheet } from '../components/flows/checkout/TestSettingsSheet'
import { VerifyNumber } from '../components/flows/checkout/VerifyNumber'
import { useOverlayRoot } from '../components/layout/overlay'
import {
  Button,
  Collapse,
  EmptyState,
  IconButton,
  Input,
  Notice,
  OrderTypeTile,
  Select,
  Textarea,
  TopBar,
  type IconName,
  type SelectOption,
} from '../components/ui'
import type { Order, OrderMethod, Store, User } from '../data/schema'
import { useAuth } from '../lib/auth'
import { balanceUsed } from '../lib/balance'
import { branchState } from '../lib/branch'
import { round2, unitPrice, useCart } from '../lib/cart'
import { cardLabel, emptyCard, validateCard, type CardFields } from '../lib/card'
import { APPLE_PAY, CARD, carText, methodTiles, resolveMethod, resolvePayment, useCheckout, useMethodOverrides, type TimeChoice } from '../lib/checkout'
import { itemById, methodLabels, modifierById, storeBySlug } from '../lib/data'
import { fakeRequest } from '../lib/fake'
import { newOrderId, useOrders } from '../lib/orders'
import { useScenario, type CheckoutIssue, type PaymentResult } from '../lib/scenarios'
import { ASAP_MINUTES, asapMinutes, clockTime, slotDate, slotsFor } from '../lib/slots'
import { useOrderTotals } from '../lib/totals'
import { useNow } from '../lib/useNow'
import { cn } from '../lib/cn'
import { CurrencyScope } from '../components/ui/CurrencyScope'
import { useAvailability } from '../lib/testCart'

const methodIcon: Record<OrderMethod, IconName> = { pickup: 'bag', carhop: 'car', dineIn: 'cup' }

type Placed = { order: Order; storeName: string; country: string; readyText: string }

export default function CheckoutPage() {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const cartStore = useCart((s) => s.storeSlug)
  const lines = useCart((s) => s.lines)
  const store = cartStore ? storeBySlug.get(cartStore) : undefined
  const overlay = useOverlayRoot()
  // Kept here so the splash survives the cart being cleared.
  const [placed, setPlaced] = useState<Placed | null>(null)
  const openOrder = useCallback(() => placed && navigate(`/order/${placed.order.id}`, { replace: true }), [navigate, placed])

  if (placed)
    return overlay
      ? createPortal(
          <CurrencyScope country={placed.country}>
            <OrderPlacedSplash order={placed.order} storeName={placed.storeName} readyText={placed.readyText} onDone={openOrder} />
          </CurrencyScope>,
          overlay,
        )
      : null

  if (!store || lines.length === 0)
    return (
      <>
        <TopBar title="Checkout" />
        <EmptyState
          icon="bag"
          iconStyle="circle"
          title="Your cart is empty"
          className="pt-16"
          actions={<Button onClick={() => navigate('/')}>Find a store</Button>}
        >
          Add something from a store menu, then come back to check out.
        </EmptyState>
      </>
    )

  // Not signed in: the number is verified on this page (Figma 4.7).
  return (
    <CurrencyScope country={store.country}>
      <CheckoutForm key={store.id} store={store} user={user} onPlaced={setPlaced} />
    </CurrencyScope>
  )
}

/* ------------------------------------------------------------------------ */

/** What the checkout is showing after Place order: a recoverable sheet, or a blocking full screen. */
type ErrorKind = Exclude<PaymentResult, 'success' | 'pending'> | Exclude<CheckoutIssue, 'paused'>
type Blocked = 'pending' | 'paused'

/** Pickup and carhop time: "asap" or "day:minutes". */
const timeKey = (t: TimeChoice) => (t.kind === 'asap' ? 'asap' : `${t.dayOffset}:${t.minutes}`)
const parseTime = (v: string): TimeChoice => {
  if (v === 'asap') return { kind: 'asap' }
  const [d, m] = v.split(':').map(Number)
  return { kind: 'later', dayOffset: d === 1 ? 1 : 0, minutes: m }
}

function CheckoutForm({ store, user, onPlaced }: { store: Store; user: User | null; onPlaced: (p: Placed) => void }) {
  const navigate = useNavigate()
  const scenario = useScenario()
  const now = useNow()
  const overlay = useOverlayRoot()
  const co = useCheckout()
  const setCo = co.set
  const updateUser = useAuth((s) => s.updateUser)
  // Remember user=new from the URL: it may be gone by the time the code is entered.
  const [newUser, setNewUser] = useState(scenario.newUser)
  /** Prototype test settings (gear on the top bar). */
  const [testOpen, setTestOpen] = useState(false)
  /** Payment and the button unlock once the number is verified (signed in). */
  const verified = Boolean(user)
  const lines = useCart((s) => s.lines)
  const removeLine = useCart((s) => s.removeLine)
  const clearCart = useCart((s) => s.clear)
  const addOrder = useOrders((s) => s.add)
  const placedOrders = useOrders((s) => s.placed)
  // Branch data plus anything forced in the cart test settings.
  const availability = useAvailability(store.id)
  const totals = useOrderTotals(store, lines, availability.soldOutItems)
  // Open now, or (opening soon / closed, from a flag or a demo branch) schedule for tomorrow.
  const status = { open: branchState(store, now, scenario.store, scenario.demo).kind === 'open' }

  // Start (or keep) this store's checkout.
  useEffect(() => {
    co.startFor(store.slug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.slug])

  // Re-render when an order type is switched on or off in the test settings.
  useMethodOverrides((s) => s.modes)
  const tiles = methodTiles(store.id)
  const method = resolveMethod(store.id, co.storeSlug === store.slug ? co.method : null)
  const [tried, setTried] = useState(false)
  /** Kept here so the item list stays open when the order method changes. */
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const [blocked, setBlocked] = useState<Blocked | null>(null)
  /** The checkout=... and payment=... flags apply to the first attempt; later attempts go through. */
  const attempts = useRef(0)
  const issueShown = useRef(false)

  /* -------------------------------- choices ------------------------------- */
  const name = co.name ?? user?.name ?? ''
  const savedCar = user?.cars.find((c) => c.isDefault) ?? user?.cars[0] ?? null
  const car = co.carText ?? (savedCar ? carText(savedCar) : '')
  const payment = resolvePayment(co.payment, scenario.applePay)
  const [card, setCard] = useState<CardFields>(() => emptyCard(user?.name ?? ''))

  const balance = balanceUsed(scenario.balance, totals.total)
  const toPay = round2(Math.max(0, totals.total - balance))
  const paysOnline = toPay > 0

  // Pickup and carhop time: a dropdown of as soon as possible and today's / tomorrow's slots.
  // As soon as possible, rounded up to the next 5 minutes ("7:15 PM", not "7:09 PM").
  const nowMinutes = asapMinutes(store, now) - ASAP_MINUTES
  const asap = Math.ceil((nowMinutes + ASAP_MINUTES) / 5) * 5
  // Open: as soon as possible and the rest of today. Closed (schedule order): tomorrow only.
  const timeOptions = useMemo<SelectOption[]>(() => {
    const day = status.open ? 0 : 1
    const opts: SelectOption[] = status.open ? [{ value: 'asap', label: clockTime(asap) }] : []
    // Tomorrow: that day's own opening hours only (no after-midnight tail of tonight or tomorrow night).
    const slots = slotsFor(store, day, now)
    const firstOpen = day === 1 ? (slots.find((x) => x.minutes >= 6 * 60)?.minutes ?? 0) : 0
    for (const s of day === 1 ? slots.filter((x) => x.minutes >= firstOpen && x.minutes < 1440) : slots)
      opts.push({
        value: `${day}:${s.minutes}`,
        label: day === 1 ? `Tomorrow, ${clockTime(s.minutes)}` : clockTime(s.minutes),
        disabled: s.full,
        note: s.full ? 'Fully booked' : undefined,
      })
    return opts
  }, [store, now, status.open, asap])
  const storedTime = timeKey(co.time)
  const timeValue = timeOptions.some((o) => o.value === storedTime && !o.disabled)
    ? storedTime
    : (timeOptions.find((o) => !o.disabled)?.value ?? null)
  const time: TimeChoice = timeValue ? parseTime(timeValue) : { kind: 'asap' }
  const timeMinutes = time.kind === 'later' ? time.minutes : asap

  // Dine-in arrival (today only).
  const dineSlots = useMemo(() => slotsFor(store, 0, now), [store, now])
  const dineValue = co.dineIn === 'asap' || dineSlots.some((s) => s.minutes === co.dineIn && !s.full) ? co.dineIn : 'asap'
  const dineMinutes = dineValue === 'asap' ? asap : dineValue
  const dineOptions: SelectOption[] = [
    { value: 'asap', label: clockTime(asap) },
    ...dineSlots.map((s) => ({
      value: String(s.minutes),
      label: clockTime(s.minutes),
      disabled: s.full,
      note: s.full ? 'Fully booked' : undefined,
    })),
  ]

  /* ------------------------------- validation ------------------------------ */
  const cardErrors = paysOnline && payment === CARD ? validateCard(card, now) : {}
  const errors = {
    name: verified && method !== 'carhop' && !name.trim() ? 'Please enter your name' : null,
    car: method === 'carhop' && !car.trim() ? 'Add your car details so staff can find you.' : null,
    time: method !== 'dineIn' && !timeValue ? 'No times left. Try another store.' : null,
  }
  const show = (k: keyof typeof errors) => (tried ? (errors[k] ?? undefined) : undefined)

  /* ------------------------------ place order ------------------------------ */
  const readyText = () => {
    const t = clockTime(method === 'dineIn' ? dineMinutes : timeMinutes)
    const day = method !== 'dineIn' && time.kind === 'later' && time.dayOffset === 1 ? 'tomorrow ' : ''
    if (method === 'carhop') return `We’ll bring it to your car around ${day}${t}.`
    if (method === 'dineIn') return `It’ll be ready when you sit down at ${t}.`
    return `It’ll be ready around ${day}${t}.`
  }

  const finish = () => {
    if (!user) return
    const placedAt = new Date()
    const dayOffset = method !== 'dineIn' && time.kind === 'later' ? time.dayOffset : 0
    const minutes = method === 'dineIn' ? dineMinutes : timeMinutes
    const payLabel = payment === APPLE_PAY ? 'Apple Pay' : cardLabel(card)
    const order: Order = {
      id: newOrderId(placedOrders),
      userId: user.id,
      storeId: store.id,
      method: method ?? 'pickup',
      status: 'placed',
      placedAt: placedAt.toISOString(),
      completedAt: null,
      items: totals.payable.map((l) => ({
        itemId: l.itemId,
        name: itemById.get(l.itemId)?.name ?? '',
        quantity: l.quantity,
        unitPrice: unitPrice(l),
        modifiers: l.modifiers.map((m) => ({
          modifierId: m.modifierId,
          name: modifierById.get(m.modifierId)?.name ?? '',
          quantity: m.quantity,
          price: modifierById.get(m.modifierId)?.price ?? 0,
        })),
        ...(l.note ? { note: l.note } : {}),
      })),
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      promoCode: null,
      paymentMethodId: !paysOnline ? 'balance' : payment === APPLE_PAY ? APPLE_PAY : 'card-once',
      paymentLabel: !paysOnline ? 'INDPT balance' : balance > 0 ? `INDPT balance + ${payLabel}` : payLabel,
      ...(balance > 0 ? { balanceUsed: balance } : {}),
      carId: method === 'carhop' && savedCar && car === carText(savedCar) ? savedCar.id : null,
      ...(method === 'carhop' ? { carDetails: car.trim() } : {}),
      readyAt: slotDate(store, dayOffset, minutes, placedAt).toISOString(),
      scheduled: method === 'dineIn' ? dineValue !== 'asap' : time.kind === 'later',
      ...(co.note.trim() ? { note: co.note.trim() } : {}),
      refund: null,
      timeline: [{ status: 'placed', at: placedAt.toISOString() }],
    }
    addOrder(order)
    if (!user.name && name.trim()) updateUser({ name: name.trim() })
    // First carhop order: keep the car for next time.
    if (method === 'carhop' && user.cars.length === 0 && car.trim())
      updateUser({ cars: [{ id: `car-${Date.now()}`, make: car.trim(), model: '', colour: '', plate: '', isDefault: true }] })
    onPlaced({ order, storeName: store.name, country: store.country, readyText: readyText() })
    clearCart()
    useCheckout.getState().reset()
  }

  const showError = (kind: ErrorKind) => {
    setErrorKind(kind)
    setErrorOpen(true)
  }
  const closeError = () => setErrorOpen(false)

  /** One fake network call: store checks first (checkout=...), then the payment (payment=...). */
  const submit = async ({ skipIssue = false } = {}) => {
    setPlacing(true)
    await fakeRequest()
    setPlacing(false)
    const first = attempts.current === 0
    attempts.current += 1
    if (!skipIssue && !issueShown.current && scenario.checkoutIssue) {
      issueShown.current = true
      if (scenario.checkoutIssue === 'paused') setBlocked('paused')
      else showError(scenario.checkoutIssue)
      return
    }
    const result: PaymentResult = first && paysOnline ? scenario.payment : 'success'
    if (result === 'success') finish()
    else if (result === 'pending') setBlocked('pending')
    else showError(result)
  }

  const place = () => {
    if (!verified) return
    setTried(true)
    const firstError =
      (['name', 'car', 'time'] as const).find((k) => errors[k]) ??
      (cardErrors.number ? 'card-number' : cardErrors.expiry ? 'card-expiry' : cardErrors.cvv ? 'card-cvv' : cardErrors.name ? 'card-name' : null)
    if (firstError) {
      document.getElementById(`field-${firstError}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    void submit()
  }

  /** Try again from a sheet or the pending screen: one more fake call, then it goes through. */
  const retry = async () => {
    setRetrying(true)
    await fakeRequest()
    setRetrying(false)
    setErrorOpen(false)
    setBlocked(null)
    finish()
  }

  /** Use another payment method: switch to the other option and bring the payment section into view. */
  const otherMethod = () => {
    setErrorOpen(false)
    if (scenario.applePay) setCo({ payment: payment === APPLE_PAY ? CARD : APPLE_PAY })
    window.setTimeout(() => document.getElementById('field-payment')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250)
  }

  const nextTime = () => {
    const day = method !== 'dineIn' && time.kind === 'later' ? time.dayOffset : 0
    const current = method === 'dineIn' ? dineMinutes : timeMinutes
    const next = slotsFor(store, day, now).find((s) => !s.full && s.minutes > current)
    return next ? { day, minutes: next.minutes } : null
  }

  const errorContent = (kind: ErrorKind | null): RecoverableError | null => {
    const retryAction = { label: 'Try again', onClick: () => void retry(), loading: retrying }
    const otherAction = { label: 'Use another payment method', onClick: otherMethod }
    switch (kind) {
      case null:
        return null
      case 'declined':
        return {
          title: 'Card declined',
          body: 'Your bank declined this card, so you haven’t been charged. Try again or use another payment method.',
          primary: retryAction,
          secondary: otherAction,
        }
      case 'insufficient':
        return {
          title: 'Not enough balance',
          body: 'Your bank says this card doesn’t have enough balance for this order. You haven’t been charged.',
          primary: otherAction,
          secondary: retryAction,
        }
      case 'gateway':
        return {
          title: 'Card payments are down',
          body: 'We can’t reach our payment provider right now. You haven’t been charged. Try again in a few minutes or pay with Apple Pay.',
          primary: retryAction,
          secondary: otherAction,
        }
      case 'offline':
        return { title: 'You’re offline', body: 'Check your internet connection and try again. Your order hasn’t been placed yet.', primary: retryAction }
      case 'error':
        return {
          title: 'Something went wrong',
          body: 'We couldn’t place your order and you haven’t been charged. Please try again in a moment.',
          primary: retryAction,
          secondary: { label: 'Get help', onClick: () => navigate('/help') },
        }
      case 'soldout': {
        const l = totals.payable[totals.payable.length - 1]
        const itemName = l ? (itemById.get(l.itemId)?.name ?? 'An item') : 'An item'
        return {
          title: 'Some items just sold out',
          body: `${itemName}${l && l.quantity > 1 ? ` (×${l.quantity})` : ''} sold out while you were checking out. Remove it to continue, or go back and pick something else.`,
          primary: {
            label: 'Remove and continue',
            onClick: () => {
              if (l) removeLine(l.id)
              setErrorOpen(false)
              void submit({ skipIssue: true })
            },
          },
          secondary: { label: 'Back to cart', onClick: () => navigate(`/store/${store.slug}`, { state: { openCart: true } }) },
        }
      }
      case 'timefull': {
        const current = clockTime(method === 'dineIn' ? dineMinutes : timeMinutes)
        const next = nextTime()
        const pick = {
          label: 'Pick another time',
          onClick: () => {
            setErrorOpen(false)
            window.setTimeout(() => document.getElementById('field-time')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250)
          },
        }
        return {
          title: 'That time just filled up',
          body: next
            ? `${current} is no longer available at ${store.name}. The next available time is ${clockTime(next.minutes)}.`
            : `${current} is no longer available at ${store.name}. Pick another time.`,
          primary: next
            ? {
                label: `Switch to ${clockTime(next.minutes)}`,
                onClick: () => {
                  if (method === 'dineIn') setCo({ dineIn: next.minutes })
                  else setCo({ time: { kind: 'later', dayOffset: next.day, minutes: next.minutes } })
                  setErrorOpen(false)
                  void submit({ skipIssue: true })
                },
              }
            : pick,
          secondary: next ? pick : undefined,
        }
      }
    }
  }

  /* -------------------------------- sections ------------------------------- */
  // Figma 851:34305: one order type to choose from (the rest unsupported, hidden or paused) shows a note instead of tiles.
  const available = tiles.filter((t) => t.availableNow)
  const onlyOne = available.length === 1 ? available[0] : null
  const timeSection = (
    <Section title="Pickup time" id="field-time" gap="gap-2.5" className="relative z-20">
      <Select
        options={timeOptions}
        value={timeValue}
        onChange={(v) => setCo({ time: parseTime(v) })}
        leadingIcon="clock"
        placeholder="No times available"
        error={show('time')}
      />
    </Section>
  )
  // Figma 4.7: the number first; the name field appears once it is verified (filled in for a returning customer).
  const verify = (
    // Above the sections after it, so the country list opens over them.
    <Section title="Verify your number" id="field-verify" className="relative z-10">
      <VerifyNumber verifiedMobile={user?.mobile ?? null} newUser={newUser} />
      {/* Pulled up by the section gap while closed, so the hidden name field takes no space. */}
      <Collapse open={verified} className="-mx-0.5 -mt-3">
        <div className="p-0.5 pt-3.5">
          <Input
            id="field-name"
            value={name}
            onChange={(v) => setCo({ name: v })}
            placeholder="Enter your name"
            aria-label="Your name"
            autoComplete="name"
            error={show('name')}
          />
        </div>
      </Collapse>
    </Section>
  )

  return (
    <div className="flex min-h-full flex-col bg-surface-base">
      <TopBar
        title="Checkout"
        subtitle={store.name}
        onLeading={() => navigate(`/store/${store.slug}`)}
        trailing={<IconButton icon="settings" label="Test settings" onClick={() => setTestOpen(true)} />}
      />

      <main className="flex flex-col gap-6 p-4">
        {onlyOne ? (
          <Notice icon={methodIcon[onlyOne.method]}>
            This branch only offers {methodLabels[onlyOne.method].toLowerCase()} order right now.
          </Notice>
        ) : (
          <section aria-labelledby="method-title" className="flex flex-col gap-4">
            <h1 id="method-title" className="title-l text-text-primary">
              How would you like your order?
            </h1>
            <div role="radiogroup" aria-labelledby="method-title" className="flex gap-2">
              {tiles.map((t) => (
                <OrderTypeTile
                  key={t.method}
                  icon={methodIcon[t.method]}
                  label={methodLabels[t.method]}
                  selected={method === t.method}
                  disabled={!t.availableNow}
                  onSelect={() => setCo({ method: t.method })}
                />
              ))}
            </div>
          </section>
        )}

        {!status.open && (
          <Notice tone="warning" icon="clock" title="This store is closed right now">
            Schedule your order for tomorrow.
          </Notice>
        )}

        {/* Keyed by method: switching remounts every section below so they fade up in turn. */}
        <div
          key={method ?? 'none'}
          className="flex flex-col gap-8 *:animate-content-in *:motion-reduce:animate-none [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms] [&>*:nth-child(4)]:[animation-delay:180ms] [&>*:nth-child(5)]:[animation-delay:240ms]"
        >
          {method === 'carhop' && (
            <Section title="Your car" id="field-car" gap="gap-2.5">
              <Textarea
                value={car}
                onChange={(v) => setCo({ carText: v })}
                placeholder="e.g. White Toyota Land Cruiser, plate RKD 4821"
                aria-label="Your car"
                maxLength={80}
                error={show('car')}
                helper={
                  co.carText === null && savedCar
                    ? 'Saved from your last carhop order'
                    : !user || user.cars.length === 0
                      ? 'We’ll save this for your next carhop order.'
                      : undefined
                }
              />
            </Section>
          )}

          {method === 'dineIn' ? (
            <Section title="When will you arrive?" id="field-time" gap="gap-2.5" className="relative z-20">
              <Select
                options={dineOptions}
                value={String(dineValue)}
                onChange={(v) => setCo({ dineIn: v === 'asap' ? 'asap' : Number(v) })}
                leadingIcon="clock"
              />
            </Section>
          ) : (
            timeSection
          )}

          {verify}

          {/* Unlocks once the number is verified. */}
          <Section title={balance > 0 ? 'Payment' : 'Payment method'} id="field-payment">
            <div inert={!verified} className={cn('flex flex-col gap-3 transition-opacity duration-300 ease-card', !verified && 'opacity-40')}>
              {balance > 0 && <BalanceRow amount={balance} />}
              {paysOnline && (
                <>
                  {balance > 0 && <p className="body-s text-text-secondary">Pay the rest with</p>}
                  <PaymentOptions
                    applePay={scenario.applePay}
                    value={payment}
                    onChange={(v) => setCo({ payment: v })}
                    card={card}
                    onCard={(patch) => setCard((c) => ({ ...c, ...patch }))}
                    errors={tried ? cardErrors : {}}
                  />
                </>
              )}
            </div>
          </Section>

          <OrderSummary
            lines={totals.payable}
            count={totals.count}
            subtotal={totals.subtotal}
            vat={totals.vat}
            total={totals.total}
            note={co.note}
            balance={balance}
            open={summaryOpen}
            onToggle={() => setSummaryOpen((o) => !o)}
          />
        </div>
      </main>

      <PlaceOrderBar applePay={paysOnline && payment === APPLE_PAY} label="Place order" disabled={!verified} loading={placing} onPlace={place} />

      <TestSettingsSheet
        storeId={store.id}
        open={testOpen}
        onClose={() => setTestOpen(false)}
        newUser={newUser}
        onNewUser={setNewUser}
        onResultChange={() => {
          attempts.current = 0
          issueShown.current = false
        }}
      />

      <CheckoutErrorSheet error={errorContent(errorKind)} open={errorOpen} onClose={closeError} />

      {blocked &&
        overlay &&
        createPortal(
          blocked === 'pending' ? (
            <PaymentPending checking={retrying} onCheck={() => void retry()} onBack={() => setBlocked(null)} onHelp={() => navigate('/help')} />
          ) : (
            <StorePaused
              storeName={store.name}
              onOtherStore={() => navigate('/')}
              onMenu={() => navigate(`/store/${store.slug}`)}
              onHelp={() => navigate('/help')}
            />
          ),
          overlay,
        )}
    </div>
  )
}

/** A checkout section from Figma 4.7: Title/L heading over its fields, no card. */
function Section({ title, id, gap = 'gap-3', className, children }: { title: string; id?: string; gap?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn('flex scroll-mt-20 flex-col', gap, className)}>
      <h2 className="title-l text-text-primary">{title}</h2>
      {children}
    </section>
  )
}
