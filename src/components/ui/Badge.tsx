import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type BadgeVariant = 'solid' | 'subtle' | 'outline' | 'success' | 'warning' | 'promo' | 'error'

const variants: Record<BadgeVariant, string> = {
  solid: 'bg-surface-inverse text-text-on-inverse',
  subtle: 'bg-surface-muted text-text-primary',
  outline: 'inset-ring inset-ring-border-default text-text-primary',
  success: 'bg-state-success-subtle text-state-success',
  warning: 'bg-state-warning-subtle text-state-warning',
  promo: 'bg-accent-promo text-text-on-inverse',
  error: 'bg-state-error-subtle text-state-error',
}

/**
 * Figma "Badge". Solid = emphasis (New, Sold out), Subtle = neutral status
 * (Closed), Outline = optional, Success = open, Warning = opening soon,
 * Promo = Best seller.
 */
export function Badge({
  variant = 'solid',
  className,
  children,
}: {
  variant?: BadgeVariant
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn('inline-flex h-[22px] items-center rounded-2 px-1.5 label-s whitespace-nowrap', variants[variant], className)}
    >
      {children}
    </span>
  )
}
