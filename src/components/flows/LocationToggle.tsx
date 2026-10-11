import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'

/**
 * Demo control floating at the top of Find a store: turns the simulated
 * location on or off (no real GPS). Not part of the product design.
 */
export function LocationToggle({ on, onChange, className }: { on: boolean; onChange: (on: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Location (demo)"
      onClick={() => onChange(!on)}
      className={cn(
        'pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full bg-surface-base ps-3 pe-2 shadow-elevated label-m text-text-primary',
        className,
      )}
    >
      <Icon name="locate" size={16} />
      <span>Location {on ? 'on' : 'off'}</span>
      <span
        aria-hidden
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
          on ? 'bg-state-success' : 'bg-surface-disabled',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-4 rounded-full bg-surface-base shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-[inset-inline-start] duration-200 ease-sheet',
            on ? 'start-4.5' : 'start-0.5',
          )}
        />
      </span>
    </button>
  )
}
