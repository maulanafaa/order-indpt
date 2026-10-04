import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { FieldShell } from './Field'
import { fieldBox } from './fieldStyles'
import { Icon, type IconName } from './Icon'

export type SelectOption = {
  value: string
  label: string
  /** Small line above the label, e.g. "Today, Tue 29 Sep" (Arrival select). */
  caption?: string
  /** Shown disabled with "Unavailable", never hidden. */
  disabled?: boolean
}

type SelectProps = {
  label?: string
  options: SelectOption[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  leadingIcon?: IconName
  helper?: ReactNode
  error?: ReactNode
  disabled?: boolean
  /** Review only: draw the list open on first render. */
  defaultOpen?: boolean
  className?: string
}

/**
 * Dropdown field that opens a list. Field matches Figma Input; the open
 * state matches Figma "Arrival select" (strong border, chevron up).
 */
export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select',
  leadingIcon,
  helper,
  error,
  disabled,
  defaultOpen = false,
  className,
}: SelectProps) {
  const id = useId()
  const listId = `${id}-list`
  const helperId = `${id}-helper`
  const [open, setOpen] = useState(defaultOpen)
  const selectedIndex = options.findIndex((o) => o.value === value)
  const [active, setActive] = useState(Math.max(0, selectedIndex))
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const move = (dir: 1 | -1) => {
    let i = active
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length
      if (!options[i].disabled) break
    }
    setActive(i)
  }

  const choose = (i: number) => {
    const o = options[i]
    if (!o || o.disabled) return
    onChange(o.value)
    setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault()
        if (!open) {
          setActive(Math.max(0, selectedIndex))
          setOpen(true)
        } else move(e.key === 'ArrowDown' ? 1 : -1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open) choose(active)
        else setOpen(true)
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          setOpen(false)
        }
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <FieldShell id={id} label={label} helper={helper} error={error} helperId={helperId} className={className}>
      <div ref={rootRef} className="relative">
        <button
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
          aria-invalid={Boolean(error) || undefined}
          disabled={disabled}
          onClick={() => {
            setActive(Math.max(0, selectedIndex))
            setOpen((o) => !o)
          }}
          onKeyDown={onKeyDown}
          className={cn(
            fieldBox({ error: Boolean(error), disabled, forceFocus: open }),
            'min-h-12 py-2.5 text-start',
            selected?.caption && 'gap-3',
          )}
        >
          {leadingIcon && (
            <Icon name={leadingIcon} size={20} className={disabled ? 'text-text-disabled' : 'text-text-primary'} />
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            {selected?.caption && <span className="caption text-text-secondary">{selected.caption}</span>}
            <span
              className={cn(
                'truncate',
                selected?.caption ? 'body-m' : 'input-text',
                disabled ? 'text-text-disabled' : selected ? 'text-text-primary' : 'text-text-tertiary',
              )}
            >
              {selected ? selected.label : placeholder}
            </span>
          </span>
          <Icon
            name={open ? 'up' : 'down'}
            size={18}
            className={cn('shrink-0', disabled ? 'text-text-disabled' : 'text-text-primary')}
          />
        </button>

        {open && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={id}
            className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-4 bg-surface-base py-1 shadow-elevated inset-ring inset-ring-border-default animate-fade-in"
          >
            {options.map((o, i) => {
              const isSel = o.value === value
              return (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={o.disabled || undefined}
                  onPointerEnter={() => !o.disabled && setActive(i)}
                  onClick={() => choose(i)}
                  className={cn(
                    'flex min-h-11 items-center gap-3 px-3.5 py-2',
                    o.disabled ? 'cursor-default' : 'cursor-pointer',
                    i === active && !o.disabled && 'bg-surface-muted',
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    {o.caption && (
                      <span className={cn('caption', o.disabled ? 'text-text-disabled' : 'text-text-secondary')}>
                        {o.caption}
                      </span>
                    )}
                    <span
                      className={cn(
                        o.disabled ? 'body-m text-text-disabled' : isSel ? 'label-m text-text-primary' : 'body-m text-text-primary',
                      )}
                    >
                      {o.label}
                    </span>
                  </span>
                  {o.disabled ? (
                    <span className="caption text-text-tertiary">Unavailable</span>
                  ) : (
                    isSel && <Icon name="check" size={18} className="shrink-0 text-text-primary" />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </FieldShell>
  )
}
