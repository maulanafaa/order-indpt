import { createContext, useContext } from 'react'

export type ToastType = 'success' | 'info' | 'error'

export type ToastOptions = {
  type?: ToastType
  message: string
  showIcon?: boolean
  action?: { label: string; onClick: () => void }
  /** ms, default about 3 s. */
  duration?: number
}

export type ToastApi = {
  show: (t: ToastOptions) => void
  /** Distance from the bottom of the frame, e.g. to sit above a bottom bar. */
  setBottomOffset: (px: number) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

/** Show a toast: `useToast().show({ message: 'Added to cart' })`. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
