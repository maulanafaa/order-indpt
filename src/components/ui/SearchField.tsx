import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> & {
  value: string
  onChange: (value: string) => void
  /** Accessible name. */
  label: string
}

/** Figma "Search field": pill-shaped search input with a clear button. */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { value, onChange, label, className, placeholder = 'Search', ...rest },
  ref,
) {
  return (
    <div
      className={cn(
        'flex h-12 min-w-0 items-center gap-2.5 rounded-full bg-surface-base ps-4 pe-3 inset-ring inset-ring-border-default',
        'focus-within:inset-ring-[1.5px] focus-within:inset-ring-border-strong',
        className,
      )}
    >
      <Icon name="search" size={18} className="shrink-0 text-text-tertiary" />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent input-text text-text-primary outline-none placeholder:text-text-tertiary [&::-webkit-search-cancel-button]:hidden"
        {...rest}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-text-tertiary"
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  )
})
