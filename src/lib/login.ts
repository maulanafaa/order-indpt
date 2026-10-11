/**
 * Finishes a login once the code passed. With Supabase: real session, profile
 * (created on first login) and order history. Without it, or when it can't be
 * reached, the person is signed in locally so the prototype keeps working.
 */
import { loadOrCreateUser, fetchOrders, remoteSignIn } from './account'
import { useAuth } from './auth'
import { useOrders } from './orders'
import { supabase } from './supabase'

export async function completeSignIn(mobile: string, code: string, kind: 'existing' | 'new') {
  if (supabase) {
    try {
      await remoteSignIn(mobile, code)
      const user = await loadOrCreateUser(mobile, kind)
      useAuth.getState().setUser(user, true)
      useOrders.getState().setPlaced(await fetchOrders())
      return
    } catch (err) {
      console.warn('[login] Supabase sign-in failed, signing in on this device only', err)
    }
  }
  useAuth.getState().signIn(mobile, kind)
}
