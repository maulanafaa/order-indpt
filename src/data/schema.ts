/**
 * Shapes of every JSON file in src/data. The scraper validates its output
 * against these, and the app imports the types.
 *
 * Scraped (npm run scrape, do not edit by hand):
 *   stores, storeHours, storeServices, categories, items, modifierGroups, modifiers
 * Hand-written seed:
 *   storeAvailability, user, orders, promos
 */
import { z } from 'zod'

const id = z.string().min(1)
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase words joined by hyphens')
const time = z.string().regex(/^([01]\d|2[0-4]):[0-5]\d$/, 'HH:mm')
const sar = z
  .number()
  .nonnegative()
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'at most 2 decimals')

/* ---------------------------------------------------------------- */
/* Scraped                                                           */
/* ---------------------------------------------------------------- */

export const storeSchema = z.object({
  id,
  slug,
  name: z.string().min(1),
  address: z.string(),
  /** Country, from the store locator. */
  country: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string(),
  /** /images/stores/{slug}.webp. The file may not exist yet. */
  coverImage: z.string().startsWith('/images/stores/'),
})

/**
 * One row per open day. `day` 0 = Sunday ... 6 = Saturday.
 * `closes` earlier than or equal to `opens` means after midnight;
 * open all day is opens 00:00, closes 24:00.
 */
export const storeHoursSchema = z.object({
  storeId: id,
  day: z.number().int().min(0).max(6),
  opens: time,
  closes: time,
})

export const orderMethodSchema = z.enum(['pickup', 'carhop', 'dineIn'])

/** supported = the branch offers it at all; availableNow = not paused. */
export const storeServiceSchema = z.object({
  storeId: id,
  method: orderMethodSchema,
  supported: z.boolean(),
  availableNow: z.boolean(),
})

export const categorySchema = z.object({
  id,
  name: z.string().min(1),
  sortOrder: z.number().int(),
})

export const itemSchema = z.object({
  id,
  /** Names the photo: /images/menu/{slug}.webp */
  slug,
  categoryId: id,
  name: z.string().min(1),
  description: z.string(),
  /** SAR. The most common price across KSA stores. */
  price: sar,
  calories: z.number().int().nonnegative().nullable(),
  isBestSeller: z.boolean(),
  allergens: z.array(z.string()),
})

export const modifierGroupTypeSchema = z.enum(['single', 'multi', 'stepper'])

export const modifierGroupSchema = z
  .object({
    id,
    itemId: id,
    name: z.string().min(1),
    type: modifierGroupTypeSchema,
    min: z.number().int().nonnegative(),
    max: z.number().int().positive(),
    required: z.boolean(),
  })
  .refine((g) => g.min <= g.max, 'min must not exceed max')
  .refine((g) => g.required === g.min > 0, 'required must match min > 0')

export const modifierSchema = z.object({
  id,
  groupId: id,
  name: z.string().min(1),
  price: sar,
  maxQty: z.number().int().positive(),
})

/* ---------------------------------------------------------------- */
/* Seed                                                              */
/* ---------------------------------------------------------------- */

/** Overrides for one store: an item or an add-on that is off today. */
export const storeAvailabilitySchema = z
  .object({
    storeId: id,
    itemId: id.optional(),
    modifierId: id.optional(),
    available: z.boolean(),
    /** Shown to people, e.g. "Sold out today". */
    reason: z.string().optional(),
  })
  .refine((r) => Boolean(r.itemId) !== Boolean(r.modifierId), 'set exactly one of itemId or modifierId')

export const carSchema = z.object({
  id,
  make: z.string(),
  model: z.string(),
  colour: z.string(),
  plate: z.string(),
  isDefault: z.boolean(),
})

export const paymentMethodSchema = z.object({
  id,
  brand: z.enum(['mada', 'visa', 'mastercard', 'applePay']),
  /** Last 4 digits only. Never store a full card number. */
  last4: z.string().regex(/^\d{4}$/).optional(),
  bank: z.string().optional(),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/).optional(),
  isDefault: z.boolean(),
})

