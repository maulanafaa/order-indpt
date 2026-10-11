import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ItemsCard,
  LocationCard,
  OrderInfoCard,
  PaymentCard,
  RefundCard,
  StatusHero,
  Timeline,
} from '../components/flows/order/OrderParts'
import { BottomSheet, Button, EmptyState, IconButton, Input, Textarea, TopBar, useToast } from '../components/ui'
import type { Order, Store } from '../data/schema'
import { useAuth } from '../lib/auth'
import { carText } from '../lib/checkout'
import { methodLabels, storeById } from '../lib/data'
import { fakeRequest } from '../lib/fake'
import { distanceKm, directionsUrl } from '../lib/geo'
import { heroFor, stageOf, stepsFor, useOrder } from '../lib/orderDetail'
import { moveTo, useOrderUpdates } from '../lib/orderUpdates'
import { useScenario } from '../lib/scenarios'
import { callSupport } from '../lib/support'
import { useNow } from '../lib/useNow'

/** I'm here counts as at the store within this distance. */
const NEAR_KM = 1

type Sheet = 'status' | 'tooFar' | 'parking' | 'car' | null

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
  return <OrderDetail key={order.id} order={order} store={store} />
}

function OrderDetail({ order, store }: { order: Order; store: Store }) {
  const toast = useToast()
  const now = useNow()
  const scenario = useScenario()
  const user = useAuth((s) => s.user)
  const patch = useOrderUpdates((s) => s.patch)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [downloading, setDownloading] = useState(false)

  const hero = heroFor(order, now.getTime())
  const stage = stageOf(order)
  const past = stage === 'done' || stage === 'cancelled'
  const number = order.id.replace(/^SLT-/, '')
  const savedCar = user?.cars.find((c) => c.id === order.carId) ?? user?.cars.find((c) => c.isDefault)
  const car = order.carDetails ?? (savedCar ? carText(savedCar) : '')
  const carhopActive = order.method === 'carhop' && (stage === 'placed' || stage === 'preparing' || stage === 'ready')
  const km = distanceKm(scenario.near.point, store)

  const download = async () => {
    setDownloading(true)
    await fakeRequest()
    setDownloading(false)
    toast.show({ type: 'success', message: `Invoice for #${number} downloaded` })
  }

  return (
    <div className="flex min-h-full flex-col bg-surface-muted">
      <TopBar title="Order detail" />

      <main className="flex flex-col gap-4 px-4 pt-4 pb-8">
        <StatusHero hero={hero} number={number} onOpen={() => setSheet('status')} />
        {order.status === 'cancelled' && <RefundCard order={order} />}
        <LocationCard order={order} store={store} car={car} onEditCar={carhopActive ? () => setSheet('car') : undefined} />
        <ItemsCard order={order} />
        <PaymentCard order={order} />
        <OrderInfoCard order={order} store={store} past={past} methodLabel={methodLabels[order.method]} />
        <div className="flex flex-col gap-2">
          <Button fullWidth variant="secondary" leadingIcon="receipt" loading={downloading} onClick={() => void download()}>
            Download invoice
          </Button>
          <Button fullWidth variant="tertiary" leadingIcon="help-circle" onClick={callSupport}>
            Get help
          </Button>
        </div>
      </main>

      {carhopActive && (
        <div className="sticky bottom-0 z-20 mt-auto flex flex-col gap-2 bg-surface-base px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))] shadow-bar">
          <Button fullWidth onClick={() => setSheet(km > NEAR_KM ? 'tooFar' : 'parking')}>
            I’m here
          </Button>
          <p className="text-center caption text-text-secondary">
            {stage === 'ready'
              ? 'Tap once you’re parked in a carhop bay.'
              : 'Arrived early? Tap once you’re parked and we’ll bring it out when it’s ready.'}
          </p>
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

      <TooFarSheet
        open={sheet === 'tooFar'}
        km={km}
        storeName={store.name}
        onClose={() => setSheet(null)}
        onDirections={() => window.open(directionsUrl({ lat: store.lat, lng: store.lng }), '_blank', 'noopener')}
        onAnyway={() => setSheet('parking')}
      />

      <ParkingSheet
        open={sheet === 'parking' || sheet === 'car'}
        mode={sheet === 'car' ? 'car' : 'arrive'}
        car={car}
        parking={order.parkingSpot ?? ''}
        onClose={() => setSheet(null)}
        onSubmit={(carValue, parking) => {
          if (sheet === 'car') patch(order.id, { carDetails: carValue })
          else patch(order.id, { ...moveTo(order, 'arrived'), carDetails: carValue, parkingSpot: parking || undefined })
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

/** Figma 62:7385: I'm here tapped far from the branch. */
function TooFarSheet({
  open,
  km,
  storeName,
  onClose,
  onDirections,
  onAnyway,
}: {
  open: boolean
  km: number
  storeName: string
  onClose: () => void
  onDirections: () => void
  onAnyway: () => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Too far away" bare>
      <SheetFrame
        title={`You seem to be ${km.toFixed(1)} km away`}
        body={`Tap “I’m here” when you reach ${storeName} so your food is handed over fresh.`}
        onClose={onClose}
      >
        <div className="flex flex-col gap-3">
          <Button fullWidth variant="secondary" leadingIcon="nav" onClick={onDirections}>
            Get directions
          </Button>
          <Button fullWidth variant="ghost" onClick={onAnyway}>
            I’m here anyway
          </Button>
        </div>
      </SheetFrame>
    </BottomSheet>
  )
}

/** Figma 62:7007 / 240:42869: where are you parked (car and parking spot), with a sending state. Also edits the car. */
function ParkingSheet({
  open,
  mode,
  car,
  parking,
  onClose,
  onSubmit,
}: {
  open: boolean
  mode: 'arrive' | 'car'
  car: string
  parking: string
  onClose: () => void
  onSubmit: (car: string, parking: string) => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel={mode === 'car' ? 'Your car' : 'Where are you parked?'} bare>
      {open && <ParkingForm mode={mode} car={car} parking={parking} onClose={onClose} onSubmit={onSubmit} />}
    </BottomSheet>
  )
}

function ParkingForm({
  mode,
  car: initialCar,
  parking: initialParking,
  onClose,
  onSubmit,
}: {
  mode: 'arrive' | 'car'
  car: string
  parking: string
  onClose: () => void
  onSubmit: (car: string, parking: string) => void
}) {
  // Two lines in the field: "Toyota Land Cruiser, White" / "Plate RKD 4821".
  const [car, setCar] = useState(initialCar.replace(' · ', '\n'))
  const [parking, setParking] = useState(initialParking)
  const [sending, setSending] = useState(false)
  const [tried, setTried] = useState(false)
  const carError = tried && !car.trim() ? 'Add your car so staff can find you.' : undefined

  const submit = async () => {
    setTried(true)
    if (!car.trim()) return
    setSending(true)
    await fakeRequest()
    setSending(false)
    onSubmit(car.trim().replace(/\s*\n+\s*/g, ' · '), parking.trim())
  }

  return (
    <SheetFrame
      title={mode === 'car' ? 'Your car' : 'Where are you parked?'}
      body={mode === 'car' ? 'Staff use this to find you in the carhop bays.' : 'Staff will bring the order to your window.'}
      onClose={onClose}
    >
      <Textarea label="Your car" value={car} onChange={setCar} error={carError} />
      {mode === 'arrive' && (
        <Input
          label="Parking spot"
          value={parking}
          onChange={setParking}
          placeholder="e.g. Bay 4, near the entrance"
          clearable
          helper="Optional, but it helps staff find you faster."
        />
      )}
      <Button fullWidth leadingIcon={mode === 'car' ? undefined : 'car'} loading={sending} onClick={() => void submit()}>
        {mode === 'car' ? 'Save' : 'I’m here, bring my order'}
      </Button>
    </SheetFrame>
  )
}

