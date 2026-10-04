/**
 * Typed access to src/data. The JSON is validated by `npm run scrape`, so it
 * is only cast here. Everything the screens need is indexed once.
 */
import categoriesJson from '../data/categories.json'
import itemsJson from '../data/items.json'
import modifierGroupsJson from '../data/modifierGroups.json'
import modifiersJson from '../data/modifiers.json'
import storeAvailabilityJson from '../data/storeAvailability.json'
import storeHoursJson from '../data/storeHours.json'
import storeServicesJson from '../data/storeServices.json'
import storesJson from '../data/stores.json'
import promosJson from '../data/promos.json'
import ordersJson from '../data/orders.json'
import type {
  Category,
  Item,
  Modifier,
  ModifierGroup,
  Order,
  OrderMethod,
  Promo,
  Store,
  StoreAvailability,
  StoreHours,
  StoreService,
} from '../data/schema'

export const stores = storesJson as Store[]
export const storeHours = storeHoursJson as StoreHours[]
export const storeServices = storeServicesJson as StoreService[]
export const categories = (categoriesJson as Category[]).slice().sort((a, b) => a.sortOrder - b.sortOrder)
export const items = itemsJson as Item[]
export const modifierGroups = modifierGroupsJson as ModifierGroup[]
export const modifiers = modifiersJson as Modifier[]
export const storeAvailability = storeAvailabilityJson as StoreAvailability[]
export const promos = promosJson as Promo[]
export const seedOrders = ordersJson as Order[]

const groupBy = <T, K>(rows: T[], key: (r: T) => K) => {
  const m = new Map<K, T[]>()
  for (const r of rows) {
    const k = key(r)
    const list = m.get(k)
    if (list) list.push(r)
    else m.set(k, [r])
  }
  return m
}

export const storeBySlug = new Map(stores.map((s) => [s.slug, s]))
export const storeById = new Map(stores.map((s) => [s.id, s]))
export const itemById = new Map(items.map((i) => [i.id, i]))
export const itemBySlug = new Map(items.map((i) => [i.slug, i]))
export const modifierById = new Map(modifiers.map((m) => [m.id, m]))
export const hoursByStore = groupBy(storeHours, (h) => h.storeId)
export const servicesByStore = groupBy(storeServices, (s) => s.storeId)
export const itemsByCategory = groupBy(items, (i) => i.categoryId)
export const groupsByItem = groupBy(modifierGroups, (g) => g.itemId)
export const modifiersByGroup = groupBy(modifiers, (m) => m.groupId)

export const methodLabels: Record<OrderMethod, string> = {
  pickup: 'Pickup',
  carhop: 'Carhop',
  dineIn: 'Dine-in',
}

/** Methods the branch supports (unsupported ones are hidden, paused ones shown disabled). */
export function supportedServices(storeId: string): StoreService[] {
  const order: OrderMethod[] = ['pickup', 'carhop', 'dineIn']
  return (servicesByStore.get(storeId) ?? [])
    .filter((s) => s.supported)
    .sort((a, b) => order.indexOf(a.method) - order.indexOf(b.method))
}

/** Sold out items and unavailable add-ons for one store. */
export function availabilityFor(storeId: string) {
  const rows = storeAvailability.filter((a) => a.storeId === storeId && !a.available)
  return {
    soldOutItems: new Set(rows.flatMap((r) => (r.itemId ? [r.itemId] : []))),
    unavailableModifiers: new Set(rows.flatMap((r) => (r.modifierId ? [r.modifierId] : []))),
  }
}

export const isCustomisable = (itemId: string) => (groupsByItem.get(itemId)?.length ?? 0) > 0
