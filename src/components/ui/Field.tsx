import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

/** Shared label + helper layout for Input, Textarea and Select. */
export function FieldShell({
  id,
  label,
  helper,
  error,
  helperId,
  className,
  children,
}: {
  id: string
  label?: string
  helper?: ReactNode
  error?: ReactNode
  helperId: string
  className?: string
  children: ReactNode
}) {
  const message = typeof error === 'string' || (error && typeof error !== 'boolean') ? error : helper
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="label-m text-text-secondary">
          {label}
        </label>
      )}
      {children}
      {message && (
        <div id={helperId} className="flex items-start gap-1.5">
          {error && typeof error !== 'boolean' ? (
            <>
              <Icon name="alert" size={16} className="mt-px shrink-0 text-state-error" />
              <span className="body-s text-state-error">{message}</span>
            </>
          ) : (
            <span className="body-s text-text-tertiary">{message}</span>
          )}
        </div>
      )}
    </div>
  )
}
