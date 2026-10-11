/**
 * Signed-in user, persisted so a refresh keeps you logged in. The code check is
 * fake (lib/otp.ts), but with Supabase each number gets a real account and the
 * profile, cars and cards are saved there (lib/login.ts, lib/account.ts).
 * The scenario flag user=new gives a first-time number nothing saved.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import usersJson from '../data/user.json'
import type { User } from '../data/schema'
import { remoteSignOut, saveUser } from './account'

const users = usersJson as { existing: User; new: User }

type AuthState = {
  user: User | null
  /** The user lives in Supabase: changes are written there too. */
  remote: boolean
  /** Local only sign-in (no Supabase, or it could not be reached). */
  signIn: (mobile: string, kind: 'existing' | 'new') => void
  setUser: (user: User, remote: boolean) => void
  signOut: () => void
  /** Saves profile changes made at checkout (name, cars, cards). */
  updateUser: (patch: Partial<User> | ((u: User) => Partial<User>)) => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      remote: false,
      signIn: (mobile, kind) => set({ user: { ...users[kind], mobile }, remote: false }),
      setUser: (user, remote) => set({ user, remote }),
      signOut: () => {
        if (get().remote) void remoteSignOut()
        set({ user: null, remote: false })
      },
      updateUser: (patch) => {
        const { user: prev, remote } = get()
        if (!prev) return
        const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }
        set({ user: next })
        if (remote) void saveUser(prev, next)
      },
    }),
    {
      name: 'order-indpt-auth',
      version: 2,
      // v1 had no `remote`: those sessions were local.
      migrate: (state) => ({ ...(state as object), remote: false }) as AuthState,
    },
  ),
)

/** "551234567" → "55 123 4567". Accepts partial input while typing. */
export function formatMobile(digits: string) {
  const d = digits.replace(/\D/g, '').slice(0, 9)
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 9)].filter(Boolean).join(' ')
}

/** A Saudi mobile number without the country code: 9 digits starting with 5. */
export const isSaudiMobile = (digits: string) => /^5\d{8}$/.test(digits)
