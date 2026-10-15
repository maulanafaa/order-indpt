import type { ComponentType, SVGProps } from 'react'
import Aed from '../../icons/aed.svg?react'
import Bhd from '../../icons/bhd.svg?react'
import Kwd from '../../icons/kwd.svg?react'
import Qar from '../../icons/qar.svg?react'
import type { CurrencyCode } from '../../lib/currency'
import { SarIcon } from './SarIcon'

/** Figma "Currency" marks other than the riyal, with their width at 12 px tall. */
const marks: Record<Exclude<CurrencyCode, 'SAR'>, { Svg: ComponentType<SVGProps<SVGSVGElement>>; width: number }> = {
  AED: { Svg: Aed, width: 11.58 },
  QAR: { Svg: Qar, width: 24.43 },
  KWD: { Svg: Kwd, width: 26.22 },
  BHD: { Svg: Bhd, width: 22.9 },
}

/**
 * Figma "Currency" (Code × Size): the riyal sign (SarIcon), the dirham sign, or the
 * QAR / KWD / BHD letters, drawn as vectors. `size` is the height in px.
 */
export function CurrencyIcon({ code, size = 12, className }: { code: CurrencyCode; size?: number; className?: string }) {
  if (code === 'SAR') return <SarIcon size={size} className={className} />
  const { Svg, width } = marks[code]
  return <Svg width={(width * size) / 12} height={size} role="img" aria-label={code} focusable={false} className={className} />
}
