/**
 * What a branch can do right now, for the store card and the branch page.
 * Figma "Store card" Availability: Open, Opening soon, Closed, Paused.
 */
import type { Store } from '../data/schema'
import { servicesByStore } from './data'
import { openStatus } from './hours'
import { demoStateFor } from './demoBranches'
import type { StoreFlag } from './scenarios'

/** Opens within this many minutes counts as "opening soon". */
const SOON_MIN = 60

export type BranchKind = 'open' | 'soon' | 'closed' | 'paused'

export type BranchState = {
  kind: BranchKind
  /** Badge text: "Open · until 02:00", "Opens at 07:00 · in 25 min", "Closed · Opens at 16:00", "Online ordering unavailable". */
  label: string
  /** Next opening time when not open, "16:00". */
  opensAt?: string
  /** Orders can be placed now (open) or scheduled (soon, closed). Paused takes none. */
  canOrder: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Every supported method is paused: the branch is not taking online orders. */
export function isPaused(store: Store) {
  const supported = (servicesByStore.get(store.id) ?? []).filter((s) => s.supported)
  return supported.length > 0 && supported.every((s) => !s.availableNow)
}

export function branchState(store: Store, now = new Date(), urlFlag: StoreFlag | null = null, demo = true): BranchState {
  // A URL flag wins; otherwise a demo branch can force its own state.
  const flag = urlFlag ?? demoStateFor(store.id, demo)
  if (flag === 'paused' || (!flag && isPaused(store))) {
    return { kind: 'paused', label: 'Online ordering unavailable', canOrder: false }
  }
  if (flag === 'soon') {
    // Demo: opens 25 minutes from now, on a 5 minute mark.
    const at = new Date(now.getTime() + 25 * 60_000)
    const opensAt = `${pad(at.getHours())}:${pad(Math.floor(at.getMinutes() / 5) * 5)}`
    return { kind: 'soon', label: `Opens at ${opensAt} · in 25 min`, opensAt, canOrder: true }
  }
  const status = openStatus(store, now, flag === 'closed')
  if (status.open) return { kind: 'open', label: status.label, canOrder: true }
  if (status.opensInMin != null && status.opensInMin <= SOON_MIN && flag !== 'closed') {
    return { kind: 'soon', label: `Opens at ${status.opensAt} · in ${status.opensInMin} min`, opensAt: status.opensAt, canOrder: true }
  }
  return { kind: 'closed', label: status.label, opensAt: status.opensAt, canOrder: true }
}

/** Badge variant per state (Figma: Success, Warning, Subtle). */
export const branchBadge: Record<BranchKind, 'success' | 'warning' | 'subtle'> = {
  open: 'success',
  soon: 'warning',
  closed: 'subtle',
  paused: 'subtle',
}

/** Main action label on the store card. */
export const branchAction: Record<BranchKind, string> = {
  open: 'Order',
  soon: 'Order ahead',
  closed: 'Schedule order',
  paused: 'See menu',
}

/** Rough drive time for the card: city speed close by, highway speed far away. "4 min", "4 hr". */
export function driveTime(km: number) {
  const minutes = km < 30 ? 1 + Math.round((km / 25) * 60) : Math.round((km / 90) * 60)
  return minutes < 60 ? `${Math.max(1, minutes)} min` : `${Math.round(minutes / 60)} hr`
}
