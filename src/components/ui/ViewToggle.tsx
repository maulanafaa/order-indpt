import { cn } from '../../lib/cn'
import { Icon, type IconName } from './Icon'

type Option<T extends string> = { value: T; icon: IconName; label: string }

type ViewToggleProps<T extends string> = {
  options: [Option<T>, Option<T>]
  value: T
  onChange: (value: T) => void
  className?: string
}

/** Figma "View toggle": two round icon buttons in a pill (Map · List, List · Grid). */
export function ViewToggle<T extends string>({ options, value, onChange, className }: ViewToggleProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label="View"
      className={cn('inline-flex h-12 shrink-0 items-center gap-0.5 rounded-full bg-surface-base p-[3px] inset-ring inset-ring-border-default', className)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex size-10 items-center justify-center rounded-full transition-colors',
              active ? 'bg-surface-inverse text-text-on-inverse' : 'text-text-primary',
            )}
          >
            <Icon name={o.icon} size={20} />
          </button>
        )
      })}
    </div>
  )
}
