import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from './Icon'

type ListRowProps = {
  icon: IconName
  title: ReactNode
  subtitle?: ReactNode
  /** Trailing icon: chevron (default) or plus for "Add ..." rows. */
  trailing?: 'chev' | 'plus' | 'none'
  /** Empty state: dashed border ("Choose a payment method", "Add your car"). */
  placeholder?: boolean
  /** Red border and message under the row. */
  error?: string
  onClick?: () => void
  className?: string
  id?: string
}

/**
 * Figma "Payment method" / "Car" row: 44 px icon circle, Label/L title,
 * Body/S subtitle, chevron. Placeholder = dashed border; error = red border.
 */
export function ListRow({ icon, title, subtitle, trailing = 'chev', placeholder, error, onClick, className, id }: ListRowProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)} id={id}>
      <button
        type="button"
        onClick={onClick}
        aria-invalid={Boolean(error) || undefined}
        className={cn(
          'flex w-full items-center gap-3 rounded-8 bg-surface-base p-3.5 text-start active:bg-surface-muted',
          error
            ? 'border-[1.5px] border-dashed border-state-error'
            : placeholder
              ? 'border border-dashed border-border-strong'
              : 'border border-border-default',
        )}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted">
          <Icon name={icon} size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate label-l text-text-primary">{title}</span>
          {subtitle && <span className="body-s text-text-secondary">{subtitle}</span>}
        </span>
        {trailing !== 'none' && <Icon name={trailing === 'plus' ? 'plus' : 'chev'} size={20} className="shrink-0" />}
      </button>
      {error && (
        <p role="alert" className="flex items-start gap-1.5 caption text-state-error">
          <Icon name="alert" size={14} className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
