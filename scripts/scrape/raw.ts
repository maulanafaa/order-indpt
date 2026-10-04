/**
 * Loose shapes of the source responses: only the fields we use are checked,
 * so a change on their side fails loudly here instead of producing bad data.
 */
import { z } from 'zod'

const num = z.union([z.number(), z.string()]).transform((v) => Number(v))

export const locationSchema = z.looseObject({
  id: z.number(),
  name: z.string(),
  address: z.string().nullable(),
  /** The locator puts the country here. */
  city: z.string().nullable(),
  latitude: num,
  longitude: num,
  phone: z.string().nullable(),
  email: z.string().nullable().optional(),
  order_url: z.string().nullable(),
  is_active: z.boolean(),
})

export const indptSettingsSchema = z.looseObject({
  branch: z.looseObject({
    id: z.number(),
    name: z.string(),
    phone_number: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    latitude: num.nullable().optional(),
    longitude: num.nullable().optional(),
  }),
  currency: z.string().optional(),
})

export const indptItemSchema = z.looseObject({
  id: z.number(),
  oracle_menu_item_id: z.number(),
  name: z.record(z.string(), z.string()),
  base_price: num,
  sort_order: z.number().nullable().optional(),
})

export const indptMenuSchema = z.looseObject({
  operating_hours: z
    .looseObject({
      schedule: z.array(
        z.looseObject({
          day_of_week: z.number(),
          is_open: z.boolean(),
          open_time: z.string().nullable(),
          close_time: z.string().nullable(),
          is_next_day_close: z.boolean().nullable().optional(),
        }),
      ),
    })
    .nullable()
    .optional(),
  categories: z.array(
    z.looseObject({
      id: z.number(),
      name: z.string(),
      sort_order: z.number().nullable().optional(),
      items: z.array(indptItemSchema),
    }),
  ),
})

const qlubTag = z.looseObject({ name: z.string(), group: z.string().optional() })

export const qlubAvailabilitySchema = z.looseObject({
  active: z.boolean().optional(),
  dow: z.number(),
  start: z.number(),
  end: z.number(),
})

export const qlubMenusSchema = z.array(
  z.looseObject({
    id: z.string(),
    name: z.string(),
    availabilities: z.array(qlubAvailabilitySchema).nullable().optional(),
    categories: z.array(z.looseObject({ id: z.string(), name: z.string() })),
  }),
)

export const qlubProductSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  price: num,
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  hasAdditives: z.boolean().optional(),
  tags: z.union([z.array(qlubTag), z.record(z.string(), qlubTag)]).nullable().optional(),
})

export const qlubModifierGroupSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  status: z.string().optional(),
  min: z.number().nullable().optional(),
  max: z.number().nullable().optional(),
  multiMax: z.number().nullable().optional(),
  products: z.array(
    z.looseObject({
      id: z.string(),
      name: z.string(),
      price: num,
      status: z.string().optional(),
    }),
  ),
})

export const qlubProductDetailSchema = qlubProductSchema.extend({
  modifierGroups: z.array(qlubModifierGroupSchema).default([]),
})

/** Everything fetched in one run. Saved to scripts/scrape/.cache/raw.json. */
export const rawBundleSchema = z.object({
  fetchedAt: z.string(),
  locations: z.array(locationSchema),
  /** Keyed by locator id. */
  indpt: z.record(z.string(), z.object({ orderUrl: z.string(), settings: indptSettingsSchema, menu: indptMenuSchema })),
  /** Keyed by locator id: the qlub /menu response (used for opening hours). */
  qlubMenus: z.record(z.string(), z.object({ orderUrl: z.string(), menus: qlubMenusSchema })),
  /** Reference qlub stores used for descriptions, allergens and add-ons. */
  qlubReference: z.array(
    z.object({
      locationId: z.number(),
      products: z.array(qlubProductSchema),
      details: z.record(z.string(), qlubProductDetailSchema),
    }),
  ),
})

export type Location = z.infer<typeof locationSchema>
export type IndptMenu = z.infer<typeof indptMenuSchema>
export type IndptSettings = z.infer<typeof indptSettingsSchema>
export type QlubMenus = z.infer<typeof qlubMenusSchema>
export type QlubProduct = z.infer<typeof qlubProductSchema>
export type QlubProductDetail = z.infer<typeof qlubProductDetailSchema>
export type QlubModifierGroup = z.infer<typeof qlubModifierGroupSchema>
export type RawBundle = z.infer<typeof rawBundleSchema>
/** The bundle as saved to disk, before parsing (numbers may still be strings). */
export type RawBundleInput = z.input<typeof rawBundleSchema>
