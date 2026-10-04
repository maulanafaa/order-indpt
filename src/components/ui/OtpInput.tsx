import { useRef, useState } from 'react'
import { cn } from '../../lib/cn'

type OtpInputProps = {
  value: string
  onChange: (value: string) => void
  length?: number
  error?: boolean
  disabled?: boolean
  autoFocus?: boolean
  /** Called when the last digit is typed. */
  onComplete?: (value: string) => void
  'aria-describedby'?: string
}

/**
 * Figma "OTP input": one box per digit (48 x 56, Title/L digits).
 * A single real input sits on top so paste, SMS autofill and backspace work.
 */
export function OtpInput({ value, onChange, length = 6, error, disabled, autoFocus, onComplete, ...aria }: OtpInputProps) {
  const ref = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const active = Math.min(value.length, length - 1)
  return (
    <div className="relative flex h-14 w-full gap-2" onClick={() => ref.current?.focus()}>
      {Array.from({ length }, (_, i) => {
        const digit = value[i] ?? ''
        const isActive = focused && !disabled && i === active
        return (
          <div
            key={i}
            aria-hidden
            className={cn(
              'flex h-14 min-w-0 flex-1 items-center justify-center rounded-4 title-l text-text-primary',
              disabled
                ? 'bg-surface-muted inset-ring inset-ring-border-default'
                : error
                  ? 'bg-surface-base inset-ring-[1.5px] inset-ring-state-error'
                  : isActive
                    ? 'bg-surface-base inset-ring-[1.5px] inset-ring-border-strong'
                    : 'bg-surface-base inset-ring inset-ring-border-default',
            )}
          >
            {digit}
            {isActive && !digit && <span className="h-6 w-px animate-pulse bg-text-primary" />}
          </div>
        )
      })}
      <input
        ref={ref}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        aria-label="6-digit code"
        aria-invalid={error || undefined}
        aria-describedby={aria['aria-describedby']}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, '').slice(0, length)
          onChange(next)
          if (next.length === length) onComplete?.(next)
        }}
        className="absolute inset-0 size-full cursor-default bg-transparent text-transparent caret-transparent opacity-0 outline-none"
      />
    </div>
  )
}
