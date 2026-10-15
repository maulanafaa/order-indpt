import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { CarhopInfo, ItemsSection, OrderInfo, PaymentSection, StaffNotice, StatusHero, Timeline } from '../components/flows/order/OrderParts'
import { BottomSheet, Button, EmptyState, IconButton, Textarea, TopBar, useToast } from '../components/ui'
import type { Order, Store } from '../data/schema'
import { useAuth } from '../lib/auth'
import { carText } from '../lib/checkout'
import { methodLabels, storeById } from '../lib/data'
import { fakeRequest } from '../lib/fake'
import { directionsUrl } from '../lib/geo'
import { heroFor, orderTypeText, stageOf, stepsFor, useOrder } from '../lib/orderDetail'
import { moveTo, useOrderUpdates } from '../lib/orderUpdates'
import { callNumber, callSupport } from '../lib/support'
import { CurrencyScope } from '../components/ui/CurrencyScope'

type Sheet = 'status' | SpotMode | null
/** Figma 830:665 I'm here, 834:137 change spot, 729:44014 edit car. */
type SpotMode = 'arrive' | 'spot' | 'car'

/** Figma 6.1 to 6.5 Order detail: Pickup, Carhop, Dine-in, past orders and balance payments. */
export default function OrderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const order = useOrder(id)
  const store = order ? storeById.get(order.storeId) : undefined

  if (!order || !store)
    return (
      <>
        <TopBar title="Order detail" />
        <EmptyState
          icon="receipt"
          iconStyle="circle"
          title="We can’t find this order"
          className="pt-16"
          actions={<Button onClick={() => navigate('/')}>Find a store</Button>}
        >
          It may have been placed on another account or device.
        </EmptyState>
      </>
    )
  return (
    <CurrencyScope country={store.country}>
      <OrderDetail key={order.id} order={order} store={store} />
    </CurrencyScope>
  )
}

