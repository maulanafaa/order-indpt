import type { SVGProps } from 'react'
import Sar from '../../icons/sar.svg?react'

type SarIconProps = SVGProps<SVGSVGElement> & {
  /** Height in px. Width keeps the 11:12 ratio. About 74% of the font size. */
  size?: number
}

/**
 * The Saudi Riyal sign (U+20C1) drawn as a vector, because no font renders
 * it yet. Never type the character itself.
 */
export function SarIcon({ size = 12, ...rest }: SarIconProps) {
  return (
    <Sar
      width={(size * 11) / 12}
      height={size}
      role="img"
      aria-label="SAR"
      focusable={false}
      {...rest}
    />
  )
}
