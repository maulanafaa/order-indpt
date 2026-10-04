/**
 * Signed-in user, persisted so a refresh keeps you logged in. Login is fake:
 * see lib/otp.ts for the rules. The scenario flag user=new signs you in as a
 * user with nothing saved (no name, cars or cards).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import usersJson from '../data/user.json'
import type { User } from '../data/schema'

const users = usersJson as { existing: User; new: User }

type AuthState = {
  user: User | null
  signIn: (mobile: string, kind: 'existing' | 'new') => void
  signOut: () => void
  /** Saves profile changes made at checkout (name, cars, cards). */
  updateUser: (patch: Partial<User> | ((u: User) => Partial<User>)) => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (mobile, kind) => set({ user: { ...users[kind], mobile } }),
      signOut: () => set({ user: null }),
      updateUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...(typeof patch === 'function' ? patch(s.user) : patch) } } : s)),
    }),
    { name: 'order-indpt-auth', version: 1 },
  ),
)

/** "551234567" → "55 123 4567". Accepts partial input while typing. */
export function formatMobile(digits: string) {
  const d = digits.replace(/\D/g, '').slice(0, 9)
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 9)].filter(Boolean).join(' ')
}

/** A Saudi mobile number without the country code: 9 digits starting with 5. */
export const isSaudiMobile = (digits: string) => /^5\d{8}$/.test(digits)
