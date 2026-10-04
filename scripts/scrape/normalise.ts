/**
 * Raw source responses -> the tables in src/data. Pure functions: no network,
 * no file system, so it can be re-run offline from the cache or fixtures.
 */
import { slugify } from '../../src/lib/format'
import type {
  Category,
  Item,
  Modifier,
  ModifierGroup,
  ModifierGroupType,
  OrderMethod,
  Store,
  StoreHours,
  StoreService,
} from '../../src/data/schema'
import {
  addOnCategories,
  bestSellers,
  categoryNames,
  defaultHours,
  groupRules,
  qlubAliases,
  storeNames,
  storeServices,
} from './overrides'
import type { QlubModifierGroup, QlubProduct, QlubProductDetail, RawBundle } from './raw'

export type Tables = {
  stores: Store[]
  storeHours: StoreHours[]
  storeServices: StoreService[]
  categories: Category[]
  items: Item[]
  modifierGroups: ModifierGroup[]
  modifiers: Modifier[]
}

export type NormaliseResult = { tables: Tables; warnings: string[]; notes: string[] }

/** Comparable form of a product name: "Truffle Beef Slider -Double" -> "truffle beef slider double". */
export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase())

/** "Truffle Beef Slider -Double" -> "Truffle Beef Slider - Double" */
function cleanItemName(name: string): string {
  return name.replace(/\s+/g, ' ').replace(/\s-(?=\S)/g, ' - ').trim()
}

function cleanStoreName(name: string): string {
  const mapped = storeNames[name.trim()]
  if (mapped) return mapped
  let n = name.replace(/\s+/g, ' ').trim()
  n = n.replace(/^salt\b/i, 'SALT')
  if (!/^SALT\b/.test(n)) n = `SALT ${n}`
  return n
}

/** "Add Extra:" -> "Add extra" */
function cleanGroupName(name: string): string {
  const n = name.replace(/:\s*$/, '').trim()
  // Sentence case, but keep the capital after ? or ! ("Hungry? Go all the way!").
  const lower = n.replace(/(?<![?!.]\s)\b([A-Z])([a-z])/g, (_, a: string, b: string) => a.toLowerCase() + b)
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** Collapse whitespace and drop trailing full stops. */
const cleanText = (s: string) => s.replace(/\s+/g, ' ').trim()

const isPlusCode = (s: string) => /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,}/i.test(s.trim())

/** Most common value; ties go to the lowest. */
function mode(values: number[]): number {
  const counts = new Map<number, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
}

