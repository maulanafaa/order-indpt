import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { LocationToggle } from '../components/flows/LocationToggle'
import { StaticMap } from '../components/flows/StaticMap'
import { StoreCard } from '../components/flows/StoreCard'
import { Button, Chip, EmptyState, Icon, IconButton, SearchField, ViewToggle } from '../components/ui'
import type { Store } from '../data/schema'
import { useActiveOrders } from '../lib/activeOrders'
import { branchState } from '../lib/branch'
import { cn } from '../lib/cn'
import { citiesText, countries } from '../lib/countries'
import { stores } from '../lib/data'
import { distanceKm, formatDistance, type LatLng } from '../lib/geo'
import { useLocationStore } from '../lib/location'
import { CARD_GLIDE_MS, easeCard } from '../lib/motion'
import { useScenario } from '../lib/scenarios'
import { useNow } from '../lib/useNow'

/** Stores within this distance count as "nearby". */
const NEARBY_KM = 25
/** Where the map opens with location off: Riyadh. */
const DEFAULT_CENTER: LatLng = { lat: 24.7255, lng: 46.627 }

type View = 'map' | 'list'
type Ranked = { store: Store; km: number | null }

/** City part of an address for the empty state: "Riyadh" from "..., Al Aqiq, Riyadh 13511". */
const cityOf = (s: Store) => {
  const last = s.address.split(/[,·-]/).pop()?.replace(/\d+/g, '').trim()
  return last || s.country
}

