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

/** Everything the menu screens read. Bundled JSON first; lib/catalog.ts may swap in Supabase rows at boot. */
export type Catalog = {
  stores: Store[]
  storeHours: StoreHours[]
  storeServices: StoreService[]
  categories: Category[]
  items: Item[]
  modifierGroups: ModifierGroup[]
  modifiers: Modifier[]
  storeAvailability: StoreAvailability[]
  promos: Promo[]
}

export const bundledCatalog: Catalog = {
  stores: storesJson as Store[],
  storeHours: storeHoursJson as StoreHours[],
  storeServices: storeServicesJson as StoreService[],
  categories: categoriesJson as Category[],
  items: itemsJson as Item[],
  modifierGroups: modifierGroupsJson as ModifierGroup[],
  modifiers: modifiersJson as Modifier[],
  storeAvailability: storeAvailabilityJson as StoreAvailability[],
  promos: promosJson as Promo[],
}

// Containers are filled in place (never reassigned) so every import sees the live data.
export const stores: Store[] = []
export const storeHours: StoreHours[] = []
export const storeServices: StoreService[] = []
export const categories: Category[] = []
export const items: Item[] = []
export const modifierGroups: ModifierGroup[] = []
export const modifiers: Modifier[] = []
export const storeAvailability: StoreAvailability[] = []
export const promos: Promo[] = []
export const seedOrders = ordersJson as Order[]

export const storeBySlug = new Map<string, Store>()
export const storeById = new Map<string, Store>()
export const itemById = new Map<string, Item>()
export const itemBySlug = new Map<string, Item>()
export const modifierById = new Map<string, Modifier>()
export const hoursByStore = new Map<string, StoreHours[]>()
export const servicesByStore = new Map<string, StoreService[]>()
export const itemsByCategory = new Map<string, Item[]>()
export const groupsByItem = new Map<string, ModifierGroup[]>()
export const modifiersByGroup = new Map<string, Modifier[]>()

const fill = <T,>(target: T[], rows: T[]) => target.splice(0, target.length, ...rows)
const index = <T, K>(target: Map<K, T>, rows: T[], key: (r: T) => K) => {
  target.clear()
  for (const r of rows) target.set(key(r), r)
}
const groupInto = <T, K>(target: Map<K, T[]>, rows: T[], key: (r: T) => K) => {
  target.clear()
  for (const r of rows) {
    const k = key(r)
    const list = target.get(k)
    if (list) list.push(r)
    else target.set(k, [r])
  }
}

/** Replaces the catalog and rebuilds every index. Call before the app renders. */
export function applyCatalog(c: Catalog) {
  fill(stores, c.stores)
  fill(storeHours, c.storeHours)
  fill(storeServices, c.storeServices)
  fill(categories, c.categories.slice().sort((a, b) => a.sortOrder - b.sortOrder))
  fill(items, c.items)
  fill(modifierGroups, c.modifierGroups)
  fill(modifiers, c.modifiers)
  fill(storeAvailability, c.storeAvailability)
  fill(promos, c.promos)
  index(storeBySlug, stores, (s) => s.slug)
  index(storeById, stores, (s) => s.id)
  index(itemById, items, (i) => i.id)
  index(itemBySlug, items, (i) => i.slug)
  index(modifierById, modifiers, (m) => m.id)
  groupInto(hoursByStore, storeHours, (h) => h.storeId)
  groupInto(servicesByStore, storeServices, (s) => s.storeId)
  groupInto(itemsByCategory, items, (i) => i.categoryId)
  groupInto(groupsByItem, modifierGroups, (g) => g.itemId)
  groupInto(modifiersByGroup, modifiers, (m) => m.groupId)
}

applyCatalog(bundledCatalog)

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
