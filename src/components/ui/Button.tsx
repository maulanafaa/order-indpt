import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from './Icon'
import { Price, type PriceTone } from './Price'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive' | 'disabled'
export type ButtonSize = 'lg' | 'md'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-surface-inverse text-text-on-inverse active:opacity-85',
  secondary: 'bg-surface-base text-text-primary inset-ring inset-ring-border-strong active:bg-surface-muted',
  tertiary: 'bg-surface-muted text-text-primary active:bg-surface-disabled',
  ghost: 'bg-transparent text-text-primary active:bg-surface-muted',
  destructive: 'bg-state-error text-text-on-inverse active:opacity-85',
  disabled: 'bg-surface-disabled text-text-disabled',
}

const priceTone: Record<ButtonVariant, PriceTone> = {
  primary: 'inverse',
  destructive: 'inverse',
  secondary: 'default',
  tertiary: 'default',
  ghost: 'default',
  disabled: 'inherit',
}

const sizes: Record<ButtonSize, { box: string; icon: number }> = {
  lg: { box: 'h-13 px-5 cta-l', icon: 20 },
  md: { box: 'h-11 px-4 cta-m', icon: 18 },
}

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Figma "Leading icon" + "Icon". */
  leadingIcon?: IconName
  /** Figma "Show price": a Price after the label. */
  price?: number
  /** Async state: spinner in place of the content, same width. */
  loading?: boolean
  fullWidth?: boolean
  /** Label at the start, price at the end (e.g. "Add to cart ... 60.00"). */
  spread?: boolean
  children: ReactNode
}

/**
 * Figma "Button". Variant × Size × State (Default, Loading).
 * Passing `disabled` renders the Disabled variant.
 */
export function Button({
  variant = 'primary',
  size = 'lg',
  leadingIcon,
  price,
  loading = false,
  fullWidth,
  spread,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const v: ButtonVariant = disabled ? 'disabled' : variant
  const s = sizes[size]
  return (
    <button
      type={type}
      disabled={disabled || v === 'disabled'}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full whitespace-nowrap select-none transition-[background-color,opacity]',
        'data-loading:pointer-events-none',
        s.box,
        variants[v],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      <span className={cn('inline-flex items-center gap-2', spread && 'w-full justify-between', loading && 'invisible')}>
        {leadingIcon && <Icon name={leadingIcon} size={s.icon} />}
        <span>{children}</span>
        {price !== undefined && <Price amount={price} size="cta" tone={priceTone[v]} />}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
          <span className="sr-only">Loading</span>
        </span>
      )}
    </button>
  )
}
