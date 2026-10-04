import { useId, useMemo, useState } from 'react'
import type { Store } from '../../../data/schema'
import { cn } from '../../../lib/cn'
import { clockTime, dayLabel, slotsFor } from '../../../lib/slots'
import { BottomSheet } from '../../ui/BottomSheet'
import { Button } from '../../ui/Button'
import { RadioMark } from '../../ui/Controls'
import { EmptyState } from '../../ui/EmptyState'
import { SheetHeader } from '../../ui/SheetHeader'

type ScheduleSheetProps = {
  open: boolean
  onClose: () => void
  store: Store
  /** "Pickup time" or "Arrival time". */
  title: string
  value: { dayOffset: 0 | 1; minutes: number } | null
  onConfirm: (dayOffset: 0 | 1, minutes: number) => void
}

/** Schedule for later: today or tomorrow, then a 15 minute slot. Fully booked slots are disabled. */
export function ScheduleSheet(props: ScheduleSheetProps) {
  return (
    <BottomSheet open={props.open} onClose={props.onClose} bare ariaLabel={props.title}>
      {props.open && <ScheduleBody {...props} />}
    </BottomSheet>
  )
}

function ScheduleBody({ onClose, store, title, value, onConfirm }: ScheduleSheetProps) {
  const titleId = useId()
  const days = useMemo(() => [slotsFor(store, 0), slotsFor(store, 1)] as const, [store])
  const [day, setDay] = useState<0 | 1>(value?.dayOffset ?? (days[0].some((s) => !s.full) ? 0 : 1))
  const [picked, setPicked] = useState<number | null>(value?.dayOffset === day ? value.minutes : null)
  const slots = days[day]

  return (
    <div className="flex min-h-0 flex-col">
      <SheetHeader title={title} titleId={titleId} onClose={onClose} />
      <p className="px-4 pt-1 body-s text-text-secondary">Pick a day and time that suits you.</p>
      <div className="flex gap-2 px-4 pt-4" role="tablist" aria-label="Day">
        {([0, 1] as const).map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={day === d}
            onClick={() => {
              setDay(d)
              setPicked(value?.dayOffset === d ? value.minutes : null)
            }}
            className={cn(
              'flex h-10 flex-1 items-center justify-center rounded-full px-3 label-m',
              day === d ? 'bg-surface-inverse text-text-on-inverse' : 'bg-surface-base text-text-primary inset-ring inset-ring-border-default',
            )}
          >
            {dayLabel(store, d)}
          </button>
        ))}
      </div>
      <div className="mt-3 min-h-0 overflow-y-auto px-4" role="radiogroup" aria-label="Time">
        {slots.length === 0 ? (
          <EmptyState icon="clock" title="No times left" className="py-8">
            {day === 0 ? 'The store closes soon. Try tomorrow.' : 'The store is closed on this day.'}
          </EmptyState>
        ) : (
          <ul className="flex flex-col">
            {slots.map((s) => (
              <li key={s.minutes} className="border-b border-border-default last:border-b-0">
                <button
                  type="button"
                  role="radio"
                  aria-checked={picked === s.minutes}
                  disabled={s.full}
                  onClick={() => setPicked(s.minutes)}
                  className="flex h-12 w-full items-center gap-3 text-start disabled:cursor-not-allowed"
                >
                  <span className={cn('flex-1', s.full ? 'body-m text-text-disabled' : picked === s.minutes ? 'label-m' : 'body-m')}>
                    {clockTime(s.minutes)}
                  </span>
                  {s.full ? <span className="caption text-text-disabled">Fully booked</span> : <RadioMark checked={picked === s.minutes} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))] shadow-bar">
        <Button
          fullWidth
          disabled={picked == null}
          onClick={() => {
            if (picked == null) return
            onConfirm(day, picked)
            onClose()
          }}
        >
          {picked == null ? 'Choose a time' : `Confirm ${clockTime(picked)}`}
        </Button>
      </div>
    </div>
  )
}
