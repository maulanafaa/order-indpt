/**
 * Hand-kept rules applied on top of the scraped data. Edit these instead of
 * the generated JSON.
 */
import type { OrderMethod } from '../../src/data/schema'

/** Category display names. Anything not listed is title-cased. */
export const categoryNames: Record<string, string> = {
  SLIDERS: 'Sliders',
  "BURGER'S": 'Burgers',
  FRIES: 'Fries',
  "KID'S MEAL": 'Little Salters',
  SIDES: 'Sides',
  SOFTIES: 'Softies',
  SHAKES: 'Shakes',
  PINTS: 'Pints',
  POPSICLES: 'Popsicles',
  Pushpop: 'Pushpops',
  LEMONADE: 'Lemonades',
  'FRESH JUICES': 'Fresh juices',
  SOFTDRINKS: 'Soft drinks',
  WATER: 'Water',
  MOJITO: 'Mojitos',
  'COFFEE - HOT': 'Hot coffee',
  'COFFEE - COLD': 'Iced coffee',
  BREAKFAST: 'Breakfast',
  COOKIES: 'Cookies',
  'ENERGY BOOST': 'Energy boost',
  BOX: 'Boxes',
  Dessert: 'Desserts',
}

/**
 * Categories that are add-ons, not things to order on their own. Their items
 * are used only to price add-ons in KSA riyals.
 */
export const addOnCategories = ['EXTRAS']

/** Store names, cleaned up for display (locator name -> display name). */
export const storeNames: Record<string, string> = {
  'Talgah Shopping Mall - Abha': 'SALT Talgah Mall Abha',
  'JAKS - Riyadh': 'SALT JAKS Riyadh',
  'SALT AL BAHAR RESORT - KHOBAR': 'SALT Al Bahar Resort Khobar',
  'Salt Doha': 'SALT Doha',
  'SALT - Al Ain Oasis': 'SALT Al Ain Oasis',
  'Find Salt-Jumeirah 3': 'SALT Jumeirah 3',
  'SALT Al Ain - Syde': 'SALT Al Ain Syde',
  'SALT Al Ain - Spot': 'SALT Al Ain Spot',
}

/** KSA item name -> qlub product name, where they differ. */
export const qlubAliases: Record<string, string> = {
  'Lettuce Beef Wrap': 'Single Lettuce Wrap',
  'Truffle Beef Slider -Double': 'Truffle Beef Slider - Double',
  'Watermelon Juice': 'Watermelon Fresh Juice',
  'Green Apple Fresh Juice': 'Green apple juice',
  'Pomegranate Fresh Juice': 'Salt Pomegranate Juice',
  'Classic Iced Matcha 120z': 'CLASSIC ICED MATCHA LATTE',
  'Classic Hot Matcha Lattte 8oz': 'CLASSIC HOT MATCHA LATTE 8 OZ',
  'Classic Hot Matcha Lattte 12 oz': 'CLASSIC HOT MATCHA LATTE 12 OZ',
  'Cereal Matcha Latte Iced': 'CEREAL MATCHA LATTE ICED',
  'Cereal Matcha Latte Hot 8oz': 'CEREAL MATCHA LATTE HOT',
  'Sparkling Water bottle': 'Sparkling Water Btl',
  'Aquafina Water': 'Water Btl',
}

/**
 * Add-on group adjustments, keyed by the cleaned group name. qlub sends
 * "Add extra" as plain checkboxes; Figma shows it as steppers (up to 3 of each).
 */
export const groupRules: Record<string, { name?: string; stepperMaxQty?: number }> = {
  'Add extra': { stepperMaxQty: 3 },
  'Add drinks': { name: 'Add a drink' },
}

/** No source marks best sellers, so these are picked by hand. */
export const bestSellers = [
  'Original Beef Slider',
  'Truffle Beef Slider',
  'Salt Burger',
  'Truffle Fries',
  'Lotus Softie',
]

/** Hours for stores with no ordering link (nothing to read them from). */
export const defaultHours = { opens: '11:00', closes: '01:00' }

/**
 * Order methods per store. No source has these, so they are seeded here to
 * cover the Figma cases. Every store not listed supports and offers all three.
 * Keys are store slugs.
 */
type ServiceRule = Partial<Record<OrderMethod, { supported: boolean; availableNow: boolean }>>
export const storeServices: Record<string, ServiceRule> = {
  // Pickup only: carhop and dine-in are not offered at all (hidden in the UI).
  'salt-riyadh-park-mall': {
    carhop: { supported: false, availableNow: false },
    dineIn: { supported: false, availableNow: false },
  },
  // Dine-in not supported.
  'salt-nakheel-mall-riyadh': { dineIn: { supported: false, availableNow: false } },
  // Carhop supported but paused right now (disabled in the UI).
  'salt-olaya-khobar': { carhop: { supported: true, availableNow: false } },
  // Pickup supported but paused right now.
  'salt-saad-square': { pickup: { supported: true, availableNow: false } },
  // Mall kiosk: no carhop.
  'salt-al-haram-makkah': { carhop: { supported: false, availableNow: false } },
}
