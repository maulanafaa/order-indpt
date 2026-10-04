import { cn } from '../../lib/cn'
import { Icon } from './Icon'

/**
 * Figma "Radio" and "Checkbox" visuals (20px). They are decorative: the
 * real <input> lives in the row that uses them (see OptionRow).
 */
export function RadioMark({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-5 shrink-0 rounded-full bg-surface-base transition-[border-width,border-color]',
        checked ? 'border-[6px] border-surface-inverse' : 'border-[1.5px] border-text-tertiary',
        className,
      )}
    />
  )
}

export function CheckboxMark({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-2',
        checked ? 'bg-surface-inverse text-text-on-inverse' : 'border-[1.5px] border-text-tertiary bg-surface-base',
        className,
      )}
    >
      {checked && <Icon name="check" size={14} />}
    </span>
  )
}
