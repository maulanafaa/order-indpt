import type { ComponentType, SVGProps } from 'react'
import AE from '../../assets/flags/ae.svg?react'
import BH from '../../assets/flags/bh.svg?react'
import KW from '../../assets/flags/kw.svg?react'
import OM from '../../assets/flags/om.svg?react'
import QA from '../../assets/flags/qa.svg?react'
import SA from '../../assets/flags/sa.svg?react'
import { cn } from '../../lib/cn'
import type { PhoneCountry } from '../../lib/phone'

const flags: Record<PhoneCountry['id'], ComponentType<SVGProps<SVGSVGElement>>> = { SA, AE, QA, KW, BH, OM }

/** Figma "Flag": 20 x 14 country flags for the phone number field. */
export function Flag({ country, className }: { country: PhoneCountry['id']; className?: string }) {
  const Svg = flags[country]
  return <Svg aria-hidden width={20} height={14} className={cn('shrink-0', className)} />
}