export default function FindStorePage() {
  const navigate = useNavigate()
  const scenario = useScenario()
  const now = useNow()
  const permission = useLocationStore((s) => s.permission)
  const setPermission = useLocationStore((s) => s.setPermission)
  const activeOrders = useActiveOrders()
  const [view, setView] = useState<View>('map')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null)
  /** Where the person moved the map to. Cards then show the branches nearest that area. */
  const [area, setArea] = useState<LatLng | null>(null)
  /** Bumped to recentre (pin chosen) or reset (my location) the map after the person moved it. */
  const [recenterKey, setRecenterKey] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [asking, setAsking] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  /** Natural height of the panel in map view, so the switch to list can animate between two heights. */
  const panelContentRef = useRef<HTMLDivElement>(null)
  const [mapPanelH, setMapPanelH] = useState<number | null>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  // URL flag ?location=prompt|denied|granted wins (demo links).
  useEffect(() => {
    if (scenario.location) setPermission(scenario.location)
  }, [scenario.location, setPermission])

  const located = permission === 'granted'
  const user = located ? scenario.near.point : null
  const userCountry = useMemo(() => {
    if (!user) return null
    return [...stores].sort((a, b) => distanceKm(user, a) - distanceKm(user, b))[0]?.country ?? null
  }, [user])
  /** List filter. Follows your country until you pick one. */
  const [pickedCountry, setPickedCountry] = useState<string | null>(null)
  /** Cards rise in after a country switch (not while typing a search). */
  const [reveal, setReveal] = useState(0)
  const listScrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!reveal) return
    listScrollRef.current?.scrollTo({ top: 0 })
    const t = window.setTimeout(() => setReveal(0), 1300)
    return () => window.clearTimeout(t)
  }, [reveal])
  const pickCountry = (id: string) => {
    if (id === country) return
    setPickedCountry(id)
    setReveal((n) => n + 1)
  }
  const country = pickedCountry ?? userCountry ?? 'Saudi Arabia'

  const stateOf = (s: Store) => branchState(s, now, null, scenario.demo)
  const activeStoreIds = useMemo(() => new Set(activeOrders.map((o) => o.storeId)), [activeOrders])

  const ranked: Ranked[] = useMemo(() => {
    const rows = stores.map((store) => ({ store, km: user ? distanceKm(user, store) : null }))
    return user ? rows.sort((a, b) => (a.km ?? 0) - (b.km ?? 0)) : rows.sort((a, b) => a.store.name.localeCompare(b.store.name))
  }, [user])

  const q = query.trim().toLowerCase()
  const inCountry = ranked.filter((r) => r.store.country === country)
  const results = q ? inCountry.filter(({ store }) => `${store.name} ${store.address}`.toLowerCase().includes(q)) : null

  /** Cards on the map: branches near the area you moved to, near you, or near the default centre. */
  const focus = area ?? user ?? DEFAULT_CENTER
  const nearby = useMemo(
    () =>
      [...ranked]
        .filter((r) => distanceKm(focus, r.store) <= NEARBY_KM)
        .sort((a, b) => distanceKm(focus, a.store) - distanceKm(focus, b.store)),
    [focus, ranked],
  )
  const closest = ranked[0]
  /** Nearest branch to you on the map, chosen by default when your location turns on. */
  const nearestToMe = user ? (ranked.find((r) => (r.km ?? Infinity) <= NEARBY_KM)?.store.id ?? null) : null
  const userKey = user ? `${user.lat},${user.lng}` : null
  const [pickedFor, setPickedFor] = useState<string | null>(null)
  if (userKey !== pickedFor) {
    setPickedFor(userKey)
    setSelectedId(nearestToMe)
  }
  const noneNearby = Boolean(user && !area && nearby.length === 0)
  const areaEmpty = Boolean(area && nearby.length === 0)
  const listMode = view === 'list' || Boolean(q)
  const onPermissionScreen = permission === 'prompt'

  useEffect(() => {
    const el = panelContentRef.current
    if (!el || listMode || onPermissionScreen) return
    const ro = new ResizeObserver(() => setMapPanelH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [listMode, onPermissionScreen])

  // Keep the carousel on the chosen card, or back at the start when the set changes.
  const shownKey = nearby.map((r) => r.store.id).join()
  useEffect(() => {
    const row = cardsRef.current
    if (!row) return
    const card = selectedId ? row.querySelector<HTMLElement>(`[data-store="${selectedId}"]`) : null
    const max = row.scrollWidth - row.clientWidth
    const offset = card ? card.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft : 0
    const to = card ? Math.max(0, Math.min(max, offset - (row.clientWidth - card.offsetWidth) / 2)) : 0
    return glideScroll(row, to)
  }, [selectedId, shownKey])

  const moveArea = (c: LatLng) => {
    setArea(c)
    // A store that is no longer in the cards should not stay selected.
    if (selectedId) {
      const s = stores.find((x) => x.id === selectedId)
      if (s && distanceKm(c, s) > NEARBY_KM) setSelectedId(null)
    }
  }

  const order = (s: Store) => navigate(`/store/${s.slug}`)
  const select = (id: string) => {
    setSelectedId(id)
    const s = stores.find((x) => x.id === id)
    if (s) {
      setMapCenter({ lat: s.lat, lng: s.lng })
      // Keep the card order when the store already has a card, so the row glides to it
      // instead of reshuffling (a reshuffle makes the row snap straight to the new first card).
      if (!nearby.some((r) => r.store.id === id)) setArea({ lat: s.lat, lng: s.lng })
    }
    setRecenterKey((k) => k + 1)
  }
  const backToMe = () => {
    setMapCenter(null)
    setArea(null)
    setSelectedId(nearestToMe)
    setResetKey((k) => k + 1)
  }

  const allow = () => {
    setAsking(true)
    window.setTimeout(() => {
      setAsking(false)
      setPermission('granted')
    }, 900)
  }
  const searchByArea = () => {
    setPermission('denied')
    setView('list')
    window.setTimeout(() => searchRef.current?.focus(), 50)
  }
  const toggleLocation = (on: boolean) => {
    setPermission(on ? 'granted' : 'denied')
    setPickedCountry(null)
    backToMe()
  }

  const center = mapCenter ?? user ?? DEFAULT_CENTER
  const pins = stores.map((s) => ({ id: s.id, point: { lat: s.lat, lng: s.lng }, label: s.name, activeOrder: activeStoreIds.has(s.id) }))

  /** Demo switch over the map. It fades away when the list covers the map. */
  const toggle = (hidden = false) => (
    <div
      aria-hidden={hidden || undefined}
      inert={hidden}
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-3 transition-[opacity,translate] duration-[450ms] ease-sheet',
        hidden && '-translate-y-3 opacity-0',
      )}
    >
      <LocationToggle on={located} onChange={(on) => (on && onPermissionScreen ? allow() : toggleLocation(on))} />
    </div>
  )

  /* ---------------------------- permission sheet ---------------------------- */
  if (onPermissionScreen) {
    return (
      <div className="relative h-full overflow-hidden">
        <StaticMap center={center} zoom={11} pins={pins} showLabels={false} className="absolute inset-0" />
        <div className="absolute inset-0 bg-overlay backdrop-blur-[2px]" />
        {toggle()}
        <section className="absolute inset-x-0 bottom-0 z-10 flex flex-col bg-surface-base px-4 pt-2.5 pb-8 animate-sheet-in">
          <span aria-hidden className="mx-auto h-1 w-9 rounded-2 bg-border-default" />
          <Icon name="locate" size={40} className="mt-4" />
          <h1 className="mt-5 title-xl">Find your nearest SALT</h1>
          <p className="mt-2 body-m text-text-secondary">Allow location access to see SALT stores near you and how long your order takes.</p>
          <div className="mt-4 flex flex-col gap-2 pt-4">
            <Button fullWidth leadingIcon="locate" loading={asking} onClick={allow}>
              Allow location access
            </Button>
            <Button fullWidth variant="ghost" onClick={searchByArea}>
              Not now, search by area
            </Button>
          </div>
        </section>
      </div>
    )
  }

  /* ------------------------------- map / list ------------------------------- */
  const list = listMode
  const showListEmptyNearby = list && !q && noneNearby && closest && country === userCountry

  const closestStore = closest && (
    <div className="flex flex-col gap-2.5 px-4 pt-2">
      <p className="overline-text text-text-tertiary">Closest store</p>
      <StoreCard store={closest.store} state={stateOf(closest.store)} distanceKm={closest.km} onOrder={() => order(closest.store)} />
    </div>
  )
  const closestText = closest
    ? `Our closest store is in ${cityOf(closest.store)}, about ${formatDistance(closest.km ?? 0)} away. You can still order ahead for a later visit.`
    : ''

  return (
    <div className="relative h-full overflow-hidden">
      <StaticMap
        center={center}
        zoom={12}
        pins={pins}
        selectedId={selectedId}
        onPinClick={select}
        interactive
        recenterKey={recenterKey}
        resetKey={resetKey}
        onMoveEnd={moveArea}
        user={user}
        offsetY={180}
        className="absolute inset-0"
      />
      {toggle(list)}
      {user && (
        <div
          inert={list}
          className={cn('absolute end-4 z-10 transition-opacity duration-200', list && 'opacity-0')}
          style={{ bottom: (mapPanelH ?? 320) + 12 }}
        >
          <IconButton icon="locate" label="Back to my location" variant="elevated" onClick={backToMe} />
        </div>
      )}

      {/* The panel grows from its map height to the full screen (and back) with a height transition. */}
      <section
        aria-label="Stores"
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden bg-surface-base shadow-bar transition-[height] duration-[450ms] ease-sheet motion-reduce:transition-none"
        style={{ height: list ? '100%' : (mapPanelH ?? undefined) }}
      >
        <div ref={panelContentRef} className={cn('flex flex-col gap-3.5', list ? 'min-h-0 flex-1 pt-4' : 'pt-6 pb-6')}>
          <div className="flex shrink-0 items-center gap-2 px-4">
            <SearchField
              ref={searchRef}
              label="Search stores"
              placeholder="Search area, mall or street"
              value={query}
              onChange={setQuery}
              className="flex-1"
            />
            <ViewToggle
              options={[
                { value: 'map', icon: 'map', label: 'Map view' },
                { value: 'list', icon: 'list', label: 'List view' },
              ]}
              value={list ? 'list' : 'map'}
              onChange={(v) => {
                setView(v)
                if (v === 'map') setQuery('')
              }}
            />
          </div>

          {list && (
            <div role="group" aria-label="Country" className="flex shrink-0 gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {countries.map((c) => (
                <Chip key={c.id} selected={c.id === country} onClick={() => pickCountry(c.id)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          )}

          {list ? (
            <div ref={listScrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-10">
              {results && results.length === 0 ? (
                <EmptyState
                  icon="search"
                  title={`No stores match “${query.trim()}”`}
                  className="pt-8"
                  actions={
                    <>
                      <Button variant="secondary" fullWidth onClick={() => setQuery('')}>
                        See all stores
                      </Button>
                      {located && (
                        <Button variant="ghost" leadingIcon="locate" onClick={() => setQuery('')}>
                          Use my location
                        </Button>
                      )}
                    </>
                  }
                >
                  SALT is in {citiesText(country)}. Try a district, mall or street name.
                </EmptyState>
              ) : showListEmptyNearby ? (
                <>
                  <EmptyState icon="store" title="No SALT near you yet" className="pt-8 pb-4">
                    {closestText}
                  </EmptyState>
                  {closestStore}
                </>
              ) : (
                <ul className="flex flex-col gap-3 px-4">
                  {(results ?? inCountry).map(({ store, km }, i) => (
                    <li
                      key={store.id}
                      className={cn(reveal > 0 && 'animate-rise-in motion-reduce:animate-none')}
                      style={reveal ? { animationDelay: `${Math.min(i, 5) * 40}ms` } : undefined}
                    >
                      <StoreCard store={store} state={stateOf(store)} distanceKm={km} onOrder={() => order(store)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : noneNearby ? (
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1 px-4">
                <h2 className="title-xl text-text-primary">No SALT near you yet</h2>
                <p className="body-m text-text-secondary">{closestText}</p>
              </div>
              {closestStore}
            </div>
          ) : areaEmpty ? (
            <>
              <div className="flex flex-col gap-1 px-4">
                <h2 className="title-xl text-text-primary">No SALT in this area</h2>
                <p className="body-m text-text-secondary">Try moving the map, zooming out, or searching for a city.</p>
              </div>
              {user && (
                <div className="px-4">
                  <Button variant="secondary" fullWidth leadingIcon="locate" onClick={backToMe}>
                    Show stores near me
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div
              ref={cardsRef}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {nearby.map(({ store, km }) => (
                <div key={store.id} data-store={store.id} className="w-[326px] max-w-[calc(100%-32px)] shrink-0 snap-center">
                  <StoreCard
                    store={store}
                    state={stateOf(store)}
                    distanceKm={km}
                    selected={store.id === selectedId}
                    onSelect={() => select(store.id)}
                    onOrder={() => order(store)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

/** Scrolls the card carousel with the store card ease (CARD_GLIDE_MS, ease in out). Snap is off while it moves. */
function glideScroll(row: HTMLElement, to: number) {
  const from = row.scrollLeft
  if (Math.abs(to - from) < 1) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    row.scrollLeft = to
    return
  }
  const start = performance.now()
  let frame = 0
  row.style.scrollSnapType = 'none'
  const done = () => {
    row.style.scrollSnapType = ''
  }
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / CARD_GLIDE_MS)
    row.scrollLeft = from + (to - from) * easeCard(t)
    if (t < 1) frame = requestAnimationFrame(step)
    else done()
  }
  frame = requestAnimationFrame(step)
  return () => {
    cancelAnimationFrame(frame)
    done()
  }
}
