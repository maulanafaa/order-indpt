/**
 * Signed-in data in Supabase: phone login (edge function phone-login), the
 * profile with cars and cards, and orders. Every call is best effort: the app
 * keeps its local copy, so a failed write never blocks the person.
 */
import usersJson from '../data/user.json'
import type { Car, Order, PaymentMethod, User } from '../data/schema'
import { supabase } from './supabase'

const templates = usersJson as { existing: User; new: User }

type Row = Record<string, unknown>

/** Fake OTP against a real account: the function returns a one-time token, exchanged here for a session. */
export async function remoteSignIn(mobile: string, code: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke<{ token_hash: string; created: boolean }>('phone-login', {
    body: { mobile, code },
  })
  if (error || !data?.token_hash) throw error ?? new Error('phone-login returned no token')
  const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
  if (otpError) throw otpError
}

const toCar = (r: Row): Car => ({
  id: String(r.id),
  make: String(r.make),
  model: String(r.model ?? ''),
  colour: String(r.colour ?? ''),
  plate: String(r.plate),
  isDefault: Boolean(r.is_default),
})

const toCard = (r: Row): PaymentMethod => ({
  id: String(r.id),
  brand: r.brand as PaymentMethod['brand'],
  ...(r.last4 ? { last4: String(r.last4) } : {}),
  ...(r.bank ? { bank: String(r.bank) } : {}),
  ...(r.expiry ? { expiry: String(r.expiry) } : {}),
  isDefault: Boolean(r.is_default),
})

const carRow = (userId: string, c: Car) => ({
  user_id: userId,
  id: c.id,
  make: c.make,
  model: c.model,
  colour: c.colour,
  plate: c.plate,
  is_default: c.isDefault,
})

const cardRow = (userId: string, p: PaymentMethod) => ({
  user_id: userId,
  id: p.id,
  brand: p.brand,
  last4: p.last4 ?? null,
  bank: p.bank ?? null,
  expiry: p.expiry ?? null,
  is_default: p.isDefault,
})

const profileRow = (u: User) => ({
  id: u.id,
  name: u.name,
  mobile: u.mobile,
  email: u.email,
  email_verified: u.emailVerified,
  city: u.city,
  member_since: u.memberSince,
  favourite_store_id: u.favouriteStoreId,
})

/**
 * Loads the signed-in profile. A first login creates it: `existing` gets the
 * demo profile (Noura's name, cars and cards), `new` an empty one.
 */
export async function loadOrCreateUser(mobile: string, kind: 'existing' | 'new'): Promise<User> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data: auth } = await supabase.auth.getUser()
  const id = auth.user?.id
  if (!id) throw new Error('No session')

  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  if (error) throw error

  if (!profile) {
    const t = templates[kind]
    const user: User = { ...t, id, mobile, memberSince: new Date().toISOString().slice(0, 10) }
    const { error: insertError } = await supabase.from('profiles').insert(profileRow(user))
    if (insertError) throw insertError
    if (user.cars.length) await supabase.from('cars').insert(user.cars.map((c) => carRow(id, c)))
    if (user.paymentMethods.length) await supabase.from('payment_methods').insert(user.paymentMethods.map((p) => cardRow(id, p)))
    return user
  }

  const [cars, cards] = await Promise.all([
    supabase.from('cars').select('*').order('is_default', { ascending: false }),
    supabase.from('payment_methods').select('*').order('is_default', { ascending: false }),
  ])
  return {
    id,
    name: String(profile.name ?? ''),
    mobile: String(profile.mobile),
    email: profile.email ?? null,
    emailVerified: Boolean(profile.email_verified),
    city: profile.city ?? null,
    memberSince: String(profile.member_since),
    favouriteStoreId: profile.favourite_store_id ?? null,
    cars: ((cars.data ?? []) as Row[]).map(toCar),
    paymentMethods: ((cards.data ?? []) as Row[]).map(toCard),
  }
}

/** Writes what changed between two versions of the profile. */
export async function saveUser(prev: User, next: User) {
  if (!supabase) return
  const db = supabase
  const jobs: PromiseLike<{ error: unknown }>[] = []
  const changed = (k: keyof User) => JSON.stringify(prev[k]) !== JSON.stringify(next[k])

  if ((['name', 'email', 'emailVerified', 'city', 'favouriteStoreId'] as const).some(changed)) {
    const { id, ...fields } = profileRow(next)
    jobs.push(db.from('profiles').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id))
  }
  const sync = <T extends { id: string }>(table: string, before: T[], after: T[], row: (t: T) => Row) => {
    const gone = before.filter((b) => !after.some((a) => a.id === b.id)).map((b) => b.id)
    if (gone.length) jobs.push(db.from(table).delete().eq('user_id', next.id).in('id', gone))
    const upserts = after.filter((a) => JSON.stringify(a) !== JSON.stringify(before.find((b) => b.id === a.id)))
    if (upserts.length) jobs.push(db.from(table).upsert(upserts.map(row)))
  }
  if (changed('cars')) sync('cars', prev.cars, next.cars, (c) => carRow(next.id, c))
  if (changed('paymentMethods')) sync('payment_methods', prev.paymentMethods, next.paymentMethods, (p) => cardRow(next.id, p))

  for (const { error } of await Promise.all(jobs)) if (error) console.warn('[account] save failed', error)
}

const orderRow = (o: Order) => ({
  id: o.id,
  user_id: o.userId,
  store_id: o.storeId,
  method: o.method,
  status: o.status,
  placed_at: o.placedAt,
  completed_at: o.completedAt,
  items: o.items,
  subtotal: o.subtotal,
  discount: o.discount,
  total: o.total,
  promo_code: o.promoCode,
  payment_method_id: o.paymentMethodId,
  payment_label: o.paymentLabel ?? null,
  car_id: o.carId,
  ready_at: o.readyAt ?? null,
  scheduled: o.scheduled ?? false,
  note: o.note ?? null,
  refund: o.refund,
  timeline: o.timeline,
})

const toOrder = (r: Row): Order => ({
  id: String(r.id),
  userId: String(r.user_id),
  storeId: String(r.store_id),
  method: r.method as Order['method'],
  status: r.status as Order['status'],
  placedAt: String(r.placed_at),
  completedAt: (r.completed_at as string | null) ?? null,
  items: r.items as Order['items'],
  subtotal: Number(r.subtotal),
  discount: Number(r.discount),
  total: Number(r.total),
  promoCode: (r.promo_code as string | null) ?? null,
  paymentMethodId: String(r.payment_method_id),
  ...(r.payment_label ? { paymentLabel: String(r.payment_label) } : {}),
  carId: (r.car_id as string | null) ?? null,
  ...(r.ready_at ? { readyAt: String(r.ready_at) } : {}),
  scheduled: Boolean(r.scheduled),
  ...(r.note ? { note: String(r.note) } : {}),
  refund: (r.refund as Order['refund']) ?? null,
  timeline: (r.timeline as Order['timeline']) ?? [],
})

export async function saveOrder(order: Order) {
  if (!supabase) return
  const { error } = await supabase.from('orders').insert(orderRow(order))
  if (error) console.warn('[account] order not saved', error)
}

/** The signed-in person's orders, newest first. */
export async function fetchOrders(): Promise<Order[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('orders').select('*').order('placed_at', { ascending: false })
  if (error) {
    console.warn('[account] orders not loaded', error)
    return []
  }
  return (data as Row[]).map(toOrder)
}

export async function remoteSignOut() {
  await supabase?.auth.signOut()
}