const hhmm = (t: string) => t.slice(0, 5)
const secToHHmm = (s: number) => {
  const m = Math.round(s / 60)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function uniqueSlug(base: string, taken: Set<string>, suffix: string): string {
  let s = base || suffix
  if (taken.has(s)) s = `${base}-${suffix}`
  taken.add(s)
  return s
}

export function normalise(raw: RawBundle): NormaliseResult {
  const warnings: string[] = []
  const notes: string[] = []

  /* -------------------------------- stores ------------------------------- */
  const stores: Store[] = []
  const storeSlugs = new Set<string>()
  const storeIdByLoc = new Map<number, string>()
  for (const loc of raw.locations.filter((l) => l.is_active)) {
    const id = `store-${loc.id}`
    const name = cleanStoreName(loc.name)
    const slug = uniqueSlug(slugify(name), storeSlugs, String(loc.id))
    const branch = raw.indpt[String(loc.id)]?.settings.branch
    let address = cleanText((loc.address ?? '').replace(/\s*[\r\n]+\s*/g, ', '))
      .replace(/\.(?=,)/g, '')
      .replace(/,(\s*,)+/g, ',')
      .replace(/\.$/, '')
    if ((!address || isPlusCode(address)) && branch?.address) address = branch.address.trim().replace(/\.$/, '')
    stores.push({
      id,
      slug,
      name,
      address,
      country: (loc.city ?? '').trim(),
      lat: Number(loc.latitude),
      lng: Number(loc.longitude),
      phone: (loc.phone ?? branch?.phone_number ?? '').replace(/\D/g, ''),
      email: loc.email?.trim() || null,
      coverImage: `/images/stores/${slug}.webp`,
    })
    storeIdByLoc.set(loc.id, id)
  }

  /* ---------------------------- store hours ------------------------------ */
  const storeHours: StoreHours[] = []
  let defaulted = 0
  for (const [locId, storeId] of storeIdByLoc) {
    const store = stores.find((s) => s.id === storeId)!
    const indpt = raw.indpt[String(locId)]
    const qlub = raw.qlubMenus[String(locId)]
    const rows: StoreHours[] = []

    if (indpt?.menu.operating_hours?.schedule?.length) {
      for (const d of indpt.menu.operating_hours.schedule) {
        if (!d.is_open || !d.open_time || !d.close_time) continue
        let opens = hhmm(d.open_time)
        let closes = hhmm(d.close_time)
        if (opens === closes) {
          opens = '00:00'
          closes = '24:00'
        } else if (d.is_next_day_close && closes > opens) {
          warnings.push(`${store.name}: day ${d.day_of_week} closes ${closes} the next day, which looks wrong. Kept as is.`)
        }
        rows.push({ storeId, day: d.day_of_week, opens, closes })
      }
    } else if (qlub) {
      // qlub: seconds from midnight per weekday, using the menu with the most slots.
      // A slot starting at 0 on the next day extends the previous night.
      const slots = [...qlub.menus]
        .map((m) => (m.availabilities ?? []).filter((a) => a.active !== false))
        .sort((a, b) => b.length - a.length)[0] ?? []
      for (let day = 0; day < 7; day++) {
        const main = slots.filter((a) => a.dow === day && a.start > 0).sort((a, b) => a.start - b.start)
        const allDay = slots.find((a) => a.dow === day && a.start === 0 && a.end >= 86340)
        if (allDay) {
          rows.push({ storeId, day, opens: '00:00', closes: '24:00' })
          continue
        }
        if (!main.length) continue
        const opens = secToHHmm(main[0].start)
        let closes = secToHHmm(Math.max(...main.map((a) => a.end)))
        const lastEnd = Math.max(...main.map((a) => a.end))
        if (lastEnd >= 86340) {
          const after = slots.find((a) => a.dow === (day + 1) % 7 && a.start === 0)
          closes = after ? secToHHmm(after.end) : '24:00'
        }
        rows.push({ storeId, day, opens, closes })
      }
    }

    if (!rows.length) {
      defaulted++
      for (let day = 0; day < 7; day++) rows.push({ storeId, day, ...defaultHours })
    }
    storeHours.push(...rows)
  }
  if (defaulted)
    notes.push(`${defaulted} stores have no hours in any source (no ordering link), so they use ${defaultHours.opens}-${defaultHours.closes}.`)

  /* --------------------------- store services ---------------------------- */
  const methods: OrderMethod[] = ['pickup', 'carhop', 'dineIn']
  const services: StoreService[] = []
  for (const store of stores) {
    const rule = storeServices[store.slug] ?? {}
    for (const method of methods) {
      const r = rule[method] ?? { supported: true, availableNow: true }
      services.push({ storeId: store.id, method, supported: r.supported, availableNow: r.supported && r.availableNow })
    }
  }
  for (const slug of Object.keys(storeServices)) {
    if (!storeSlugs.has(slug)) warnings.push(`overrides.storeServices: no store with slug "${slug}"`)
  }

  /* ---------------------------- KSA menu --------------------------------- */
  type Seen = { names: string[]; prices: number[]; categoryId: number; sort: number[] }
  const byOracle = new Map<number, Seen>()
  const addOnPrices = new Map<string, number[]>()
  const catSeen = new Map<number, { name: string; sort: number[]; firstSeen: number }>()
  let order = 0
  const addOnCats = new Set(addOnCategories.map((c) => c.toUpperCase()))

  for (const { menu } of Object.values(raw.indpt)) {
    for (const cat of menu.categories) {
      const isAddOn = addOnCats.has(cat.name.toUpperCase())
      for (const it of cat.items) {
        const name = cleanItemName(it.name['en-US'] ?? Object.values(it.name)[0] ?? '')
        const price = Number(it.base_price)
        const key = nameKey(name)
        addOnPrices.set(key, [...(addOnPrices.get(key) ?? []), price])
        if (isAddOn) continue
        const s = byOracle.get(it.oracle_menu_item_id) ?? { names: [], prices: [], categoryId: cat.id, sort: [] }
        s.names.push(name)
        s.prices.push(price)
        s.sort.push(it.sort_order ?? 999)
        byOracle.set(it.oracle_menu_item_id, s)
      }
      if (isAddOn) continue
      const c = catSeen.get(cat.id) ?? { name: cat.name, sort: [], firstSeen: order++ }
      c.sort.push(cat.sort_order ?? 999)
      catSeen.set(cat.id, c)
    }
  }

  const categories: Category[] = [...catSeen.entries()]
    .sort((a, b) => Math.min(...a[1].sort) - Math.min(...b[1].sort) || a[1].firstSeen - b[1].firstSeen)
    .map(([id, c], i) => ({
      id: `cat-${id}`,
      name: categoryNames[c.name] ?? titleCase(c.name),
      sortOrder: i + 1,
    }))
  const catOrder = new Map(categories.map((c) => [c.id, c.sortOrder]))

  /* ------------------------- qlub enrichment ----------------------------- */
  const qlubByKey = new Map<string, { product: QlubProduct; detail?: QlubProductDetail }>()
  for (const ref of raw.qlubReference) {
    for (const p of ref.products) {
      const key = nameKey(p.name)
      const detail = ref.details[p.id]
      const existing = qlubByKey.get(key)
      const better = (a: QlubProduct) => (a.status === 'DISABLED' ? 0 : 2) + (Number(a.price) > 0 ? 1 : 0)
      if (!existing || better(p) > better(existing.product) || (!existing.detail && detail)) {
        qlubByKey.set(key, { product: p, detail: detail ?? existing?.detail })
      }
    }
  }
  // Details are fetched once per name, possibly from another store; attach by name.
  const detailByKey = new Map<string, QlubProductDetail>()
  for (const ref of raw.qlubReference) for (const d of Object.values(ref.details)) detailByKey.set(nameKey(d.name), d)

  const detailFor = (q: { product: QlubProduct; detail?: QlubProductDetail } | undefined) =>
    q ? (q.detail ?? detailByKey.get(nameKey(q.product.name))) : undefined

  const allergensOf = (p: QlubProduct) => {
    const tags = Array.isArray(p.tags) ? p.tags : Object.values(p.tags ?? {})
    return [...new Set(tags.filter((t) => (t.group ?? '').toUpperCase() === 'ALLERGEN').map((t) => t.name))].sort()
  }

  /* -------------------------------- items -------------------------------- */
  const items: Item[] = []
  const modifierGroups: ModifierGroup[] = []
  const modifiers: Modifier[] = []
  const itemSlugs = new Set<string>()
  const bestKeys = new Set(bestSellers.map(nameKey))
  const foundBest = new Set<string>()
  let matched = 0
  let withAddOns = 0
  let priceFromKsa = 0
  let priceFromQlub = 0
  const priceVaries: string[] = []

  const sortedOracle = [...byOracle.entries()].sort((a, b) => {
    const ca = catOrder.get(`cat-${a[1].categoryId}`) ?? 999
    const cb = catOrder.get(`cat-${b[1].categoryId}`) ?? 999
    return ca - cb || Math.min(...a[1].sort) - Math.min(...b[1].sort) || a[1].names[0].localeCompare(b[1].names[0])
  })

  for (const [oracleId, s] of sortedOracle) {
    const id = `item-${oracleId}`
    const name = s.names[0]
    const key = nameKey(name)
    const price = mode(s.prices)
    if (new Set(s.prices).size > 1) priceVaries.push(name)
    const q = qlubByKey.get(nameKey(qlubAliases[name] ?? name)) ?? qlubByKey.get(key)
    if (q) matched++
    if (bestKeys.has(key)) foundBest.add(key)

    items.push({
      id,
      slug: uniqueSlug(slugify(name), itemSlugs, String(oracleId)),
      categoryId: `cat-${s.categoryId}`,
      name,
      description: cleanText(detailFor(q)?.description ?? q?.product.description ?? ''),
      price,
      calories: null,
      isBestSeller: bestKeys.has(key),
      allergens: q ? allergensOf(detailFor(q) ?? q.product) : [],
    })

    const detail = detailFor(q)
    const groups = (detail?.modifierGroups ?? [])
      .filter((g) => g.status !== 'DISABLED')
      .map((g) =>
        // qlub's "Remove" lists sometimes repeat paid extras; keep only the "No ..." options there.
        /^remove/i.test(g.name) ? { ...g, products: g.products.filter((m) => /^no\b/i.test(m.name.trim())) } : g,
      )
      .filter((g) => g.products.length)
    if (groups.length) withAddOns++
    const groupSlugs = new Set<string>()
    groups.forEach((g: QlubModifierGroup) => {
      const rule = groupRules[cleanGroupName(g.name)] ?? {}
      const groupName = rule.name ?? cleanGroupName(g.name)
      const groupSlug = uniqueSlug(slugify(groupName), groupSlugs, g.id.toLowerCase())
      const groupId = `grp-${oracleId}-${groupSlug}`
      const n = g.products.length
      const qMax = g.max ?? 0
      let multiMax = g.multiMax ?? 0
      let type: ModifierGroupType = qMax === 1 ? 'single' : multiMax > 1 ? 'stepper' : 'multi'
      if (rule.stepperMaxQty) {
        type = 'stepper'
        multiMax = rule.stepperMaxQty
      }
      // qlub max 0 means "no limit": cap at every option (times the per-option max for steppers).
      const max = qMax > 0 ? qMax : type === 'stepper' ? n * multiMax : n
      const min = Math.min(g.min ?? 0, max)
      modifierGroups.push({ id: groupId, itemId: id, name: groupName, type, min, max, required: min > 0 })

      const modSlugs = new Set<string>()
      for (const m of g.products) {
        const modName = cleanItemName(m.name)
        const ksa = addOnPrices.get(nameKey(modName))
        const modPrice = ksa ? mode(ksa) : Number(m.price)
        if (Number(m.price) > 0) {
          if (ksa) priceFromKsa++
          else priceFromQlub++
        }
        modifiers.push({
          id: `mod-${oracleId}-${groupSlug}-${uniqueSlug(slugify(modName), modSlugs, m.id.toLowerCase())}`,
          groupId,
          name: modName,
          price: modPrice,
          maxQty: type === 'stepper' ? Math.max(1, multiMax) : 1,
        })
      }
    })
  }

  for (const b of bestSellers) if (!foundBest.has(nameKey(b))) warnings.push(`overrides.bestSellers: no item named "${b}"`)
  notes.push(`${matched} of ${items.length} items matched a qlub product (description, allergens); ${withAddOns} have add-ons.`)
  notes.push(`Add-on prices: ${priceFromKsa} from KSA menus (SAR), ${priceFromQlub} from qlub (UAE, no KSA match).`)
  if (priceVaries.length) notes.push(`${priceVaries.length} items cost different amounts at different stores; items.json uses the most common price.`)
  notes.push('No source has calories, so calories are null.')

  return {
    tables: {
      stores,
      storeHours,
      storeServices: services,
      categories,
      items,
      modifierGroups,
      modifiers,
    },
    warnings,
    notes,
  }
}
