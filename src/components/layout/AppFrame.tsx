import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { ToastProvider } from '../ui/ToastProvider'
import { OverlayContext } from './overlay'

/**
 * Mobile frame: a 390px column centred on a grey surround on desktop, full
 * width on phones. Pages scroll inside `[data-scroll-root]`; sheets and
 * toasts render in the overlay layer on top of it.
 */
export function AppFrame() {
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  // New page starts at the top (query changes such as ?item= keep the position).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [pathname])
  return (
    <div className="flex h-dvh justify-center bg-surface-muted">
      <div className="relative isolate h-full w-full overflow-clip bg-surface-base min-[480px]:w-[390px] min-[480px]:border-x min-[480px]:border-border-default">
        <OverlayContext.Provider value={overlay}>
          <ToastProvider>
            <div ref={scrollRef} data-scroll-root className="h-full overflow-x-hidden overflow-y-auto overscroll-contain">
              <Outlet />
            </div>
          </ToastProvider>
        </OverlayContext.Provider>
        <div ref={setOverlay} className="pointer-events-none absolute inset-0 z-40" />
      </div>
    </div>
  )
}
