/**
 * Loads stores, menu, availability and promos from Supabase at boot and swaps
 * them into lib/data. Falls back to the bundled JSON when Supabase is not
 * configured, slow (over 4 s), failing, or not seeded yet (no stores).
 */
import type { Catalog } from './data'
import { applyCatalog, bundledCatalog } from './data'
import { supabase } from './supabase'

export type CatalogSource = 'supabase' | 'bundled'

type Row = Record<string, unknown>

const TIMEOUT_MS = 4000
const bundledNew = new Map(bundledCatalog.items.map((i) => [i.slug, i.isNew]))
const PAGE = 1000

/** Reads a whole table, 1000 rows at a time (the API's default cap). */
async function all(table: string, order: string): Promise<Row[]> {
  if (!supabase) return []
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').order(order).range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data as Row[]))
    if (data.length < PAGE) return rows
  }
}

const n = (v: unknown) => Number(v)
const opt = <T,>(v: T | null | undefined) => (v === null ? undefined : v)
const time = (v: unknown) => String(v).slice(0, 5) // "10:00:00" → "10:00"

async function fetchCatalog(): Promise<Catalog | null> {
  const [stores, hours, services, categories, items, groups, modifiers, availability, promos] = await Promise.all([
    all('stores', 'id'),
    all('store_hours', 'store_id'),
    all('store_services', 'store_id'),
    all('categories', 'sort_order'),
    all('items', 'id'),
    all('modifier_groups', 'sort_order'),
    all('modifiers', 'sort_order'),
    all('store_availability', 'store_id'),
    all('promos', 'code'),
  ])
  if (stores.length === 0 || items.length === 0) return null

  return {
    stores: stores.map((s) => ({
      id: String(s.id),
      slug: String(s.slug),
      name: String(s.name),
      address: String(s.address ?? ''),
      country: String(s.country ?? ''),
      lat: n(s.lat),
      lng: n(s.lng),
      phone: String(s.phone ?? ''),
      email: (s.email as string | null) ?? null,
      coverImage: String(s.cover_image),
    })),
    storeHours: hours.map((h) => ({ storeId: String(h.store_id), day: n(h.day), opens: time(h.opens), closes: time(h.closes) })),
    storeServices: services.map((s) => ({
      storeId: String(s.store_id),
      method: s.method as Catalog['storeServices'][number]['method'],
      supported: Boolean(s.supported),
      availableNow: Boolean(s.available_now),
    })),
    categories: categories.map((c) => ({ id: String(c.id), name: String(c.name), sortOrder: n(c.sort_order) })),
    items: items.map((i) => ({
      id: String(i.id),
      slug: String(i.slug),
      categoryId: String(i.category_id),
      name: String(i.name),
      description: String(i.description ?? ''),
      price: n(i.price),
      calories: i.calories === null ? null : n(i.calories),
      isBestSeller: Boolean(i.is_best_seller),
      // Older databases have no is_new column yet: fall back to the bundled flag.
      isNew: i.is_new === undefined ? (bundledNew.get(String(i.slug)) ?? false) : Boolean(i.is_new),
      allergens: (i.allergens as string[] | null) ?? [],
    })),
    modifierGroups: groups.map((g) => ({
      id: String(g.id),
      itemId: String(g.item_id),
      name: String(g.name),
      type: g.type as Catalog['modifierGroups'][number]['type'],
      min: n(g.min),
      max: n(g.max),
      required: Boolean(g.required),
    })),
    modifiers: modifiers.map((m) => ({
      id: String(m.id),
      groupId: String(m.group_id),
      name: String(m.name),
      price: n(m.price),
      maxQty: n(m.max_qty),
    })),
    storeAvailability: availability.map((a) => ({
      storeId: String(a.store_id),
      itemId: opt(a.item_id as string | null),
      modifierId: opt(a.modifier_id as string | null),
      available: Boolean(a.available),
      reason: opt(a.reason as string | null),
    })),
    promos: promos.map((p) => ({
      code: String(p.code),
      title: String(p.title),
      type: p.type as Catalog['promos'][number]['type'],
      value: n(p.value),
      maxDiscount: p.max_discount === null ? null : n(p.max_discount),
      minOrder: n(p.min_order ?? 0),
      validFrom: String(p.valid_from),
      validUntil: String(p.valid_until),
      methods: p.methods as Catalog['promos'][number]['methods'],
      freeItemId: opt(p.free_item_id as string | null),
      requiresCategoryId: opt(p.requires_category_id as string | null),
      oncePerCustomer: Boolean(p.once_per_customer),
    })) as Catalog['promos'],
  }
}

/** Resolves once the catalog is in place. Never rejects. */
export async function loadCatalog(): Promise<CatalogSource> {
  if (!supabase) return 'bundled'
  try {
    const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), TIMEOUT_MS))
    const remote = await Promise.race([fetchCatalog(), timeout])
    if (!remote) return 'bundled'
    applyCatalog(remote)
    return 'supabase'
  } catch (err) {
    console.warn('[catalog] Supabase read failed, using bundled data', err)
    return 'bundled'
  }
}
