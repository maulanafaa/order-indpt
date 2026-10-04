import { cn } from '../../lib/cn'
import { Icon, type IconName } from './Icon'

type OrderTypeTileProps = {
  icon: IconName
  label: string
  caption: string
  selected: boolean
  disabled?: boolean
  onSelect: () => void
}

/** Figma "Order type": Default, Selected (inverse), Unavailable (muted, not tappable). */
export function OrderTypeTile({ icon, label, caption, selected, disabled, onSelect }: OrderTypeTileProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-start gap-1 rounded-4 p-3 text-start',
        selected
          ? 'bg-surface-inverse text-text-on-inverse'
          : disabled
            ? 'bg-surface-muted text-text-disabled'
            : 'bg-surface-base text-text-primary inset-ring inset-ring-border-default',
      )}
    >
      <Icon name={icon} size={20} />
      <span aria-hidden className="h-1.5" />
      <span className="label-l whitespace-nowrap">{label}</span>
      <span className={cn('caption whitespace-nowrap', selected ? 'text-text-on-inverse-muted' : disabled ? 'text-text-disabled' : 'text-text-tertiary')}>
        {caption}
      </span>
    </button>
  )
}
