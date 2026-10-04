import { useId, useRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { FieldShell } from './Field'
import { fieldBox } from './fieldStyles'
import { Icon, type IconName } from './Icon'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size' | 'onChange'> & {
  label?: string
  value: string
  onChange: (value: string) => void
  /** e.g. "+966", shown before the value with a divider. */
  prefix?: string
  leadingIcon?: IconName
  /** Shows an x button while there is a value. */
  clearable?: boolean
  helper?: ReactNode
  /** true for a red border only, or a message to show under the field. */
  error?: ReactNode
  /** Review only: draw the Focused state without focus. */
  forceFocus?: boolean
}

/** Figma "Input". State × Content with Label, Prefix, Leading icon, Clear, Helper. */
export function Input({
  label,
  value,
  onChange,
  prefix,
  leadingIcon,
  clearable,
  helper,
  error,
  forceFocus,
  disabled,
  className,
  id: idProp,
  ...rest
}: InputProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const helperId = `${id}-helper`
  const ref = useRef<HTMLInputElement>(null)
  const hasError = Boolean(error)

  return (
    <FieldShell id={id} label={label} helper={helper} error={error} helperId={helperId} className={className}>
      <div className={cn(fieldBox({ error: hasError, disabled, forceFocus }), 'h-12')}>
        {leadingIcon && <Icon name={leadingIcon} size={18} className="shrink-0 text-text-tertiary" />}
        {prefix && (
          <>
            <span className={cn('input-text', disabled ? 'text-text-disabled' : 'text-text-primary')}>{prefix}</span>
            <span aria-hidden className="h-6 w-px bg-border-default" />
          </>
        )}
        <input
          ref={ref}
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={hasError || undefined}
          aria-describedby={helper || (error && error !== true) ? helperId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent input-text text-text-primary outline-none placeholder:text-text-tertiary disabled:text-text-disabled"
          {...rest}
        />
        {clearable && value && !disabled && (
          <button
            type="button"
            aria-label="Clear"
            className="-mr-1 inline-flex size-6 items-center justify-center rounded-full text-text-tertiary"
            onClick={() => {
              onChange('')
              ref.current?.focus()
            }}
          >
            <Icon name="x" size={16} />
          </button>
        )}
      </div>
    </FieldShell>
  )
}
