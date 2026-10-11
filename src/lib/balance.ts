/**
 * INDPT balance (Figma 4.6 "Paid with balance"). Applied automatically at
 * checkout. Demo only: the balance=partial|full flag sets how much there is.
 */
import { round2 } from './cart'
import type { BalanceFlag } from './scenarios'

export const PARTIAL_BALANCE = 40

/** How much balance pays for this order: SAR 40 (partial), the whole total (full), or nothing. */
export function balanceUsed(flag: BalanceFlag | null, total: number) {
  if (flag === 'full') return total
  if (flag === 'partial') return round2(Math.min(PARTIAL_BALANCE, total))
  return 0
}
