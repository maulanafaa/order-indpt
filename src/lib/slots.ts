/**
 * Pickup, carhop and dine-in times, in the store's own time zone.
 * Slots are every 15 minutes, from 30 minutes from now until closing.
 * A few slots are "Fully booked" so the disabled state shows.
 */
import type { Store } from '../data/schema'
import { hoursByStore } from './data'
import { storeClock } from './hours'
import { time12 } from './format'

export const SLOT_MINUTES = 15
/** As soon as possible: ready in about this long. */
export const ASAP_MINUTES = 15
/** First bookable slot is at least this far away. */
export const LEAD_MINUTES = 30

export type Slot = {
  /** 0 = today, 1 = tomorrow (store time). */
  dayOffset: 0 | 1
  /** Minutes from the start of that day; may pass 1440 for after midnight. */
  minutes: number
  full: boolean
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** "6:45 PM" from minutes (wraps past midnight). */
export const clockTime = (minutes: number) => time12(minutes)

/** Deterministic "Fully booked" slots: every fifth one, offset by the store. */
const isFull = (store: Store, dayOffset: number, minutes: number) =>
  (Math.floor(minutes / SLOT_MINUTES) + dayOffset * 3 + store.id.length) % 5 === 3

/** Open interval for a weekday in minutes (end can pass 1440). Null when closed all day. */
function hoursFor(store: Store, day: number) {
  const row = (hoursByStore.get(store.id) ?? []).find((r) => r.day === day)
  if (!row) return null
  const start = toMin(row.opens)
  let end = toMin(row.closes)
  if (end <= start) end += 1440
  return { start, end }
}

export function slotsFor(store: Store, dayOffset: 0 | 1, now = new Date()): Slot[] {
  const clock = storeClock(store, now)
  const day = (clock.day + dayOffset) % 7
  const hours = hoursFor(store, day)
  const slots: Slot[] = []
  // Today can also include the tail of yesterday's hours (open past midnight).
  const ranges: { start: number; end: number }[] = []
  if (hours) ranges.push(hours)
  const prev = hoursFor(store, (day + 6) % 7)
  if (prev && prev.end > 1440) ranges.push({ start: 0, end: prev.end - 1440 })
  const earliest = dayOffset === 0 ? clock.minutes + LEAD_MINUTES : 0
  for (const r of ranges) {
    let m = Math.ceil(Math.max(r.start, earliest) / SLOT_MINUTES) * SLOT_MINUTES
    for (; m <= r.end - SLOT_MINUTES; m += SLOT_MINUTES) slots.push({ dayOffset, minutes: m, full: isFull(store, dayOffset, m) })
  }
  return slots.sort((a, b) => a.minutes - b.minutes)
}

/** Minutes (store time, today) when an order placed now would be ready. */
export const asapMinutes = (store: Store, now = new Date()) => storeClock(store, now).minutes + ASAP_MINUTES

/** "Today, Mon 5 Oct" / "Tomorrow, Tue 6 Oct" in the store's time zone. */
export function dayLabel(store: Store, dayOffset: 0 | 1, now = new Date()) {
  const clock = storeClock(store, now)
  const shift = (clock.minutes - (now.getUTCHours() * 60 + now.getUTCMinutes()) + 1440 * 2) % 1440
  const local = new Date(now.getTime() + shift * 60_000 + dayOffset * 86_400_000)
  const text = local.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${dayOffset === 0 ? 'Today' : 'Tomorrow'}, ${text.replace(',', '')}`
}

/** Real date for a store-time slot, for saving on the order. */
export function slotDate(store: Store, dayOffset: number, minutes: number, now = new Date()) {
  const clock = storeClock(store, now)
  return new Date(now.getTime() + (dayOffset * 1440 + minutes - clock.minutes) * 60_000)
}
