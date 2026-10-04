import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayRoot } from '../layout/overlay'
import { Toast } from './Toast'
import { ToastContext, type ToastApi, type ToastOptions } from './toast'

/** Renders one toast at a time in the frame's overlay layer. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const overlay = useOverlayRoot()
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null)
  const [offset, setOffset] = useState(16)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((t: ToastOptions) => {
    window.clearTimeout(timer.current)
    setToast({ ...t, key: Date.now() })
    timer.current = window.setTimeout(() => setToast(null), t.duration ?? 3000)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const api = useMemo<ToastApi>(() => ({ show, setBottomOffset: setOffset }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {overlay &&
        toast &&
        createPortal(
          <div
            key={toast.key}
            className="pointer-events-auto absolute inset-x-4 z-50 animate-toast-in"
            style={{ bottom: `calc(${offset}px + env(safe-area-inset-bottom))` }}
          >
            <Toast
              type={toast.type}
              message={toast.message}
              showIcon={toast.showIcon}
              action={
                toast.action && {
                  label: toast.action.label,
                  onClick: () => {
                    toast.action?.onClick()
                    setToast(null)
                  },
                }
              }
            />
          </div>,
          overlay,
        )}
    </ToastContext.Provider>
  )
}
