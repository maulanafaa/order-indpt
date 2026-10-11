import type { ComponentType, SVGProps } from 'react'
import ApplePay from '../../assets/brands/apple-pay.svg?react'
import Mada from '../../assets/brands/mada.svg?react'
import Mastercard from '../../assets/brands/mastercard.svg?react'
import Visa from '../../assets/brands/visa.svg?react'
import { cn } from '../../lib/cn'

export type BrandName = 'applePay' | 'mada' | 'visa' | 'mastercard'

const marks: Record<BrandName, { Svg: ComponentType<SVGProps<SVGSVGElement>>; width: number; label: string }> = {
  applePay: { Svg: ApplePay, width: 31.24, label: 'Apple Pay' },
  mada: { Svg: Mada, width: 52, label: 'mada' },
  visa: { Svg: Visa, width: 44, label: 'Visa' },
  mastercard: { Svg: Mastercard, width: 27, label: 'Mastercard' },
}

/**
 * Figma "Payment brand": card scheme marks, 20 px tall by default.
 * Placeholder marks from Figma; swap for the official files before launch.
 */
export function PaymentBrand({ brand, height = 20, className }: { brand: BrandName; height?: number; className?: string }) {
  const { Svg, width, label } = marks[brand]
  return <Svg role="img" aria-label={label} width={(width * height) / 20} height={height} className={cn('shrink-0', className)} />
}
