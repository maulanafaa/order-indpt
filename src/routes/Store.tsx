import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useOverlayRoot } from '../components/layout/overlay'
import { CartBar } from '../components/flows/CartBar'
import { ItemSheet } from '../components/flows/ItemSheet'
import { MenuItemRow } from '../components/flows/MenuItemRow'
import { MenuTile } from '../components/flows/MenuTile'
import { ActiveOrderBanner } from '../components/flows/ActiveOrders'
import { OrderMethods } from '../components/flows/OrderMethods'
import { useItemParam } from '../components/flows/useItemParam'
import { useStoreCart } from '../components/flows/useStoreCart'
import { useCartFlow } from '../components/flows/useCartFlow'
import { Badge, Button, EmptyState, Icon, IconButton, Tabs, TopBar } from '../components/ui'
import type { Item, Store } from '../data/schema'
import { cn } from '../lib/cn'
import { useActiveOrders, type ActiveOrder } from '../lib/activeOrders'
import { upsellItems } from '../lib/upsell'
import { branchBadge, branchState } from '../lib/branch'
import { categories, items, itemsByCategory, storeBySlug } from '../lib/data'
import { useScenario } from '../lib/scenarios'
import { useNow } from '../lib/useNow'
import { CurrencyScope } from '../components/ui/CurrencyScope'
import { useAvailability } from '../lib/testCart'

export default function StorePage() {
  const { slug = '' } = useParams()
  const store = storeBySlug.get(slug)
  if (!store) return <UnknownStore />
  return (
    <CurrencyScope country={store.country}>
      <StoreMenu key={store.id} store={store} />
    </CurrencyScope>
  )
}

function UnknownStore() {
  const navigate = useNavigate()
  return (
    <>
      <TopBar title="Store" onLeading={() => navigate('/')} />
      <EmptyState
        icon="store"
        title="We can’t find this store"
        className="pt-16"
        actions={<Button onClick={() => navigate('/')}>Find a store</Button>}
      >
        The link may be old. Pick a store from the list.
      </EmptyState>
    </>
  )
}

/* ------------------------------------------------------------------------ */

type Section = { id: string; label: string; items: Item[]; grid?: boolean }

