import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean
}

/** Figma "Chip": selectable pill for time slots and filters. */
export function Chip({ selected = false, className, children, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex h-10 shrink-0 items-center justify-center rounded-4 px-3 label-m whitespace-nowrap transition-colors',
        selected
          ? 'bg-state-success text-text-on-inverse'
          : 'bg-surface-base text-text-primary inset-ring inset-ring-border-default active:bg-surface-muted',
        'disabled:bg-surface-muted disabled:text-text-disabled disabled:inset-ring-0',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
