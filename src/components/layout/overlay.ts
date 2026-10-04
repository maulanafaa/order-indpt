import { createContext, useContext } from 'react'

/**
 * The layer inside the 390px frame where sheets and toasts render, so they
 * stay inside the phone column on desktop.
 */
export const OverlayContext = createContext<HTMLElement | null>(null)

export const useOverlayRoot = () => useContext(OverlayContext)