export const userSchema = z.object({
  id,
  /** Empty for a new user who has not given a name yet. */
  name: z.string(),
  mobile: z.string().regex(/^5\d{8}$/, '9 digits starting with 5'),
  email: z.string().email().nullable(),
  emailVerified: z.boolean(),
  city: z.string().nullable(),
  memberSince: z.string().date(),
  favouriteStoreId: id.nullable(),
  cars: z.array(carSchema),
  paymentMethods: z.array(paymentMethodSchema),
})

export const usersFileSchema = z.object({
  existing: userSchema,
  new: userSchema,
})

export const orderStatusSchema = z.enum([
  'placed',
  'accepted',
  'preparing',
  'ready',
  'arrived',
  'pickedUp',
  'cancelled',
])

export const orderItemSchema = z.object({
  itemId: id,
  name: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: sar,
  modifiers: z.array(
    z.object({
      modifierId: id,
      name: z.string(),
      quantity: z.number().int().positive(),
      price: sar,
    }),
  ),
  note: z.string().optional(),
})

export const orderSchema = z.object({
  id: z.string().regex(/^SLT-\d{5}$/),
  userId: id,
  storeId: id,
  method: orderMethodSchema,
  status: orderStatusSchema,
  placedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).nullable(),
  items: z.array(orderItemSchema).min(1),
  subtotal: sar,
  discount: sar,
  total: sar,
  promoCode: z.string().nullable(),
  paymentMethodId: id,
  carId: id.nullable(),
  refund: z
    .object({
      amount: sar,
      reason: z.string(),
      refundedAt: z.string().datetime({ offset: true }),
    })
    .nullable(),
  timeline: z.array(
    z.object({
      status: orderStatusSchema,
      at: z.string().datetime({ offset: true }),
    }),
  ),
})

export const promoSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]+$/),
  title: z.string(),
  type: z.enum(['percent', 'amount']),
  /** Percent (15 = 15%) or SAR amount. */
  value: z.number().positive(),
  /** Cap on the discount for percent promos, SAR. */
  maxDiscount: sar.nullable(),
  minOrder: sar,
  validFrom: z.string().date(),
  validUntil: z.string().date(),
  methods: z.array(orderMethodSchema).min(1),
})

/* ---------------------------------------------------------------- */
/* Files                                                             */
/* ---------------------------------------------------------------- */

export const dataFiles = {
  'stores.json': z.array(storeSchema),
  'storeHours.json': z.array(storeHoursSchema),
  'storeServices.json': z.array(storeServiceSchema),
  'categories.json': z.array(categorySchema),
  'items.json': z.array(itemSchema),
  'modifierGroups.json': z.array(modifierGroupSchema),
  'modifiers.json': z.array(modifierSchema),
  'storeAvailability.json': z.array(storeAvailabilitySchema),
  'user.json': usersFileSchema,
  'orders.json': z.array(orderSchema),
  'promos.json': z.array(promoSchema),
} as const

export type Store = z.infer<typeof storeSchema>
export type StoreHours = z.infer<typeof storeHoursSchema>
export type OrderMethod = z.infer<typeof orderMethodSchema>
export type StoreService = z.infer<typeof storeServiceSchema>
export type Category = z.infer<typeof categorySchema>
export type Item = z.infer<typeof itemSchema>
export type ModifierGroupType = z.infer<typeof modifierGroupTypeSchema>
export type ModifierGroup = z.infer<typeof modifierGroupSchema>
export type Modifier = z.infer<typeof modifierSchema>
export type StoreAvailability = z.infer<typeof storeAvailabilitySchema>
export type Car = z.infer<typeof carSchema>
export type PaymentMethod = z.infer<typeof paymentMethodSchema>
export type User = z.infer<typeof userSchema>
export type OrderStatus = z.infer<typeof orderStatusSchema>
export type OrderItem = z.infer<typeof orderItemSchema>
export type Order = z.infer<typeof orderSchema>
export type Promo = z.infer<typeof promoSchema>
