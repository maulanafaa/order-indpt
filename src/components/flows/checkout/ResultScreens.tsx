import { useEffect, useState } from 'react'
import type { Order } from '../../../data/schema'
import { methodLabels } from '../../../lib/data'
import { BottomSheet } from '../../ui/BottomSheet'
import { Button } from '../../ui/Button'
import { IconButton } from '../../ui/IconButton'
import { StatusScreen } from '../../ui/StatusScreen'

export const SPLASH_MS = 3000

/** Figma "Order placed (splash)": green check, order chip, progress bar, then opens the order. */
export function OrderPlacedSplash({ order, storeName, readyText, onDone }: { order: Order; storeName: string; readyText: string; onDone: () => void }) {
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setStarted(true))
    const t = window.setTimeout(onDone, SPLASH_MS)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
    }
  }, [onDone])

  return (
    <StatusScreen
      tone="success"
      icon="check"
      title="Order placed!"
      extra={
        // Figma 814:107751 OrderChip: both parts Label/M, primary text.
        <p className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3.5 py-2 label-m whitespace-nowrap text-text-primary">
          <span>Order #{order.id}</span>
          <span>· {methodLabels[order.method]}</span>
        </p>
      }
      footer={
        <button type="button" onClick={onDone} className="mx-auto mb-12 flex flex-col items-center gap-2.5" aria-label="Open your order details now">
          <span className="block h-1 w-30 overflow-hidden rounded-2 bg-surface-muted">
            <span
              className="block h-full rounded-2 bg-surface-inverse ease-linear"
              style={{ width: started ? '100%' : '0%', transition: `width ${SPLASH_MS}ms linear` }}
            />
          </span>
          <span className="caption text-text-tertiary">Opening your order details…</span>
        </button>
      }
    >
      We’ve sent your order to {storeName}. {readyText}
    </StatusScreen>
  )
}

/** Figma "Checkout / Payment pending": blocked, full screen until the payment settles. */
export function PaymentPending({ checking, onCheck, onBack, onHelp }: { checking: boolean; onCheck: () => void; onBack: () => void; onHelp: () => void }) {
  return (
    <StatusScreen
      tone="warning"
      icon="clock"
      title="Still confirming your payment"
      onHelp={onHelp}
      actions={
        <>
          <Button fullWidth loading={checking} onClick={onCheck}>
            Check payment status
          </Button>
          <Button fullWidth variant="tertiary" onClick={onBack}>
            Back to checkout
          </Button>
        </>
      }
    >
      This is taking longer than usual. Please don’t pay again. If it goes through we’ll place your order, and if not you won’t be charged.
    </StatusScreen>
  )
}

/** Figma "Checkout / Store paused orders": blocked, full screen. */
export function StorePaused({ storeName, onOtherStore, onMenu, onHelp }: { storeName: string; onOtherStore: () => void; onMenu: () => void; onHelp: () => void }) {
  return (
    <StatusScreen
      tone="neutral"
      icon="store"
      title={`${storeName} paused orders`}
      onHelp={onHelp}
      actions={
        <>
          <Button fullWidth onClick={onOtherStore}>
            Choose another store
          </Button>
          <Button fullWidth variant="tertiary" onClick={onMenu}>
            Back to menu
          </Button>
        </>
      }
    >
      The store isn’t taking online orders right now. You haven’t been charged, and your cart is saved for another store.
    </StatusScreen>
  )
}

export type SheetAction = { label: string; onClick: () => void; loading?: boolean }
export type RecoverableError = { title: string; body: string; primary: SheetAction; secondary?: SheetAction }

/**
 * Figma checkout error sheets (card declined, offline, items sold out...): recoverable,
 * the checkout stays behind. The parent keeps `error` while `open` turns false so it animates out.
 */
export function CheckoutErrorSheet({ error, open, onClose }: { error: RecoverableError | null; open: boolean; onClose: () => void }) {
  const e = error
  return (
    <BottomSheet open={open && Boolean(error)} onClose={onClose} ariaLabel={e?.title ?? 'Error'} bare>
      {e && (
        <div className="flex flex-col gap-6 px-4 pt-2.5 pb-[max(32px,env(safe-area-inset-bottom))]">
          <span aria-hidden className="mx-auto h-1 w-9 rounded-2 bg-border-default" />
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <h2 className="min-w-0 flex-1 title-l text-text-primary">{e.title}</h2>
              <IconButton icon="x" label="Close" variant="outline" size={32} onClick={onClose} />
            </div>
            <p className="body-m text-text-secondary">{e.body}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button fullWidth loading={e.primary.loading} onClick={e.primary.onClick}>
              {e.primary.label}
            </Button>
            {e.secondary && (
              <Button fullWidth variant="ghost" loading={e.secondary.loading} onClick={e.secondary.onClick}>
                {e.secondary.label}
              </Button>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
