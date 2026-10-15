/**
 * Prototype test settings for the cart (gear on the cart sheet): fill the cart with a
 * ready-made set of lines and force items sold out or add-ons unavailable at this
 * branch, so every cart row state can be seen on any branch. Kept in this browser.
 */
import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NewLine } from './cart'
import { availabilityFor, itemBySlug } from './data'

type Overrides = { soldOut: string[]; unavailableMods: string[] }

export const useAvailabilityOverrides = create<Overrides & { set: (o: Overrides) => void }>()(
  persist(
    (set) => ({ soldOut: [], unavailableMods: [], set: (o) => set(o) }),
    { name: 'order-indpt-test-availability' },
  ),
)

/** The branch's sold out items and unavailable add-ons, plus any forced in the test settings. */
export function useAvailability(storeId: string) {
  const soldOut = useAvailabilityOverrides((s) => s.soldOut)
  const unavailableMods = useAvailabilityOverrides((s) => s.unavailableMods)
  return useMemo(() => {
    const base = availabilityFor(storeId)
    return {
      soldOutItems: new Set([...base.soldOutItems, ...soldOut]),
      unavailableModifiers: new Set([...base.unavailableModifiers, ...unavailableMods]),
    }
  }, [storeId, soldOut, unavailableMods])
}

const SALT_BURGER = 'item-20000001'
const SLIDER = 'item-20000003'
const ICED_LATTE = 'item-20001060'
const LOTUS_SOFTIE = 'item-20000039'
const CAMPFIRE = 'item-20000002'
const NO_ONION = 'mod-20000001-remove-no-onion-white-fresh'
const BURGER_JALAPENO = 'mod-20000001-add-extra-extra-jalapeno-sliced'
const FIRE_FRIES = 'mod-20000001-add-fries-fire-fries'
const NO_PICKLE = 'mod-20000003-remove-no-pickle'
const SLIDER_JALAPENO = 'mod-20000003-add-extra-extra-jalapeno-sliced'

const line = (itemId: string, quantity = 1, mods: string[] = []): NewLine => ({
  itemId,
  quantity,
  note: '',
  modifiers: mods.map((modifierId) => ({ modifierId, quantity: 1 })),
})

/** The Figma cart: 4 items, 5 in total. */
const figma = () => [line(SALT_BURGER, 1, [NO_ONION, BURGER_JALAPENO]), line(ICED_LATTE), line(SLIDER, 1, [NO_PICKLE]), line(LOTUS_SOFTIE, 2)]

/** Ten different plain items (no choices needed). */
const many = () =>
  [
    'salt-burger', 'original-fries', 'pink-lemonade', 'chicken-popcorn', 'brownie-softie',
    'mint-lemonade', 'cheese-fries', 'lotus-softie', 'pepsi', 'chicken-strips',
  ]
    .map((slug) => itemBySlug.get(slug)?.id)
    .filter((id): id is string => Boolean(id))
    .map((id) => line(id))

export type CartPreset = { id: string; label: string; detail: string; lines: () => NewLine[]; overrides: Overrides }

export const CART_PRESETS: CartPreset[] = [
  { id: 'figma', label: 'Figma cart', detail: '4 items, everything available', lines: figma, overrides: { soldOut: [], unavailableMods: [] } },
  { id: 'one', label: 'One item', detail: 'Salt Burger with options', lines: () => [line(SALT_BURGER, 1, [NO_ONION])], overrides: { soldOut: [], unavailableMods: [] } },
  { id: 'many', label: 'Many items', detail: '10 items, the list scrolls', lines: many, overrides: { soldOut: [], unavailableMods: [] } },
  {
    id: 'addon',
    label: 'Add-on unavailable',
    detail: 'Fire Fries and a slider add-on taken off, with a note',
    lines: () => [line(SALT_BURGER, 1, [NO_ONION, BURGER_JALAPENO, FIRE_FRIES]), line(SLIDER, 1, [NO_PICKLE, SLIDER_JALAPENO]), line(ICED_LATTE)],
    overrides: { soldOut: [], unavailableMods: [FIRE_FRIES, SLIDER_JALAPENO] },
  },
  {
    id: 'soldout',
    label: 'Item sold out',
    detail: 'Campfire Burger greyed out and left out of the total',
    lines: () => [...figma(), line(CAMPFIRE)],
    overrides: { soldOut: [CAMPFIRE], unavailableMods: [] },
  },
  {
    id: 'mixed',
    label: 'Everything at once',
    detail: 'Unavailable add-ons and a sold out item',
    lines: () => [
      line(SALT_BURGER, 1, [NO_ONION, BURGER_JALAPENO, FIRE_FRIES]),
      line(ICED_LATTE),
      line(SLIDER, 1, [NO_PICKLE, SLIDER_JALAPENO]),
      line(LOTUS_SOFTIE, 2),
      line(CAMPFIRE),
    ],
    overrides: { soldOut: [CAMPFIRE], unavailableMods: [FIRE_FRIES, SLIDER_JALAPENO] },
  },
]
