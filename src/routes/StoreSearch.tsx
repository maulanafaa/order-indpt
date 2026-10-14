import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { ItemSheet } from '../components/flows/ItemSheet'
import { MenuItemRow } from '../components/flows/MenuItemRow'
import { useItemParam } from '../components/flows/useItemParam'
import { useStoreCart } from '../components/flows/useStoreCart'
import { Chip, EmptyState, IconButton, SearchField } from '../components/ui'
import type { Store } from '../data/schema'
import { availabilityFor, categories, items, itemsByCategory, storeBySlug } from '../lib/data'
import { branchState } from '../lib/branch'
import { upsellItems } from '../lib/upsell'
import { useScenario } from '../lib/scenarios'
import { useNow } from '../lib/useNow'

/** Figma "Menu search result" and "Menu search empty". */
export default function StoreSearchPage() {
  const { slug = '' } = useParams()
  const store = storeBySlug.get(slug)
  if (!store) return <Navigate to="/" replace />
  return <MenuSearch store={store} />
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function MenuSearch({ store }: { store: Store }) {
  const navigate = useNavigate()
  const { store: storeFlag, demo } = useScenario()
  const [query, setQuery] = useState('')
  const availability = useMemo(() => availabilityFor(store.id), [store.id])
  const { item, lastItem, openItem, closeItem } = useItemParam()
  const cart = useStoreCart(store, openItem)
  const q = norm(query)
  const results = q ? items.filter((i) => norm(`${i.name} ${i.description}`).includes(q)) : []
  const now = useNow()
  const branch = branchState(store, now, storeFlag, demo)
  const paused = branch.kind === 'paused'

  return (
    <div className="flex min-h-full flex-col bg-surface-base">
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-border-default bg-surface-base py-2 ps-2 pe-4">
        <IconButton icon="back" label="Back to menu" onClick={() => navigate(`/store/${store.slug}`)} />
        <SearchField
          label="Search the menu"
          placeholder={`Search ${store.name}`}
          value={query}
          onChange={setQuery}
          autoFocus
          className="h-11 flex-1"
        />
      </div>

      {q && results.length > 0 && (
        <>
          <p className="px-4 pt-3 pb-1 caption text-text-tertiary">
            {results.length} {results.length === 1 ? 'item matches' : 'items match'} “{query.trim()}”
          </p>
          <div className="flex-1">
            {results.map((it) => (
              <MenuItemRow
                key={it.id}
                item={it}
                quantity={cart.quantityOf(it.id)}
                soldOut={availability.soldOutItems.has(it.id)}
                onOpen={() => openItem(it)}
                onAdd={() => cart.quickAdd(it)}
                onDecrease={() => cart.decrease(it)}
                disabled={paused}
              />
            ))}
          </div>
        </>
      )}

      {q && results.length === 0 && (
        <EmptyState icon="search" title={`No items match “${query.trim()}”`} className="pt-12">
          Try a shorter name, or browse a category.
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {categories
              .filter((c) => itemsByCategory.get(c.id)?.length)
              .slice(0, 8)
              .map((c) => (
                <Chip key={c.id} onClick={() => navigate(`/store/${store.slug}?cat=${c.id}`)}>
                  {c.name}
                </Chip>
              ))}
          </div>
        </EmptyState>
      )}

      {!q && (
        <EmptyState icon="search" title="Search the menu" size="m" className="pt-12">
          Try “slider”, “fries” or “latte”.
        </EmptyState>
      )}

      <ItemSheet
        item={lastItem}
        open={Boolean(item)}
        onClose={closeItem}
        soldOut={lastItem ? availability.soldOutItems.has(lastItem.id) : false}
        unavailableModifiers={availability.unavailableModifiers}
        onAdd={(line, done) => cart.add(line, done)}
        upsell={paused ? [] : upsellItems(new Set(), availability.soldOutItems)}
        onUpsellAdd={(it) => cart.add({ itemId: it.id, quantity: 1, modifiers: [], note: '' }, undefined, true)}
        storeSlug={store.slug}
        ordersPaused={paused}
      />
      {cart.leaveSheet}
    </div>
  )
}
