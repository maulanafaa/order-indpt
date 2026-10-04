import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'
import { useOverlayRoot } from '../layout/overlay'
import { IconButton } from './IconButton'

type BottomSheetProps = {
  open: boolean
  onClose: () => void
  /** Header title. Without one the sheet shows a grab handle instead. */
  title?: ReactNode
  /** Product names use Product/L; other sheets use Title/M. */
  titleStyle?: 'title' | 'product'
  /** Shows a back arrow at the start of the header (multi-step sheets). */
  onBack?: () => void
  /** Sticky area under the content, e.g. the main button. */
  footer?: ReactNode
  /** Close when the overlay is tapped. Default true. */
  dismissible?: boolean
  /** Accessible name when there is no visible title. */
  ariaLabel?: string
  /**
   * Render only the panel: no header, handle or padding. The children own
   * their scrolling and close button (used by the item sheet).
   */
  bare?: boolean
  className?: string
  children: ReactNode
}

const EXIT_MS = 450

/**
 * Bottom sheet from the Figma screens: no corner radius, black 55% overlay,
 * slides up, close button top right, optional back arrow.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  titleStyle = 'title',
  onBack,
  footer,
  dismissible = true,
  ariaLabel,
  bare = false,
  className,
  children,
}: BottomSheetProps) {
  const overlay = useOverlayRoot()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(open)
  const [leaving, setLeaving] = useState(false)

  // Keep the sheet mounted for its exit animation.
  if (open && !mounted) {
    setMounted(true)
    setLeaving(false)
  }
  if (!open && mounted && !leaving) setLeaving(true)

  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(() => {
      setMounted(false)
      setLeaving(false)
    }, EXIT_MS)
    return () => window.clearTimeout(t)
  }, [leaving])

  // Escape to close, focus the panel, lock the page scroll behind.
  useEffect(() => {
    if (!open) return
    const scrollRoot = overlay?.parentElement?.querySelector<HTMLElement>('[data-scroll-root]')
    const prevOverflow = scrollRoot?.style.overflowY
    if (scrollRoot) scrollRoot.style.overflowY = 'hidden'
    const prevFocus = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (scrollRoot) scrollRoot.style.overflowY = prevOverflow ?? ''
      prevFocus?.focus?.()
    }
  }, [open, onClose, overlay])

  if (!overlay || !mounted) return null

  const hasHeader = Boolean(title) || Boolean(onBack)

  return createPortal(
    <div className="pointer-events-auto absolute inset-0 z-40">
      <div
        aria-hidden
        onClick={dismissible ? onClose : undefined}
        className={cn(
          'absolute inset-0 bg-overlay transition-opacity duration-[450ms] ease-sheet',
          leaving ? 'opacity-0' : 'animate-fade-in',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        className={cn(
          'absolute inset-x-0 bottom-0 flex max-h-[92%] flex-col bg-surface-base outline-none',
          'transition-transform duration-[450ms] ease-sheet motion-reduce:transition-none',
          leaving ? 'translate-y-full' : 'animate-sheet-in',
          className,
        )}
      >
        {bare ? (
          children
        ) : hasHeader ? (
          <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border-default px-6">
            {onBack ? (
              <IconButton icon="back" label="Back" variant="ghost" size={32} onClick={onBack} />
            ) : (
              <span aria-hidden className="size-8 shrink-0" />
            )}
            <h2
              id={titleId}
              className={cn(
                'min-w-0 flex-1 truncate text-center text-text-primary',
                titleStyle === 'product' ? 'product-l' : 'title-m',
              )}
            >
              {title}
            </h2>
            <IconButton icon="x" label="Close" variant="outline" size={32} onClick={onClose} />
          </div>
        ) : (
          <div className="relative flex h-10 shrink-0 justify-center pt-2.5">
            <span aria-hidden className="h-1 w-9 rounded-2 bg-border-default" />
            <IconButton
              icon="x"
              label="Close"
              variant="outline"
              size={32}
              onClick={onClose}
              className="absolute end-4 top-3"
            />
          </div>
        )}
        {!bare && (
          <div className={cn('min-h-0 flex-1 overflow-y-auto px-4', hasHeader ? 'pt-4' : 'pt-2', footer ? 'pb-4' : 'pb-8')}>
            {children}
          </div>
        )}
        {!bare && footer && <div className="shrink-0 bg-surface-base px-4 pt-3 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-bar">{footer}</div>}
      </div>
    </div>,
    overlay,
  )
}
