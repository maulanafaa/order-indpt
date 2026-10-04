import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { FieldShell } from './Field'
import { fieldBox } from './fieldStyles'

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  label?: string
  value: string
  onChange: (value: string) => void
  helper?: ReactNode
  error?: ReactNode
}

/** Figma "Textarea": multi-line note field, 80px tall. */
export function Textarea({
  label,
  value,
  onChange,
  helper,
  error,
  disabled,
  rows = 2,
  className,
  id: idProp,
  maxLength,
  ...rest
}: TextareaProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const helperId = `${id}-helper`
  const counter = maxLength ? `${value.length}/${maxLength}` : undefined
  return (
    <FieldShell
      id={id}
      label={label}
      helper={helper ?? counter}
      error={error}
      helperId={helperId}
      className={className}
    >
      <div className={cn(fieldBox({ error: Boolean(error), disabled }), 'items-start py-3')}>
        <textarea
          id={id}
          rows={rows}
          value={value}
          disabled={disabled}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={helper || counter || error ? helperId : undefined}
          className="min-h-14 w-full resize-none bg-transparent input-text text-text-primary outline-none placeholder:text-text-tertiary disabled:text-text-disabled"
          {...rest}
        />
      </div>
    </FieldShell>
  )
}
