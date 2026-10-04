import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useOverlayRoot } from '../components/layout/overlay'
import { CartBar } from '../components/flows/CartBar'
import { ItemSheet } from '../components/flows/ItemSheet'
import { MenuItemRow } from '../components/flows/MenuItemRow'
import { MenuTile } from '../components/flows/MenuTile'
import { ServiceChips } from '../components/flows/ServiceChips'
import { useItemParam } from '../components/flows/useItemParam'
import { useStoreCart } from '../components/flows/useStoreCart'
import { useCartFlow } from '../components/flows/useCartFlow'
import { Badge, Button, EmptyState, Icon, IconButton, Notice, ProductImage, Tabs, TopBar } from '../components/ui'
import type { Item, Store } from '../data/schema'
import { cn } from '../lib/cn'
import { availabilityFor, categories, isCustomisable, items, itemsByCategory, storeBySlug } from '../lib/data'
import { storeImage } from '../lib/format'
import { openStatus } from '../lib/hours'
import { useScenario } from '../lib/scenarios'
import { useNow } from '../lib/useNow'

export default function StorePage() {
  const { slug = '' } = useParams()
  const store = storeBySlug.get(slug)
  if (!store) return <UnknownStore />
  return <StoreMenu key={store.id} store={store} />
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
  const status = openStatus(store, now, scenario.storeClosed)
  const availability = useMemo(() => availabilityFor(store.id), [store.id])
  const { item, lastItem, openItem, closeItem } = useItemParam()
  const cart = useStoreCart(store, openItem)
  const flow = useCartFlow({
    store,
    closed: !status.open,
    soldOutItems: availability.soldOutItems,
    unavailableModifiers: availability.unavailableModifiers,
    openItem,
    closeItem,
    quickAdd: cart.quickAdd,
    isCustomisable: (it) => isCustomisable(it.id),
  })
  const [retrying, setRetrying] = useState(false)

  const sections: Section[] = useMemo(() => {
    // Best Seller only shows items this branch can sell today; sold out ones stay (disabled) in their category.
    const best = items.filter((i) => i.isBestSeller && !availability.soldOutItems.has(i.id))
    return [
      ...(best.length ? [{ id: 'best', label: 'Best Seller', items: best, grid: true }] : []),
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
      {/* Cover */}
      <div className="relative">
        <ProductImage src={storeImage(store.slug)} alt={store.name} iconSize={32} className="h-[200px] w-full" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3">
          <IconButton icon="back" label="Back to stores" variant="elevated" onClick={flow.goBack} />
          <div className="flex gap-2">
            <IconButton icon="search" label="Search the menu" variant="elevated" onClick={() => navigate(`/store/${store.slug}/search`)} />
            <IconButton icon="user" label="Profile" variant="elevated" onClick={() => navigate('/profile')} />
          </div>
        </div>
      </div>

      {/* Branch header */}
      <header className="flex flex-col items-start gap-2.5 p-4">
        <button type="button" onClick={() => navigate(`/store/${store.slug}/info`)} className="flex items-center gap-1 text-start">
          <h1 className="title-l">{store.name}</h1>
          <Icon name="chev" size={22} />
        </button>
        <Badge variant={status.open ? 'success' : 'error'}>{status.label}</Badge>
        {!status.open && (
          <Notice tone="error" icon="cal" title="This store is closed right now">
            You can browse the menu and schedule your order for {status.opensAt ?? 'later'} or later.
          </Notice>
        )}
        <ServiceChips storeId={store.id} />
      </header>

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
                <div className="flex items-baseline gap-2 px-4 pt-6 pb-1">
                  <h2 className="title-m">{s.label}</h2>
                  <span className="caption text-text-tertiary">
                    {s.items.length} {s.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                {s.grid ? (
                  <div className="mt-2 mb-4 grid grid-cols-2 gap-px border-y border-border-default bg-border-default">
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

      <CartBar storeSlug={store.slug} closed={!status.open} soldOutItems={availability.soldOutItems} onOpen={flow.openCart} />

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
      />
      {cart.leaveSheet}
      {flow.sheets}
    </div>
  )
}
