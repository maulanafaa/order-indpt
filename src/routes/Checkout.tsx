import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { CarSheet } from '../components/flows/checkout/CarSheet'
import { PaymentSheet } from '../components/flows/checkout/PaymentSheet'
import { PromoSheet } from '../components/flows/checkout/PromoSheet'
import { PromoRow, TotalsRows } from '../components/flows/checkout/PromoSummary'
import { OrderPlacedSplash, PaymentFailed } from '../components/flows/checkout/ResultScreens'
import { ScheduleSheet } from '../components/flows/checkout/ScheduleSheet'
import { ItemSheet } from '../components/flows/ItemSheet'
import { LoginSheet } from '../components/flows/LoginSheet'
import { useCartFlow } from '../components/flows/useCartFlow'
import { useItemParam } from '../components/flows/useItemParam'
import { useStoreCart } from '../components/flows/useStoreCart'
import { useOverlayRoot } from '../components/layout/overlay'
import {
  BottomSheet,
  Button,
  ChoiceCard,
  EmptyState,
  Icon,
  Input,
  ListRow,
  Notice,
  OrderTypeTile,
  Price,
  SectionCard,
  Select,
  Textarea,
  TopBar,
  type IconName,
  type SelectOption,
} from '../components/ui'
import type { Order, OrderMethod, Store, User } from '../data/schema'
import { formatMobile, useAuth } from '../lib/auth'
import { lineTotal, unitPrice, useCart } from '../lib/cart'
import {
  CASH,
  carTitle,
  defaultPayment,
  describePayment,
  methodTiles,
  resolveMethod,
  useCheckout,
  type TimeChoice,
} from '../lib/checkout'
import { availabilityFor, isCustomisable, itemById, methodLabels, modifierById, storeBySlug } from '../lib/data'
import { fakeRequest } from '../lib/fake'
import { distanceKm, formatDistance } from '../lib/geo'
import { openStatus } from '../lib/hours'
import { newOrderId, useOrders } from '../lib/orders'
import { useScenario, type CheckoutIssue, type PaymentResult } from '../lib/scenarios'
import { ASAP_MINUTES, asapMinutes, clockTime, dayLabel, slotDate, slotsFor } from '../lib/slots'
import { useOrderTotals } from '../lib/totals'
import { useNow } from '../lib/useNow'

const methodMeta: Record<OrderMethod, { icon: IconName; caption: string }> = {
  pickup: { icon: 'bag', caption: 'At the counter' },
  carhop: { icon: 'car', caption: 'To your car' },
  dineIn: { icon: 'cup', caption: 'At a table' },
}

type Placed = { order: Order; storeName: string; readyText: string }

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
      ? createPortal(<OrderPlacedSplash order={placed.order} storeName={placed.storeName} readyText={placed.readyText} onDone={openOrder} />, overlay)
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

  if (!user)
    return (
      <>
        <TopBar title="Checkout" onLeading={() => navigate(`/store/${store.slug}`)} />
        <LoginSheet open onClose={() => navigate(`/store/${store.slug}`, { state: { openCart: true } })} onSuccess={() => {}} />
      </>
    )

  return <CheckoutForm key={store.id} store={store} user={user} onPlaced={setPlaced} />
}

/* ------------------------------------------------------------------------ */

type Sheet = 'payment' | 'car' | 'schedule' | 'promo' | null

