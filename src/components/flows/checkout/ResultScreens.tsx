import { useEffect, useState } from 'react'
import type { Order } from '../../../data/schema'
import { methodLabels } from '../../../lib/data'
import type { PaymentResult } from '../../../lib/scenarios'
import { Button } from '../../ui/Button'
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
        <p className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3.5 py-2 whitespace-nowrap">
          <span className="label-m text-text-primary">Order #{order.id}</span>
          <span className="body-s text-text-secondary">· {methodLabels[order.method]}</span>
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

type FailedResult = Exclude<PaymentResult, 'success'>

type PaymentFailedProps = {
  result: FailedResult
  /** Retrying (Try again, Check payment status): loading on that button. */
  retrying: boolean
  onRetry: () => void
  onOtherMethod: () => void
  onBack: () => void
  onHelp: () => void
}

/** Figma payment result screens: Card declined, Not enough balance, Card payments are down, Still confirming. */
export function PaymentFailed({ result, retrying, onRetry, onOtherMethod, onBack, onHelp }: PaymentFailedProps) {
  switch (result) {
    case 'declined':
      return (
        <StatusScreen
          tone="error"
          icon="x"
          title="Card declined"
          onHelp={onHelp}
          actions={
            <>
              <Button fullWidth loading={retrying} onClick={onRetry}>
                Try again
              </Button>
              <Button fullWidth variant="tertiary" onClick={onOtherMethod}>
                Use another payment method
              </Button>
            </>
          }
        >
          Your bank declined this card, so we haven’t placed your order or charged you. Try again or use another payment method.
        </StatusScreen>
      )
    case 'insufficient':
      return (
        <StatusScreen
          tone="error"
          icon="wallet"
          title="Not enough balance"
          onHelp={onHelp}
          actions={
            <>
              <Button fullWidth onClick={onOtherMethod}>
                Use another payment method
              </Button>
              <Button fullWidth variant="tertiary" onClick={onBack}>
                Back to checkout
              </Button>
            </>
          }
        >
          Your bank says this card doesn’t have enough balance for this order. You haven’t been charged. Use another card or payment method.
        </StatusScreen>
      )
    case 'gateway':
      return (
        <StatusScreen
          tone="warning"
          icon="card"
          title="Card payments are down"
          onHelp={onHelp}
          actions={
            <>
              <Button fullWidth onClick={onOtherMethod}>
                Use another payment method
              </Button>
              <Button fullWidth variant="tertiary" loading={retrying} onClick={onRetry}>
                Try again
              </Button>
            </>
          }
        >
          We can’t reach our payment provider right now. You haven’t been charged. Pay with Apple Pay or cash, or try your card again in a few minutes.
        </StatusScreen>
      )
    case 'pending':
      return (
        <StatusScreen
          tone="warning"
          icon="clock"
          title="Still confirming your payment"
          onHelp={onHelp}
          actions={
            <>
              <Button fullWidth loading={retrying} onClick={onRetry}>
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
}
