import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

type CartButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { count: number }

/** Figma "Cart button": bag icon with an orange count badge. */
export function CartButton({ count, className, type = 'button', ...rest }: CartButtonProps) {
  return (
    <button
      type={type}
      aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
      className={cn('relative inline-flex size-11 shrink-0 items-center justify-center rounded-full active:bg-surface-muted', className)}
      {...rest}
    >
      <Icon name="bag" size={24} />
      {count > 0 && (
        <span className="absolute top-0.5 end-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-promo px-[5px] label-s text-text-on-inverse ring-2 ring-surface-base">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