function CheckoutForm({ store, user, onPlaced }: { store: Store; user: User; onPlaced: (p: Placed) => void }) {
  const navigate = useNavigate()
  const scenario = useScenario()
  const now = useNow()
  const overlay = useOverlayRoot()
  const co = useCheckout()
  const setCo = co.set
  const updateUser = useAuth((s) => s.updateUser)
  const lines = useCart((s) => s.lines)
  const removeLine = useCart((s) => s.removeLine)
  const clearCart = useCart((s) => s.clear)
  const addOrder = useOrders((s) => s.add)
  const placedOrders = useOrders((s) => s.placed)
  const availability = useMemo(() => availabilityFor(store.id), [store.id])
  const totals = useOrderTotals(store, lines, availability.soldOutItems)
  const status = openStatus(store, now, scenario.storeClosed)

  // Edit in the order summary opens the cart sheet (and item sheet) over this page.
  const { item: sheetItem, lastItem, openItem, closeItem } = useItemParam()
  const storeCart = useStoreCart(store, openItem)
  const cartFlow = useCartFlow({
    store,
    closed: !status.open,
    soldOutItems: availability.soldOutItems,
    unavailableModifiers: availability.unavailableModifiers,
    openItem,
    closeItem,
    quickAdd: storeCart.quickAdd,
    isCustomisable: (it) => isCustomisable(it.id),
    onCheckout: () => {},
  })

  // Start (or keep) this store's checkout; pick the default payment once.
  useEffect(() => {
    co.startFor(store.slug)
    if (!useCheckout.getState().payment) setCo({ payment: defaultPayment(user) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.slug])

  const tiles = methodTiles(store.id)
  const method = resolveMethod(store.id, co.storeSlug === store.slug ? co.method : null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [tried, setTried] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [failed, setFailed] = useState<Exclude<PaymentResult, 'success'> | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [issue, setIssue] = useState<CheckoutIssue | null>(null)
  /** The checkout=... and payment=... flags apply to the first attempt; later attempts go through. */
  const attempts = useRef(0)
  const issueShown = useRef(false)

  const name = co.name ?? user.name
  const cars = user.cars
  const car = co.carId === 'car-once' ? co.oneOffCar : (cars.find((c) => c.id === co.carId) ?? cars.find((c) => c.isDefault) ?? cars[0] ?? null)
  const payment = describePayment(co.payment, user, co.oneOffCard)

  const asap = asapMinutes(store, now)
  const time: TimeChoice = co.time
  const timeMinutes = time.kind === 'later' ? time.minutes : asap
  const dineSlots = useMemo(() => slotsFor(store, 0, now), [store, now])
  const dineValue = co.dineIn === 'asap' || dineSlots.some((s) => s.minutes === co.dineIn && !s.full) ? co.dineIn : 'asap'
  const dineMinutes = dineValue === 'asap' ? asap : dineValue

  const errors = {
    name: !name.trim() ? 'Please enter your name' : null,
    car: method === 'carhop' && !car ? 'Add your car so staff can find you.' : null,
    payment: !payment ? 'Choose a payment method to place your order.' : null,
    time: !status.open && time.kind === 'asap' && method !== 'dineIn' ? 'The store is closed now. Schedule a time for later.' : null,
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
    const placedAt = new Date()
    const dayOffset = method !== 'dineIn' && time.kind === 'later' ? time.dayOffset : 0
    const minutes = method === 'dineIn' ? dineMinutes : timeMinutes
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
      promoCode: totals.promo?.ok ? totals.promo.promo.code : null,
      paymentMethodId: co.payment ?? CASH,
      paymentLabel: payment?.title,
      carId: method === 'carhop' ? (car?.id ?? null) : null,
      readyAt: slotDate(store, dayOffset, minutes, placedAt).toISOString(),
      scheduled: method === 'dineIn' ? dineValue !== 'asap' : time.kind === 'later',
      ...(co.note.trim() ? { note: co.note.trim() } : {}),
      refund: null,
      timeline: [{ status: 'placed', at: placedAt.toISOString() }],
    }
    addOrder(order)
    if (!user.name && name.trim()) updateUser({ name: name.trim() })
    onPlaced({ order, storeName: store.name, readyText: readyText() })
    clearCart()
    useCheckout.getState().reset()
  }

  /** One fake network call: store checks first (checkout=...), then the payment (payment=...). */
  const submit = async ({ skipIssue = false } = {}) => {
    setPlacing(true)
    await fakeRequest()
    setPlacing(false)
    const first = attempts.current === 0
    attempts.current += 1
    if (!skipIssue && !issueShown.current && scenario.checkoutIssue) {
      const relevant = scenario.checkoutIssue !== 'promo' || Boolean(co.promoCode)
      if (relevant) {
        issueShown.current = true
        setIssue(scenario.checkoutIssue)
        return
      }
    }
    const paysOnline = co.payment !== CASH
    const result: PaymentResult = first && paysOnline ? scenario.payment : 'success'
    if (result !== 'success') {
      setFailed(result)
      return
    }
    finish()
  }

  const place = () => {
    setTried(true)
    const firstError = (['name', 'time', 'car', 'payment'] as const).find((k) => errors[k])
    if (firstError) {
      document.getElementById(`field-${firstError}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    void submit()
  }

  const retry = async () => {
    setRetrying(true)
    await fakeRequest()
    setRetrying(false)
    setFailed(null)
    finish()
  }

  /* -------------------------------- sections ------------------------------- */
  const distance = formatDistance(distanceKm(scenario.near.point, store))
  const street = store.address.split(',')[0]?.trim() || store.address
  const onlyOne = tiles.length === 1
  const methodName = method ? methodLabels[method] : 'Order'

  const dineOptions: SelectOption[] = [
    { value: 'asap', label: `${clockTime(asap)} · As soon as possible`, caption: dayLabel(store, 0, now) },
    ...dineSlots.map((s) => ({
      value: String(s.minutes),
      label: s.full ? `${clockTime(s.minutes)} · Fully booked` : `${clockTime(s.minutes)} · in about ${s.minutes - (asap - ASAP_MINUTES)} min`,
      caption: dayLabel(store, 0, now),
      disabled: s.full,
    })),
  ]

  const issueSheet = issue && <IssueSheet issue={issue} store={store} onClose={() => setIssue(null)} ctx={{
    soldOut: () => {
      const l = totals.payable[totals.payable.length - 1]
      return l ? { name: itemById.get(l.itemId)?.name ?? 'An item', qty: l.quantity, id: l.id } : null
    },
    time: clockTime(method === 'dineIn' ? dineMinutes : timeMinutes),
    nextTime: () => {
      const day = method !== 'dineIn' && time.kind === 'later' ? time.dayOffset : 0
      const next = slotsFor(store, day, now).find((s) => !s.full && s.minutes > (method === 'dineIn' ? dineMinutes : timeMinutes))
      return next ? { day, minutes: next.minutes } : null
    },
    promoCode: co.promoCode,
  }} actions={{
    removeAndContinue: (id: string) => {
      removeLine(id)
      setIssue(null)
      void submit({ skipIssue: true })
    },
    backToCart: () => navigate(`/store/${store.slug}`, { state: { openCart: true } }),
    otherStore: () => navigate('/'),
    backToMenu: () => navigate(`/store/${store.slug}`),
    switchTime: (day: 0 | 1, minutes: number) => {
      if (method === 'dineIn') setCo({ dineIn: minutes })
      else setCo({ time: { kind: 'later', dayOffset: day, minutes } })
      setIssue(null)
      void submit({ skipIssue: true })
    },
    pickTime: () => {
      setIssue(null)
      if (method !== 'dineIn') setSheet('schedule')
      else document.getElementById('field-dinein')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    continueWithoutPromo: () => {
      setCo({ promoCode: null })
      setIssue(null)
      void submit({ skipIssue: true })
    },
    tryAnotherCode: () => {
      setCo({ promoCode: null })
      setIssue(null)
      setSheet('promo')
    },
  }} />

  return (
    <div className="flex min-h-full flex-col bg-surface-muted">
      <TopBar title="Checkout" onLeading={() => navigate(`/store/${store.slug}`, { state: { openCart: true } })} />

      <main className="flex flex-col gap-4 px-4 pt-4 pb-6">
        {!onlyOne && (
          <section aria-labelledby="method-title" className="flex flex-col gap-4">
            <h1 id="method-title" className="title-l text-text-primary">
              How would you like your order?
            </h1>
            <div role="radiogroup" aria-labelledby="method-title" className="flex gap-2">
              {tiles.map((t) => (
                <OrderTypeTile
                  key={t.method}
                  icon={methodMeta[t.method].icon}
                  label={methodLabels[t.method]}
                  caption={t.availableNow ? methodMeta[t.method].caption : 'Unavailable'}
                  selected={method === t.method}
                  disabled={!t.availableNow}
                  onSelect={() => setCo({ method: t.method })}
                />
              ))}
            </div>
          </section>
        )}

        {/* Store */}
        <section className="flex items-center gap-3 rounded-8 bg-surface-base p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted">
            <Icon name="store" size={20} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="label-l text-text-primary">
              {methodName} at {store.name}
            </p>
            <p className="truncate body-s text-text-secondary">{onlyOne ? `${methodName} only · ${distance} away` : `${street} · ${distance}`}</p>
          </div>
          <button type="button" className="cta-m text-text-primary underline" onClick={() => navigate('/')}>
            Change
          </button>
        </section>

        {!status.open && (
          <Notice tone="warning" icon="clock" title="This store is closed right now">
            Schedule your order for {status.opensAt ?? 'later'} or later.
          </Notice>
        )}

        {/* Carhop: car first */}
        {method === 'carhop' && (
          <SectionCard title="Your car" id="field-car">
            {car ? (
              <ListRow icon="car" title={carTitle(car)} subtitle={`Plate ${car.plate}`} onClick={() => setSheet('car')} />
            ) : (
              <ListRow
                icon="car"
                title="Add your car"
                subtitle="So staff can find you in the carhop bays"
                trailing="plus"
                placeholder
                error={show('car')}
                onClick={() => setSheet('car')}
              />
            )}
          </SectionCard>
        )}

        {/* Dine-in: arrival */}
        {method === 'dineIn' && (
          <SectionCard title="When will you arrive?" id="field-dinein">
            <Select
              options={dineOptions}
              value={String(dineValue)}
              onChange={(v) => setCo({ dineIn: v === 'asap' ? 'asap' : Number(v) })}
              leadingIcon="clock"
            />
            <Notice tone="neutral" icon="clock" size="compact">
              We’ll start preparing at {clockTime(Math.max(dineMinutes - 10, asap - ASAP_MINUTES))} so it’s hot when you sit down at{' '}
              {clockTime(dineMinutes)}. Show your order number at the counter.
            </Notice>
          </SectionCard>
        )}

        {/* Contact */}
        <SectionCard title="Contact">
          <Input
            id="field-name"
            label="Name"
            value={name}
            onChange={(v) => setCo({ name: v })}
            placeholder="Enter your name"
            autoComplete="name"
            error={show('name')}
          />
          <Input
            label="Mobile number"
            value={formatMobile(user.mobile)}
            onChange={() => {}}
            prefix="+966"
            readOnly
            helper="Verified · we’ll text you when it’s ready"
          />
        </SectionCard>

        {/* Pickup and carhop time */}
        {method !== 'dineIn' && (
          <SectionCard title={method === 'carhop' ? 'Arrival time' : 'Pickup time'} id="field-time">
            <div role="radiogroup" className="flex flex-col gap-2.5">
              <ChoiceCard
                title="As soon as possible"
                subtitle={status.open ? `Ready around ${clockTime(asap)}` : 'The store is closed now'}
                selected={time.kind === 'asap' && status.open}
                disabled={!status.open}
                onSelect={() => setCo({ time: { kind: 'asap' } })}
              />
              <ChoiceCard
                title="Schedule for later"
                subtitle={time.kind === 'later' ? `${dayLabel(store, time.dayOffset, now)}, ${clockTime(time.minutes)}` : 'Pick a day and time that suits you'}
                selected={time.kind === 'later'}
                chevron
                onSelect={() => setSheet('schedule')}
              />
            </div>
            {show('time') && (
              <p role="alert" className="flex items-start gap-1.5 caption text-state-error">
                <Icon name="alert" size={14} className="mt-px shrink-0" />
                {show('time')}
              </p>
            )}
          </SectionCard>
        )}

        <SectionCard title="Note for the store">
          <Textarea value={co.note} onChange={(v) => setCo({ note: v })} placeholder="e.g. sauces on the side" maxLength={140} aria-label="Note for the store" />
        </SectionCard>

        <SectionCard title="Payment method" id="field-payment">
          {payment ? (
            <ListRow icon={payment.icon} title={payment.title} subtitle={payment.subtitle} onClick={() => setSheet('payment')} />
          ) : (
            <ListRow
              icon="card"
              title="Choose a payment method"
              subtitle="Apple Pay, cash or debit/credit card"
              placeholder
              error={show('payment')}
              onClick={() => setSheet('payment')}
            />
          )}
        </SectionCard>

        <PromoRow totals={totals} onOpen={() => setSheet('promo')} />

        <SectionCard
          title="Order summary"
          action={
            <button type="button" className="cta-m text-text-primary underline" onClick={cartFlow.openCart}>
              Edit
            </button>
          }
          className="gap-2.5"
        >
          {totals.payable.map((l) => (
            <div key={l.id} className="flex items-start justify-between gap-3">
              <span className="body-m text-text-primary">
                {l.quantity}×&nbsp; {itemById.get(l.itemId)?.name}
              </span>
              <Price amount={lineTotal(l)} size="md" />
            </div>
          ))}
          <span aria-hidden className="h-px bg-border-default" />
          <TotalsRows totals={totals} />
          <p className="caption text-text-tertiary">Menu prices include 15% VAT. No service charge.</p>
        </SectionCard>
      </main>

      <div className="sticky bottom-0 z-20 mt-auto flex flex-col gap-2 bg-surface-base px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))] shadow-bar">
        <Button fullWidth spread price={totals.total} loading={placing} onClick={place}>
          {status.open || time.kind === 'later' ? 'Place order' : 'Schedule order'}
        </Button>
        <p className="text-center caption text-text-tertiary">Free cancellation until the store accepts your order.</p>
      </div>

      <PaymentSheet
        open={sheet === 'payment'}
        onClose={() => setSheet(null)}
        user={user}
        value={co.payment}
        oneOffCard={co.oneOffCard}
        onChoose={(choice, oneOff) => setCo({ payment: choice, ...(oneOff !== undefined ? { oneOffCard: oneOff } : {}) })}
      />
      <CarSheet
        open={sheet === 'car'}
        onClose={() => setSheet(null)}
        user={user}
        value={car?.id ?? null}
        onChoose={(carId, oneOff) => setCo({ carId, ...(oneOff !== undefined ? { oneOffCar: oneOff } : {}) })}
      />
      <ScheduleSheet
        open={sheet === 'schedule'}
        onClose={() => setSheet(null)}
        store={store}
        title={method === 'carhop' ? 'Arrival time' : 'Pickup time'}
        value={time.kind === 'later' ? time : null}
        onConfirm={(dayOffset, minutes) => setCo({ time: { kind: 'later', dayOffset, minutes } })}
      />
      <PromoSheet open={sheet === 'promo'} onClose={() => setSheet(null)} lines={totals.payable} subtotal={totals.subtotal} method={method} />
      {issueSheet}

      <ItemSheet
        item={lastItem}
        open={Boolean(sheetItem)}
        onClose={cartFlow.onItemClose}
        soldOut={lastItem ? availability.soldOutItems.has(lastItem.id) : false}
        unavailableModifiers={availability.unavailableModifiers}
        onAdd={(line, done) => cartFlow.onItemSave(line, done, storeCart.add)}
        editing={cartFlow.editing}
      />
      {cartFlow.sheets}

      {failed &&
        overlay &&
        createPortal(
          <PaymentFailed
            result={failed}
            retrying={retrying}
            onRetry={retry}
            onOtherMethod={() => {
              setFailed(null)
              setSheet('payment')
            }}
            onBack={() => setFailed(null)}
            onHelp={() => navigate('/help')}
          />,
          overlay,
        )}
    </div>
  )
}

/* ------------------------------------------------------------------------ */

type IssueCtx = {
  soldOut: () => { name: string; qty: number; id: string } | null
  time: string
  nextTime: () => { day: 0 | 1; minutes: number } | null
  promoCode: string | null
}
type IssueActions = {
  removeAndContinue: (lineId: string) => void
  backToCart: () => void
  otherStore: () => void
  backToMenu: () => void
  switchTime: (day: 0 | 1, minutes: number) => void
  pickTime: () => void
  continueWithoutPromo: () => void
  tryAnotherCode: () => void
}

/** Figma checkout sheets shown when the store says no on Place order (scenario checkout=...). */
function IssueSheet({ issue, store, ctx, actions, onClose }: { issue: CheckoutIssue; store: Store; ctx: IssueCtx; actions: IssueActions; onClose: () => void }) {
  // Snapshot the details when the sheet opens, so the copy does not change while it animates out.
  const [snap] = useState(() => ({ soldOut: ctx.soldOut(), next: ctx.nextTime(), time: ctx.time, promo: ctx.promoCode }))
  const content = (() => {
    switch (issue) {
      case 'soldout':
        return {
          title: 'Some items just sold out',
          body: `${snap.soldOut?.name ?? 'An item'}${snap.soldOut && snap.soldOut.qty > 1 ? ` (×${snap.soldOut.qty})` : ''} sold out while you were checking out. Remove it to continue, or go back and pick something else.`,
          primary: ['Remove and continue', () => snap.soldOut && actions.removeAndContinue(snap.soldOut.id)] as const,
          secondary: ['Back to cart', actions.backToCart] as const,
        }
      case 'paused':
        return {
          title: 'Store paused orders',
          body: `${store.name} just stopped taking online orders. You haven’t been charged. Try another store nearby and your cart comes with you.`,
          primary: ['Choose another store', actions.otherStore] as const,
          secondary: ['Back to menu', actions.backToMenu] as const,
        }
      case 'timefull':
        return {
          title: 'That time just filled up',
          body: snap.next
            ? `${snap.time} is no longer available at ${store.name}. The next available time is ${clockTime(snap.next.minutes)}.`
            : `${snap.time} is no longer available at ${store.name}. Pick another time.`,
          primary: snap.next
            ? ([`Switch to ${clockTime(snap.next.minutes)}`, () => actions.switchTime(snap.next!.day, snap.next!.minutes)] as const)
            : (['Pick another time', actions.pickTime] as const),
          secondary: snap.next ? (['Pick another time', actions.pickTime] as const) : null,
        }
      case 'promo':
        return {
          title: 'Promo code no longer valid',
          body: `${snap.promo ?? 'Your code'} expired before your order went through. We’ve removed it and updated your total.`,
          primary: ['Continue without promo', actions.continueWithoutPromo] as const,
          secondary: ['Try another code', actions.tryAnotherCode] as const,
        }
    }
  })()

  return (
    <BottomSheet open onClose={onClose} ariaLabel={content.title}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="title-l pe-10">{content.title}</h2>
          <p className="body-m text-text-secondary">{content.body}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button fullWidth onClick={content.primary[1]}>
            {content.primary[0]}
          </Button>
          {content.secondary && (
            <Button fullWidth variant="ghost" onClick={content.secondary[1]}>
              {content.secondary[0]}
            </Button>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
