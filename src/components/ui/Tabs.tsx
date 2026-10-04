import { useEffect, useRef, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'

export type TabItem = { id: string; label: string }

type TabsProps = {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  /** Accessible name for the tab list. */
  label: string
  className?: string
}

/**
 * Figma "Category tab", in a scrolling row. Active = text/primary with a 2px
 * black indicator; Default = text/tertiary.
 */
export function Tabs({ items, value, onChange, label, className }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
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
        'flex gap-6 overflow-x-auto border-b border-border-default bg-surface-base px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
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
              active ? 'text-text-primary' : 'text-text-tertiary',
            )}
          >
            <span>{t.label}</span>
            <span aria-hidden className={cn('h-0.5 w-full', active ? 'bg-surface-inverse' : 'bg-transparent')} />
          </button>
        )
      })}
    </div>
  )
}