function StoreMenu({ store }: { store: Store }) {
  const navigate = useNavigate()
  const scenario = useScenario()
  const [, setParams] = useSearchParams()
  const overlay = useOverlayRoot()
  const now = useNow()
  const branch = branchState(store, now, scenario.store, scenario.demo)
  const status = { open: branch.kind === 'open' }
  const paused = branch.kind === 'paused'
  const activeOrders = useActiveOrders(store.id)
  const openOrder = (o: ActiveOrder) => navigate(`/order/${o.id}`)
  // Carhop ready: I'm here opens the order with the arrival flow started.
  const imHere = (o: ActiveOrder) => navigate(`/order/${o.id}?here=1`)
  // Branch data plus anything forced in the cart test settings.
  const availability = useAvailability(store.id)
  const { item, lastItem, openItem, closeItem } = useItemParam()
  const cart = useStoreCart(store, openItem)
  const flow = useCartFlow({
    store,
    closed: !status.open,
    soldOutItems: availability.soldOutItems,
    unavailableModifiers: availability.unavailableModifiers,
    closeItem,
  })
  const [retrying, setRetrying] = useState(false)

  const sections: Section[] = useMemo(() => {
    // For you: two Best sellers and two New items this branch can sell today (sold out ones stay, disabled, in their category).
    const sellable = items.filter((i) => !availability.soldOutItems.has(i.id))
    const best = sellable.filter((i) => i.isBestSeller && !i.isNew)
    const fresh = sellable.filter((i) => i.isNew)
    const pick = [...best.slice(0, 2), ...fresh.slice(0, 2)]
    // Fewer than two of either: fill up to four from the other list.
    for (const i of [...best, ...fresh]) if (pick.length < 4 && !pick.includes(i)) pick.push(i)
    return [
      ...(pick.length ? [{ id: 'for-you', label: 'For you', items: pick.slice(0, 4), grid: true }] : []),
      ...categories
        .map((c) => ({ id: c.id, label: c.name, items: itemsByCategory.get(c.id) ?? [] }))
        .filter((s) => s.items.length),
    ]
  }, [availability])

  /* -------------------- sticky tabs and hide-on-scroll -------------------- */
  const tabsRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  const [headerShown, setHeaderShown] = useState(false)
  const [active, setActive] = useState(sections[0]?.id ?? '')
  const lockUntil = useRef(0)

  const root = () => document.querySelector<HTMLElement>('[data-scroll-root]')
  const topOf = (el: Element, r: HTMLElement) => el.getBoundingClientRect().top - r.getBoundingClientRect().top + r.scrollTop

  useEffect(() => {
    const r = root()
    if (!r) return
    let last = r.scrollTop
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = r.scrollTop
        const tabs = tabsRef.current
        const isStuck = tabs ? y >= topOf(tabs, r) : false
        setStuck(isStuck)
        if (Math.abs(y - last) > 6) {
          setHeaderShown(y < last)
          last = y
        }
        if (Date.now() < lockUntil.current) return
        // Active tab = last section whose top has passed under the sticky bar.
        let current = sections[0]?.id ?? ''
        for (const s of sections) {
          const el = document.getElementById(`section-${s.id}`)
          if (el && topOf(el, r) - 110 <= y) current = s.id
        }
        setActive(current)
      })
    }
    r.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      r.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [sections])

  const jumpTo = useCallback((id: string) => {
    const r = root()
    const el = document.getElementById(`section-${id}`)
    if (!r || !el) return
    setActive(id)
    lockUntil.current = Date.now() + 700
    r.scrollTo({ top: topOf(el, r) - 101, behavior: 'smooth' })
  }, [])

  // ?cat=cat-35 (from menu search) jumps to that category once.
  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get('cat')
    if (!cat) return
    const t = window.setTimeout(() => jumpTo(cat), 50)
    setParams(
      (p) => {
        p.delete('cat')
        return p
      },
      { replace: true },
    )
    return () => window.clearTimeout(t)
  }, [jumpTo, setParams])

  const tabItems = sections.map((s) => ({ id: s.id, label: s.label }))

  const controls = (it: Item) => ({
    quantity: cart.quantityOf(it.id),
    soldOut: availability.soldOutItems.has(it.id),
    onOpen: () => openItem(it),
    onAdd: () => cart.quickAdd(it),
    onDecrease: () => cart.decrease(it),
    disabled: paused,
  })

  const retry = () => {
    setRetrying(true)
    window.setTimeout(() => {
      setRetrying(false)
      setParams(
        (p) => {
          p.delete('menu')
          return p
        },
        { replace: true },
      )
    }, 1000)
  }

  return (
    <div className="min-h-full bg-surface-base">
      {/* Top actions (Figma Cover: back and search, no photo) */}
      <div className="flex h-16 items-center justify-between px-4">
        <IconButton icon="back" label="Back to stores" variant="outline" onClick={flow.goBack} />
        <IconButton icon="search" label="Search the menu" variant="outline" onClick={() => navigate(`/store/${store.slug}/search`)} />
      </div>

      {/* Branch header: name, then the active order, or the status (when not open) and order methods. */}
      <header className={cn('flex flex-col items-start gap-2.5 p-4', activeOrders.length > 0 && 'pb-4')}>
        <button type="button" onClick={() => navigate(`/store/${store.slug}/info`)} className="flex items-center gap-1 text-start">
          <h1 className="title-xl">{store.name}</h1>
          <Icon name="chev" size={22} />
        </button>
        {activeOrders.length === 0 && (
          <>
            {branch.kind !== 'open' && <Badge variant={branchBadge[branch.kind]}>{branch.label}</Badge>}
            <OrderMethods storeId={store.id} />
          </>
        )}
      </header>
      {activeOrders.length > 0 && (
        <ActiveOrderBanner orders={activeOrders} onOpen={openOrder} onImHere={imHere} />
      )}

      {scenario.menuError ? (
        <EmptyState
          icon="alert"
          iconStyle="circle"
          size="m"
          title="Couldn’t load the menu"
          className="py-16"
          actions={
            <Button variant="secondary" size="md" loading={retrying} onClick={retry}>
              Try again
            </Button>
          }
        >
          Something went wrong on our side or your connection dropped. Please try again.
        </EmptyState>
      ) : (
        <>
          <div ref={tabsRef}>
            <Tabs items={tabItems} value={active} onChange={jumpTo} label="Menu categories" className="gap-7" />
          </div>

          <div className="pb-6">
            {sections.map((s) => (
              <section key={s.id} id={`section-${s.id}`} aria-label={s.label}>
                <div className="px-4 pt-6 pb-1">
                  <h2 className="title-m">{s.label}</h2>
                </div>
                {s.grid ? (
                  <div className="mt-2 mb-4 grid grid-cols-2 gap-px border-y border-border-default bg-border-default pb-px">
                    {s.items.map((it) => (
                      <MenuTile key={it.id} item={it} {...controls(it)} />
                    ))}
                    {s.items.length % 2 === 1 && <div aria-hidden className="bg-surface-base" />}
                  </div>
                ) : (
                  <div>
                    {s.items.map((it) => (
                      <MenuItemRow key={it.id} item={it} {...controls(it)} />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}

      {!paused && <CartBar storeSlug={store.slug} closed={!status.open} soldOutItems={availability.soldOutItems} onOpen={flow.openCart} />}

      {/* Sticky bar: compact header (shown when scrolling up) + category tabs. */}
      {overlay &&
        !scenario.menuError &&
        createPortal(
          <div
            aria-hidden={!stuck}
            className={cn(
              // Only the compact header slides (ease out, 450 ms). When the inline tabs reach the top the bar
              // appears in place with the header already tucked away, so the tabs swap without a jump.
              'pointer-events-auto absolute inset-x-0 top-0 z-30 bg-surface-base shadow-[0_2px_8px_rgb(0_0_0/0.08)]',
              'transition-[translate,box-shadow] duration-[450ms] ease-sheet motion-reduce:transition-none',
              !stuck && 'pointer-events-none invisible',
              !(stuck && headerShown) && '-translate-y-14',
            )}
          >
            <div className="flex h-14 items-center gap-1 px-2">
              <IconButton icon="back" label="Back to stores" onClick={flow.goBack} />
              <button
                type="button"
                className="flex min-w-0 flex-1 justify-center"
                onClick={() => navigate(`/store/${store.slug}/info`)}
              >
                <span className="max-w-full truncate title-s">{store.name}</span>
              </button>
              <IconButton icon="search" label="Search the menu" onClick={() => navigate(`/store/${store.slug}/search`)} />
            </div>
            <Tabs items={tabItems} value={active} onChange={jumpTo} label="Menu categories" className="gap-7" />
          </div>,
          overlay,
        )}

      <ItemSheet
        item={lastItem}
        open={Boolean(item)}
        onClose={flow.onItemClose}
        soldOut={lastItem ? availability.soldOutItems.has(lastItem.id) : false}
        unavailableModifiers={availability.unavailableModifiers}
        onAdd={(line, done) => flow.onItemSave(line, done, cart.add)}
        editing={flow.editing}
        upsell={paused ? [] : upsellItems(new Set(), availability.soldOutItems)}
        onUpsellAdd={(it) => cart.add({ itemId: it.id, quantity: 1, modifiers: [], note: '' }, undefined, true)}
        storeSlug={store.slug}
        ordersPaused={paused}
      />
      {cart.leaveSheet}
      {flow.sheets}
    </div>
  )
}
