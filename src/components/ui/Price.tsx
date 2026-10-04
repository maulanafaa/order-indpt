import { cn } from '../../lib/cn'
import { formatPrice } from '../../lib/format'
import { SarIcon } from './SarIcon'

export type PriceSize = 'sm' | 'md' | 'lg' | 'cta'
export type PriceTone = 'default' | 'muted' | 'inverse' | 'inherit'

const sizes: Record<PriceSize, { text: string; icon: number; gap: string }> = {
  sm: { text: 'body-s', icon: 10, gap: 'gap-0.5' },
  md: { text: 'price-m', icon: 10, gap: 'gap-0.5' },
  lg: { text: 'price-l', icon: 12, gap: 'gap-[3px]' },
  cta: { text: 'cta-l', icon: 13, gap: 'gap-[3px]' },
}

const tones: Record<PriceTone, string> = {
  default: 'text-text-primary',
  muted: 'text-text-secondary',
  inverse: 'text-text-on-inverse',
  inherit: '',
}

type PriceProps = {
  amount: number
  size?: PriceSize
  tone?: PriceTone
  /** Old price, shown with a line through it. */
  strike?: boolean
  className?: string
}

/** Figma "Price": riyal sign + amount. Size × Tone. */
export function Price({ amount, size = 'md', tone = 'default', strike, className }: PriceProps) {
  const s = sizes[size]
  return (
    <span
      className={cn('inline-flex items-center whitespace-nowrap', s.gap, s.text, tones[tone], strike && 'line-through', className)}
    >
      <SarIcon size={s.icon} className="shrink-0" />
      <span>{formatPrice(amount)}</span>
    </span>
  )
}
