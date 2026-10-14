/**
 * Open or closed, in the store's own time zone. Hours rows: day 0 = Sunday;
 * `closes` <= `opens` means after midnight; 00:00 to 24:00 is open all day.
 */
import type { Store, StoreHours } from '../data/schema'
import { hoursByStore } from './data'
import { time12 } from './format'

const tzOffsetHours: Record<string, number> = {
  'Saudi Arabia': 3,
  'United Arab Emirates': 4,
  Kuwait: 3,
  Qatar: 3,
  Bahrain: 3,
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const dayName = (d: number) => dayNames[d]

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Day of week and minutes since midnight in the store's time zone. */
export function storeClock(store: Store, now = new Date()) {
  const offset = tzOffsetHours[store.country] ?? 3
  const local = new Date(now.getTime() + offset * 3600_000)
  return { day: local.getUTCDay(), minutes: local.getUTCHours() * 60 + local.getUTCMinutes() }
}

/** Interval in minutes from the start of `row.day`. End can pass 1440. */
function interval(row: StoreHours) {
  const start = toMin(row.opens)
  let end = toMin(row.closes)
  if (end <= start) end += 1440
  return { start, end }
}

export type OpenStatus = {
  open: boolean
  /** "Open · until 2:00 AM", "Open 24 hours", "Closed · Opens at 1:00 PM", "Closed · Opens Sun at 1:00 PM" */
  label: string
  /** When closed: next opening time, "13:00". */
  opensAt?: string
  /** When closed: minutes until it opens. */
  opensInMin?: number
}

export function openStatus(store: Store, now = new Date(), forceClosed = false): OpenStatus {
  const rows = hoursByStore.get(store.id) ?? []
  const { day, minutes } = storeClock(store, now)
  const byDay = new Map(rows.map((r) => [r.day, r]))

  if (!forceClosed) {
    const today = byDay.get(day)
    if (today) {
      const { start, end } = interval(today)
      if (end - start >= 1440) return { open: true, label: 'Open 24 hours' }
      if (minutes >= start && minutes < end) return { open: true, label: `Open · until ${time12(today.closes)}` }
    }
    const yesterday = byDay.get((day + 6) % 7)
    if (yesterday) {
      const { end } = interval(yesterday)
      if (end > 1440 && minutes < end - 1440) return { open: true, label: `Open · until ${time12(yesterday.closes)}` }
    }
  }

  // Next opening: later today, or the next day with hours.
  for (let i = 0; i < 7; i++) {
    const d = (day + i) % 7
    const r = byDay.get(d)
    if (!r) continue
    if (i === 0 && toMin(r.opens) <= minutes) continue
    const at = time12(r.opens)
    const when = i === 0 ? `at ${at}` : i === 1 ? `tomorrow at ${at}` : `${dayNames[d].slice(0, 3)} at ${at}`
    return { open: false, label: `Closed · Opens ${when}`, opensAt: r.opens, opensInMin: i * 1440 + toMin(r.opens) - minutes }
  }
  return { open: false, label: 'Closed' }
}

/** Rows for the Opening hours tab: one per weekday, Sunday first. */
export function weekHours(store: Store) {
  const rows = hoursByStore.get(store.id) ?? []
  const today = storeClock(store).day
  return dayNames.map((name, day) => {
    const r = rows.find((x) => x.day === day)
    const text = !r ? 'Closed' : r.opens === '00:00' && r.closes === '24:00' ? 'Open 24 hours' : `${time12(r.opens)} – ${time12(r.closes)}`
    return { day, name, text, isToday: day === today }
  })
}
