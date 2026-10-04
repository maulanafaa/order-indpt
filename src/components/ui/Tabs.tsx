import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'

export type TabItem = { id: string; label: string }

type TabsProps = {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  /** Accessible name for the tab list. */
  label: string
  /** Tabs share the width equally (e.g. Details / Opening hours). */
  fill?: boolean
  className?: string
}

/**
 * Figma "Category tab", in a scrolling row. Active = text/primary with a 2px
 * black indicator; Default = text/tertiary.
 */
export function Tabs({ items, value, onChange, label, fill, className }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null)
  /** One indicator that slides between tabs (left offset and width in px). */
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null)
  const [animate, setAnimate] = useState(false)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const tab = list.querySelector<HTMLElement>('[aria-selected="true"]')
      if (tab) setBar({ left: tab.offsetLeft, width: tab.offsetWidth })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    return () => ro.disconnect()
  }, [value, items])

  // No slide on first paint, only when the active tab changes afterwards.
  useEffect(() => {
    if (bar && !animate) {
      const raf = requestAnimationFrame(() => setAnimate(true))
      return () => cancelAnimationFrame(raf)
    }
  }, [bar, animate])

  useEffect(() => {
    // Scroll only the tab row (scrollIntoView would also scroll the page).
    const list = listRef.current
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!list || !tab) return
    const left = tab.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft
    if (left < list.scrollLeft + 16 || left + tab.offsetWidth > list.scrollLeft + list.clientWidth - 16) {
      list.scrollTo({ left: Math.max(0, left - 16), behavior: 'smooth' })
    }
  }, [value])

  const onKeyDown = (e: KeyboardEvent) => {
    const i = items.findIndex((t) => t.id === value)
    let next = i
    if (e.key === 'ArrowRight') next = (i + 1) % items.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    else return
    e.preventDefault()
    onChange(items[next].id)
    listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'relative flex overflow-x-auto border-b border-border-default bg-surface-base [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        fill ? 'gap-0' : 'gap-6 px-4',
        className,
      )}
    >
      {items.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              'flex h-11 shrink-0 flex-col items-center gap-2.5 pt-3 label-m whitespace-nowrap transition-colors',
              fill && 'flex-1',
              active ? 'text-text-primary' : 'text-text-tertiary',
            )}
          >
            <span>{t.label}</span>
            <span aria-hidden className="h-0.5 w-full" />
          </button>
        )
      })}
      {bar && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute bottom-0 left-0 h-0.5 bg-surface-inverse motion-reduce:transition-none',
            animate && 'transition-[translate,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          )}
          style={{ width: bar.width, translate: `${bar.left}px 0` }}
        />
      )}
    </div>
  )
}
