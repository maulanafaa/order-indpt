import { cn } from '../../lib/cn'

/**
 * Field box states (Figma Input "Field"): Default border/default 1px,
 * Focused border/strong 1.5px, Error state/error 1.5px, Disabled muted.
 */
export const fieldBox = (opts: { error?: boolean; disabled?: boolean; forceFocus?: boolean }) =>
  cn(
    'flex w-full items-center gap-2.5 rounded-4 px-3.5 transition-shadow',
    opts.disabled
      ? 'bg-surface-muted text-text-disabled inset-ring inset-ring-border-default'
      : opts.error
        ? 'bg-surface-base inset-ring-[1.5px] inset-ring-state-error'
        : opts.forceFocus
          ? 'bg-surface-base inset-ring-[1.5px] inset-ring-border-strong'
          : 'bg-surface-base inset-ring inset-ring-border-default focus-within:inset-ring-[1.5px] focus-within:inset-ring-border-strong',
  )
