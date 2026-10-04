import { useId } from 'react'
import { cn } from '../../lib/cn'
import { CheckboxMark, RadioMark } from './Controls'
import { IconButton } from './IconButton'
import { Price } from './Price'
import { QuantityStepper } from './QuantityStepper'

type Base = {
  label: string
  /** Extra charge, shown as "+ price". Hidden when unavailable. */
  surcharge?: number
  /** Shown disabled with "Unavailable", never hidden. */
  unavailable?: boolean
  className?: string
}

type ChoiceRow = Base & {
  control: 'radio' | 'checkbox'
  selected: boolean
  onChange: (selected: boolean) => void
  /** Radio group name. */
  name?: string
}

type StepperRow = Base & {
  control: 'stepper'
  quantity: number
  onQuantityChange: (next: number) => void
  max?: number
}

export type OptionRowProps = ChoiceRow | StepperRow

/**
 * Figma "Option row": Control (Radio, Checkbox, Stepper) × Selected
 * (Yes, No, Unavailable). Used in item customisation.
 */
export function OptionRow(props: OptionRowProps) {
  const id = useId()
  const { label, surcharge, unavailable, className } = props
  const selected = props.control === 'stepper' ? props.quantity > 0 : props.selected

  const text = (
    <>
      <span
        className={cn(
          'min-w-0 flex-1',
          unavailable ? 'body-m text-text-disabled' : selected ? 'label-m text-text-primary' : 'body-m text-text-primary',
        )}
      >
        {label}
      </span>
      {unavailable ? (
        <span className="caption text-text-tertiary">Unavailable</span>
      ) : (
        surcharge !== undefined &&
        surcharge > 0 && (
          <span className="inline-flex items-center gap-0.5 body-s text-text-secondary">
            +<Price amount={surcharge} size="sm" tone="muted" />
          </span>
        )
      )}
    </>
  )

  const row = cn('flex min-h-11 items-center gap-3 py-1.5', className)

  if (props.control === 'stepper') {
    return (
      <div className={row} aria-disabled={unavailable || undefined}>
        {text}
        {props.quantity > 0 && !unavailable ? (
          <QuantityStepper
            variant="solid"
            size="sm"
            value={props.quantity}
            onChange={props.onQuantityChange}
            max={props.max}
            trashAtOne={false}
            itemName={label}
          />
        ) : (
          <IconButton
            icon="plus"
            label={`Add ${label}`}
            variant="outline"
            size={32}
            disabled={unavailable}
            onClick={() => props.onQuantityChange(1)}
          />
        )}
      </div>
    )
  }

  const { control, onChange, name } = props
  return (
    <label htmlFor={id} className={cn(row, unavailable ? 'cursor-default' : 'cursor-pointer')}>
      <input
        id={id}
        type={control}
        name={name}
        className="peer sr-only"
        checked={props.selected}
        disabled={unavailable}
        onChange={(e) => onChange(control === 'radio' ? true : e.target.checked)}
      />
      {text}
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-border-strong',
          unavailable && 'opacity-35',
        )}
      >
        {control === 'radio' ? <RadioMark checked={props.selected} /> : <CheckboxMark checked={props.selected} />}
      </span>
    </label>
  )
}
