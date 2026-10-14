import { cn } from '../../lib/cn'
import { Icon, type IconName } from './Icon'

type OrderTypeTileProps = {
  icon: IconName
  label: string
  selected: boolean
  disabled?: boolean
  onSelect: () => void
}

/** Figma "Order type", Style = Horizontal: icon and label in one row, 48 px. Default, Selected (inverse), Unavailable (muted). */
export function OrderTypeTile({ icon, label, selected, disabled, onSelect }: OrderTypeTileProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      aria-label={disabled ? `${label}, unavailable` : undefined}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-4 px-3 transition-[background-color,color,box-shadow] duration-300 ease-card',
        selected
          ? 'bg-surface-inverse text-text-on-inverse'
          : disabled
            ? 'bg-surface-muted text-text-disabled'
            : 'bg-surface-base text-text-primary inset-ring inset-ring-border-default',
      )}
    >
      <Icon name={icon} size={20} className="shrink-0" />
      <span className="label-l whitespace-nowrap">{label}</span>
    </button>
  )
}
