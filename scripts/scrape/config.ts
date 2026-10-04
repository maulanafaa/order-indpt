/** Where the scraper reads from. See README "Data pipeline" for how these were found. */
export const config = {
  /** Store locator page. Its HTML holds `const locations = [...]` with every store. */
  locatorUrl: 'https://locations.findsalt.com/',

  /**
   * KSA ordering site (order.indpt.com/{slug}/{branchId}). JSON endpoints:
   *   /api/proxy/settings/{slug}/{branchId}  branch name, phone, address, lat/lng
   *   /api/proxy/menu/{slug}/{branchId}      hours, categories, items, SAR prices
   */
  indptOrigin: 'https://order.indpt.com',

  /**
   * qlub (UAE ordering). API host is api-{country}.qlub.cloud. JSON endpoints:
   *   /v1/menu/{path}/menu                       menus, categories, opening hours
   *   /v1/menu/{path}/{menuId}/category/{catId}  products: description, allergens, status
   *   /v1/menu/{path}/{menuId}/product/{id}      modifier groups (add-ons)
   */
  qlubApi: (country: string) => `https://api-${country}.qlub.cloud`,

  /**
   * Locator ids of qlub stores used to enrich KSA items with descriptions,
   * allergens and add-ons (KSA's site has none). First match wins.
   * 10 = SALT Hamra, 25 = SALT Yas Mall, 13 = SALT Marina Mall.
   */
  qlubReferenceStoreIds: [10, 25, 13],

  /** Requests in flight at once, pause between requests, and retries. */
  concurrency: 3,
  delayMs: 150,
  retries: 2,
  timeoutMs: 20_000,
} as const