function OrderDetail({ order, store }: { order: Order; store: Store }) {
  const toast = useToast()
  const user = useAuth((s) => s.user)
  const patch = useOrderUpdates((s) => s.patch)
  const [params, setParams] = useSearchParams()
  const [downloading, setDownloading] = useState(false)

  const hero = heroFor(order)
  const stage = stageOf(order)
  const past = stage === 'done' || stage === 'cancelled'
  const number = order.id.replace(/^SLT-/, '')
  const savedCar = user?.cars.find((c) => c.id === order.carId) ?? user?.cars.find((c) => c.isDefault)
  const car = order.carDetails ?? (savedCar ? carText(savedCar) : '')
  const carhop = order.method === 'carhop'
  const arrived = stage === 'arrived'
  const carhopActive = carhop && (stage === 'placed' || stage === 'preparing' || stage === 'ready')
  // ?here=1 (I'm here on the branch page's active order card) starts the arrival flow.
  const [sheet, setSheet] = useState<Sheet>(() => (params.get('here') && carhopActive ? 'arrive' : null))
  useEffect(() => {
    if (params.get('here'))
      setParams(
        (p) => {
          p.delete('here')
          return p
        },
        { replace: true },
      )
  }, [params, setParams])

  const download = async () => {
    setDownloading(true)
    await fakeRequest()
    setDownloading(false)
    toast.show({ type: 'success', message: `Invoice for #${number} downloaded` })
  }

  const short = store.name.replace(/^SALT\s+/i, '')
  /** The branch's carhop bays: shown before arrival and filled in on I'm here. */
  const designated = `Carhop bays 1–6, in front of the ${short} entrance`
  const parking = order.parkingSpot ?? `Park at carhop bays 1–6, in front of the ${short} entrance.`
  const callStaff = () => callNumber(store.phone)
  const spotMode: SpotMode | null = sheet === 'arrive' || sheet === 'spot' || sheet === 'car' ? sheet : null

  return (
    <div className="flex min-h-full flex-col bg-surface-base">
      <TopBar title="Order detail" trailing={<IconButton icon="help-circle" label="Get help" onClick={callSupport} />} />

      <main className="flex flex-col gap-7 px-4 pt-4 pb-8">
        <div className="flex flex-col gap-3">
          <StatusHero hero={hero} number={number} chevron={stage === 'done'} onOpen={() => setSheet('status')} />
          {arrived && <StaffNotice onCall={callStaff} />}
        </div>
        <OrderInfo
          typeText={orderTypeText(order, methodLabels[order.method])}
          storeName={store.name}
          onDirections={!past && !carhop ? () => window.open(directionsUrl({ lat: store.lat, lng: store.lng }), '_blank', 'noopener') : undefined}
        >
          {carhop && !past && (
            <CarhopInfo
              car={car}
              parking={parking}
              onEditCar={() => setSheet('car')}
              // Before I'm here, changing the spot is the arrival itself.
              onChangeSpot={() => setSheet(arrived ? 'spot' : 'arrive')}
            />
          )}
        </OrderInfo>
        <ItemsSection order={order} />
        <PaymentSection order={order} downloading={downloading} onDownload={() => void download()} />
      </main>

      {/* Figma 828:175851 "ImHereBar". */}
      {carhopActive && (
        <div className="sticky bottom-0 z-20 mt-auto flex gap-2 bg-surface-base px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))] shadow-bar">
          <Button variant="secondary" leadingIcon="phone" className="min-w-0 flex-1" onClick={callStaff}>
            Call staff
          </Button>
          <Button leadingIcon="hand" className="min-w-0 flex-1" onClick={() => setSheet('arrive')}>
            I’m here
          </Button>
        </div>
      )}

      {/* Order status timeline. Prototype: tap a step to move the order there. */}
      <BottomSheet open={sheet === 'status'} onClose={() => setSheet(null)} ariaLabel="Order status" bare>
        <div className="flex flex-col gap-3 px-4 pt-2.5 pb-[max(32px,env(safe-area-inset-bottom))]">
          <span aria-hidden className="mx-auto h-1 w-9 rounded-2 bg-border-default" />
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 title-l text-text-primary">Order status</h2>
            <IconButton icon="x" label="Close" variant="outline" size={32} onClick={() => setSheet(null)} />
          </div>
          <Timeline steps={stepsFor(order)} onPick={(s) => patch(order.id, moveTo(order, s.status))} />
          <p className="caption text-text-tertiary">Prototype: tap a step to set the order to that status.</p>
        </div>
      </BottomSheet>

      <SpotSheet
        mode={spotMode}
        car={car}
        spot={order.parkingSpot ?? designated}
        onClose={() => setSheet(null)}
        onSubmit={(mode, value) => {
          if (mode === 'car') patch(order.id, { carDetails: value })
          else if (mode === 'spot') patch(order.id, { parkingSpot: value })
          else patch(order.id, { ...moveTo(order, 'arrived'), parkingSpot: value })
          setSheet(null)
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------------ */

/** Shared sheet layout from Figma: handle, title row with close, body, actions. */
function SheetFrame({ title, body, onClose, children }: { title: string; body?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 px-4 pt-2.5 pb-[max(32px,env(safe-area-inset-bottom))]">
      <span aria-hidden className="mx-auto h-1 w-9 rounded-2 bg-border-default" />
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <h2 className="min-w-0 flex-1 title-l text-text-primary">{title}</h2>
          <IconButton icon="x" label="Close" variant="outline" size={32} onClick={onClose} />
        </div>
        {body && <p className="body-m text-text-secondary">{body}</p>}
      </div>
      {children}
    </div>
  )
}

const spotCopy: Record<SpotMode, { title: string; placeholder: string; error: string; cta: string }> = {
  arrive: {
    title: 'Parking spot',
    placeholder: 'e.g. Carhop bay 4, or near the pharmacy entrance',
    error: 'Tell us where you parked',
    cta: 'I’m here, bring my order',
  },
  spot: {
    title: 'Parking spot',
    placeholder: 'e.g. Carhop bay 4, or near the pharmacy entrance',
    error: 'Tell us where you parked',
    cta: 'Update parking spot',
  },
  car: {
    title: 'Edit car',
    placeholder: 'e.g. Toyota Land Cruiser, White · Plate RKD 4821',
    error: 'Add your car details so staff can find you',
    cta: 'Save',
  },
}

/** One field sheet: where they parked (I'm here, change spot) or their car (edit car), with a sending state. */
function SpotSheet({
  mode,
  car,
  spot,
  onClose,
  onSubmit,
}: {
  mode: SpotMode | null
  car: string
  spot: string
  onClose: () => void
  onSubmit: (mode: SpotMode, value: string) => void
}) {
  // Keep the last mode while the sheet animates out.
  const [shown, setShown] = useState<SpotMode>(mode ?? 'arrive')
  if (mode && mode !== shown) setShown(mode)
  return (
    <BottomSheet open={mode !== null} onClose={onClose} ariaLabel={spotCopy[shown].title} bare>
      {mode && <SpotForm key={mode} mode={mode} initial={mode === 'car' ? car.replace(' · ', '\n') : spot} onClose={onClose} onSubmit={onSubmit} />}
    </BottomSheet>
  )
}

function SpotForm({ mode, initial, onClose, onSubmit }: { mode: SpotMode; initial: string; onClose: () => void; onSubmit: (mode: SpotMode, value: string) => void }) {
  const copy = spotCopy[mode]
  const [value, setValue] = useState(initial)
  const [sending, setSending] = useState(false)
  const [tried, setTried] = useState(false)
  const error = tried && !value.trim() ? copy.error : undefined

  const submit = async () => {
    setTried(true)
    if (!value.trim()) return
    setSending(true)
    await fakeRequest()
    setSending(false)
    onSubmit(mode, value.trim().replace(/\s*\n+\s*/g, ' · '))
  }

  return (
    <SheetFrame title={copy.title} onClose={onClose}>
      <Textarea value={value} onChange={setValue} placeholder={copy.placeholder} aria-label={copy.title} error={error} />
      <Button fullWidth leadingIcon={mode === 'arrive' ? 'hand' : undefined} loading={sending} onClick={() => void submit()}>
        {copy.cta}
      </Button>
    </SheetFrame>
  )
}
