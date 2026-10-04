import { cn } from '../../lib/cn'
import { Icon } from './Icon'

export type StepperStyle = 'outline' | 'solid'
export type StepperSize = 'lg' | 'sm'

type QuantityStepperProps = {
  value: number
  onChange: (next: number) => void
  /** Outline in cart and item sheets; Solid on menu images when in the cart. */
  variant?: StepperStyle
  size?: StepperSize
  min?: number
  max?: number
  /** At 1, the minus becomes a trash icon (red on outline, white on solid). */
  trashAtOne?: boolean
  /** Used in aria labels, e.g. "Salt Burger". */
  itemName?: string
  className?: string
}

const sizes = {
  lg: { box: 'h-13 gap-2 px-1.5', btn: 'size-10', icon: 18, text: 'label-l' },
  sm: { box: 'h-8 gap-1 px-0.5', btn: 'size-7', icon: 14, text: 'label-m' },
}

/** Figma "Quantity stepper". Style × Size × Count (One shows trash). */
export function QuantityStepper({
  value,
  onChange,
  variant = 'outline',
  size = 'lg',
  min = 0,
  max = 99,
  trashAtOne = true,
  itemName,
  className,
}: QuantityStepperProps) {
  const s = sizes[size]
  const isOne = value <= 1 && trashAtOne
  const solid = variant === 'solid'
  const name = itemName ? ` ${itemName}` : ''
  return (
    <div
      role="group"
      aria-label={`Quantity${name}`}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full',
        s.box,
        solid ? 'bg-surface-inverse text-text-on-inverse' : 'bg-surface-base text-text-primary inset-ring inset-ring-border-default',
        className,
      )}
    >
      <button
        type="button"
        className={cn('inline-flex items-center justify-center rounded-full disabled:opacity-35', s.btn)}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={isOne ? `Remove${name}` : `Decrease${name}`}
      >
        <Icon
          name={isOne ? 'trash' : 'minus'}
          size={s.icon}
          className={cn(isOne && !solid && 'text-state-error')}
        />
      </button>
      <span className={cn('min-w-[1ch] text-center tabular-nums', s.text)} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={cn('inline-flex items-center justify-center rounded-full disabled:opacity-35', s.btn)}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Increase${name}`}
      >
        <Icon name="plus" size={s.icon} />
      </button>
    </div>
  )
}
