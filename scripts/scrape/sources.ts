/** Fetches every source and returns the raw bundle (no normalising here). */
import { config } from './config'
import { getJson, getText, pool } from './http'
import { nameKey } from './normalise'
import type { RawBundleInput } from './raw'

type Log = (msg: string) => void

type Loc = { id: number; name: string; order_url: string | null; is_active: boolean }

/** The locator page embeds every store as `const locations = [...];`. */
export async function fetchLocations(): Promise<Loc[]> {
  const html = await getText(config.locatorUrl)
  const m = html.match(/const\s+locations\s*=\s*(\[[\s\S]*?\]);\s*\n/)
  if (!m) throw new Error('Could not find `const locations = [...]` on the store locator page. The page has changed.')
  return JSON.parse(m[1]) as Loc[]
}

/** order.indpt.com/{slug}/{branchId} -> { slug, branchId } */
export function parseIndptUrl(url: string) {
  const u = new URL(url)
  if (!u.host.endsWith('indpt.com')) return null
  const [slug, branchId] = u.pathname.split('/').filter(Boolean)
  return slug && branchId ? { slug, branchId } : null
}

/** app.qlub.io/qr/{cc}/{restaurant}/.../{hash}/qsr?... -> { country, path } */
export function parseQlubUrl(url: string) {
  const u = new URL(url)
  if (!u.host.endsWith('qlub.io')) return null
  const parts = u.pathname.split('/').filter(Boolean)
  const start = parts.indexOf('qr')
  const end = parts.indexOf('qsr')
  if (start < 0) return null
  const topo = parts.slice(start + 1, end > start ? end : undefined)
  return topo.length >= 2 ? { country: topo[0], path: topo.join('/') } : null
}

const qlubHeaders = { origin: 'https://app.qlub.io', referer: 'https://app.qlub.io/' }

async function qlub<T>(country: string, path: string, rest: string): Promise<T> {
  const res = await getJson<{ data: T }>(`${config.qlubApi(country)}/v1/menu/${path}/${rest}`, qlubHeaders)
  return res.data
}

type QlubMenu = { id: string; categories: { id: string }[] }
type QlubPage = { products: { id: string; name: string; hasAdditives?: boolean }[]; hasMorePage?: boolean; scrollId?: number }

async function qlubCategoryProducts(country: string, path: string, menuId: string, catId: string) {
  const out: QlubPage['products'] = []
  let scrollId: number | undefined
  for (let page = 0; page < 20; page++) {
    const q = scrollId !== undefined ? `?scrollId=${scrollId}` : ''
    const data = await qlub<QlubPage>(country, path, `${menuId}/category/${catId}${q}`)
    out.push(...data.products)
    if (!data.hasMorePage || data.scrollId === undefined || data.scrollId === scrollId) break
    scrollId = data.scrollId
  }
  return out
}

export async function fetchAll(log: Log): Promise<RawBundleInput> {
  log('Store locator...')
  const locations = await fetchLocations()
  const active = locations.filter((l) => l.is_active)
  log(`  ${locations.length} stores (${active.length} active)`)

  const bundle: RawBundleInput = {
    fetchedAt: new Date().toISOString(),
    locations: locations as RawBundleInput['locations'],
    indpt: {},
    qlubMenus: {},
    qlubReference: [],
  }

  const indptStores = active.flatMap((l) => {
    const p = l.order_url ? parseIndptUrl(l.order_url) : null
    return p ? [{ loc: l, ...p }] : []
  })
  log(`order.indpt.com: ${indptStores.length} stores...`)
  await pool(indptStores, async ({ loc, slug, branchId }) => {
    const base = `${config.indptOrigin}/api/proxy`
    const referer = { referer: `${config.indptOrigin}/${slug}/${branchId}` }
    const settings = await getJson<{ data: unknown }>(`${base}/settings/${slug}/${branchId}`, referer)
    const menu = await getJson<{ data: unknown }>(`${base}/menu/${slug}/${branchId}`, referer)
    bundle.indpt[String(loc.id)] = {
      orderUrl: loc.order_url!,
      settings: settings.data as never,
      menu: menu.data as never,
    }
    log(`  ${loc.name}`)
  })

  const qlubStores = active.flatMap((l) => {
    const p = l.order_url ? parseQlubUrl(l.order_url) : null
    return p ? [{ loc: l, ...p }] : []
  })
  log(`qlub: ${qlubStores.length} stores (opening hours)...`)
  await pool(qlubStores, async ({ loc, country, path }) => {
    try {
      const menus = await qlub<unknown[]>(country, path, 'menu')
      bundle.qlubMenus[String(loc.id)] = { orderUrl: loc.order_url!, menus: menus as never }
    } catch (e) {
      log(`  ! ${loc.name}: ${(e as Error).message}`)
    }
  })

  // Reference stores: products + details (descriptions, allergens, add-ons).
  const seen = new Set<string>()
  for (const refId of config.qlubReferenceStoreIds) {
    const ref = qlubStores.find((s) => s.loc.id === refId)
    if (!ref) {
      log(`  ! Reference store ${refId} has no qlub link, skipped`)
      continue
    }
    log(`qlub reference: ${ref.loc.name}...`)
    const menus = (bundle.qlubMenus[String(refId)]?.menus ?? []) as unknown as QlubMenu[]
    const pairs = menus.flatMap((m) => m.categories.map((c) => ({ menuId: m.id, catId: c.id })))
    const pages = await pool(pairs, ({ menuId, catId }) =>
      qlubCategoryProducts(ref.country, ref.path, menuId, catId).then((ps) => ps.map((p) => ({ ...p, menuId }))),
    )
    const products = pages.flat()
    // The category list cuts descriptions at 80 characters, so read each product's
    // detail (full description and add-ons). Once per product name across stores.
    const toDetail = products.filter((p) => !seen.has(nameKey(p.name)))
    toDetail.forEach((p) => seen.add(nameKey(p.name)))
    const details: Record<string, unknown> = {}
    await pool(toDetail, async (p) => {
      try {
        details[p.id] = await qlub(ref.country, ref.path, `${p.menuId}/product/${p.id}`)
      } catch (e) {
        log(`  ! ${p.name}: ${(e as Error).message}`)
      }
    })
    bundle.qlubReference.push({
      locationId: refId,
      products: products as never,
      details: details as never,
    })
    log(`  ${products.length} products, ${Object.keys(details).length} details`)
  }

  return bundle
}
