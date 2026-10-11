/** "Goes well with ..." picks for the cart sheet and the item sheet. */
import type { Item } from '../data/schema'
import { groupsByItem, itemBySlug } from './data'

/** In order. Only items that need no choices, so "+" can add them straight away. */
const UPSELL_SLUGS = [
  'original-fries', 'pink-lemonade', 'chicken-popcorn', 'brownie-softie', 'mint-lemonade',
  'cheese-fries', 'lotus-softie', 'salt-fries', 'pepsi', 'chicken-strips',
  'sweet-potato-fries', 'original-lemonade', 'lotus-shake', 'mango-softie', 'iced-latte', 'sparkling-water-bottle',
]

export function upsellItems(exclude: Set<string>, soldOut: Set<string>, max = 10): Item[] {
  return UPSELL_SLUGS.map((s) => itemBySlug.get(s))
    .filter((i): i is Item => Boolean(i) && !exclude.has(i!.id) && !soldOut.has(i!.id))
    .filter((i) => !(groupsByItem.get(i.id) ?? []).some((g) => g.required))
    .slice(0, max)
}
