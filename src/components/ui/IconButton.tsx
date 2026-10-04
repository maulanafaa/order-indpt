import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from './Icon'

export type IconButtonStyle = 'ghost' | 'outline' | 'elevated' | 'solid'
export type IconButtonSize = 40 | 32

const styles: Record<IconButtonStyle, string> = {
  ghost: 'bg-transparent text-text-primary active:bg-surface-muted',
  outline: 'bg-surface-base text-text-primary inset-ring inset-ring-border-default active:bg-surface-muted',
  elevated: 'bg-surface-base text-text-primary shadow-elevated active:bg-surface-muted',
  solid: 'bg-surface-inverse text-text-on-inverse active:opacity-85',
}

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'style'> & {
  icon: IconName
  /** Accessible name, read by screen readers. */
  label: string
  variant?: IconButtonStyle
  size?: IconButtonSize
}

/** Figma "Icon button". Style × Size, fully rounded. */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 40,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-[background-color,opacity] disabled:opacity-35',
        size === 40 ? 'size-10' : 'size-8',
        styles[variant],
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size === 40 ? 20 : 16} />
    </button>
  )
}
