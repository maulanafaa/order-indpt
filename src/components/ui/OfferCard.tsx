import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

type OfferCardProps = {
  /** Stub: "15%" + "OFF". */
  value: string
  valueLabel: string
  code: string
  title: string
  /** Conditions line(s): min order, cap, methods. */
  conditions?: ReactNode
  ends: string
  /** Not usable for this order: muted, with a reason note instead of "Use". */
  unavailableNote?: string
  onUse?: () => void
}

/**
 * Figma "Offer card" (voucher): promo-coloured stub, dashed perforation with
 * notches, code chip and Use link. Not available = muted with an info note.
 */
export function OfferCard({ value, valueLabel, code, title, conditions, ends, unavailableNote, onUse }: OfferCardProps) {
  const off = Boolean(unavailableNote)
  return (
    <div className={cn('relative flex overflow-hidden rounded-8', off ? 'bg-surface-muted' : 'bg-accent-promo-subtle')}>
      <div
        className={cn(
          'flex w-23 shrink-0 flex-col items-center justify-center px-2 text-center',
          off ? 'bg-surface-disabled text-text-tertiary' : 'bg-accent-promo text-text-on-inverse',
        )}
      >
        <span className="title-xl uppercase">{value}</span>
        <span className="overline-text">{valueLabel}</span>
      </div>
      {/* Perforation and notches */}
      <span aria-hidden className="absolute inset-y-2 left-[91px] border-l-2 border-dashed border-surface-base" />
      <span aria-hidden className="absolute -top-2 left-[84px] size-4 rounded-full bg-surface-base" />
      <span aria-hidden className="absolute -bottom-2 left-[84px] size-4 rounded-full bg-surface-base" />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-3.5 ps-4.5 pe-3.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'rounded-4 border border-dashed bg-surface-base px-1.5 py-[3px] label-s',
              off ? 'border-border-default text-text-tertiary' : 'border-border-strong text-text-primary',
            )}
          >
            {code}
          </span>
          {off ? (
            <span className="label-s text-text-tertiary">Not available</span>
          ) : (
            <button type="button" onClick={onUse} className="cta-m text-text-primary underline" aria-label={`Use ${code}`}>
              Use
            </button>
          )}
        </div>
        <p className={cn('title-s', off ? 'text-text-tertiary' : 'text-text-primary')}>{title}</p>
        {conditions && <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 caption text-text-secondary">{conditions}</div>}
        <p className="caption text-text-tertiary">{ends}</p>
        {unavailableNote && (
          <p className="flex items-start gap-1.5 rounded-6 bg-surface-base px-2.5 py-2 body-s text-text-secondary">
            <Icon name="info" size={16} className="mt-px shrink-0" />
            {unavailableNote}
          </p>
        )}
      </div>
    </div>
  )
}
