/** Location permission (simulated, no real GPS). Persisted so the choice sticks. */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LocationFlag } from './scenarios'

type LocationState = {
  permission: LocationFlag
  setPermission: (p: LocationFlag) => void
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      permission: 'prompt',
      setPermission: (permission) => set({ permission }),
    }),
    { name: 'order-indpt-location' },
  ),
)
