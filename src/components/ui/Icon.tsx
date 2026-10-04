import type { SVGProps } from 'react'
import { icons, type IconName } from '../../icons'

export type { IconName }

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName
  /** Rendered width and height in px. Figma uses 14, 16, 18, 20 and 24. */
  size?: number
}

/** A Figma icon (24px grid, 1.75 stroke). Colour follows `currentColor`. */
export function Icon({ name, size = 20, ...rest }: IconProps) {
  const Svg = icons[name]
  return <Svg width={size} height={size} aria-hidden focusable={false} {...rest} />
}
