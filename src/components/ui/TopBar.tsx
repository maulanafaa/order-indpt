import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { cn } from '../../lib/cn'
import { IconButton } from './IconButton'

type TopBarProps = {
  title: ReactNode
  /** Back arrow, close x, or nothing. */
  leading?: 'back' | 'close' | 'none'
  /** Defaults to going back in history. */
  onLeading?: () => void
  /** Figma "Trailing": usually a ghost IconButton. */
  trailing?: ReactNode
  sticky?: boolean
  className?: string
}

/** Figma "Top bar": 56px header with a 1px bottom border. */
export function TopBar({ title, leading = 'back', onLeading, trailing, sticky = true, className }: TopBarProps) {
  const navigate = useNavigate()
  const onClick = onLeading ?? (() => navigate(-1))
  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center gap-2 border-b border-border-default bg-surface-base py-2 pe-3',
        leading === 'none' ? 'ps-4' : 'ps-3',
        sticky && 'sticky top-0 z-20',
        className,
      )}
    >
      {leading !== 'none' && (
        <IconButton icon={leading === 'back' ? 'back' : 'x'} label={leading === 'back' ? 'Back' : 'Close'} onClick={onClick} />
      )}
      <h1 className="min-w-0 flex-1 truncate title-s text-text-primary">{title}</h1>
      {trailing}
    </header>
  )
}
