import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { RadioMark } from './Controls'
import { Icon } from './Icon'

type ChoiceCardProps = {
  title: ReactNode
  subtitle?: ReactNode
  selected: boolean
  onSelect: () => void
  /** Chevron at the end: tapping opens more choices (e.g. Schedule for later). */
  chevron?: boolean
  disabled?: boolean
  className?: string
}

/** Figma "Time" card: radio, Label/L title, Body/S subtitle. Selected = 1.5 px strong border. */
export function ChoiceCard({ title, subtitle, selected, onSelect, chevron, disabled, className }: ChoiceCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-4 bg-surface-base p-3.5 text-start',
        selected ? 'inset-ring-[1.5px] inset-ring-border-strong' : 'inset-ring inset-ring-border-default',
        disabled && 'cursor-not-allowed',
        className,
      )}
    >
      <RadioMark checked={selected} className={cn(disabled && 'opacity-40')} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('label-l', disabled ? 'text-text-disabled' : 'text-text-primary')}>{title}</span>
        {subtitle && <span className={cn('body-s', disabled ? 'text-text-disabled' : 'text-text-secondary')}>{subtitle}</span>}
      </span>
      {chevron && <Icon name="chev" size={20} className={cn('shrink-0', disabled && 'text-text-disabled')} />}
    </button>
  )
}
