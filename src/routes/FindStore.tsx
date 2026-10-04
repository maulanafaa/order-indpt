import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { StaticMap } from '../components/flows/StaticMap'
import { StoreCard } from '../components/flows/StoreCard'
import { Button, EmptyState, Icon, IconButton, SearchField, ViewToggle } from '../components/ui'
import type { Store } from '../data/schema'
import { cn } from '../lib/cn'
import { stores } from '../lib/data'
import { distanceKm, formatDistance, type LatLng } from '../lib/geo'
import { useLocationStore } from '../lib/location'
import { placeName } from '../lib/placeName'
import { useScenario } from '../lib/scenarios'

/** Stores within this distance count as "nearby". */
const NEARBY_KM = 25
/** With no store near the map area, still show this many of the closest. */
const AREA_FALLBACK = 3

/** Ids of the stores the cards would show for a map area. */
function nearbyIds(area: LatLng) {
  const within = stores.filter((s) => distanceKm(area, s) <= NEARBY_KM)
  const list = within.length ? within : [...stores].sort((a, b) => distanceKm(area, a) - distanceKm(area, b)).slice(0, AREA_FALLBACK)
  return new Set(list.map((s) => s.id))
}

type View = 'map' | 'list'
type Ranked = { store: Store; km: number | null }

export default function FindStorePage() {
  const navigate = useNavigate()
  const scenario = useScenario()
  const permission = useLocationStore((s) => s.permission)
  const setPermission = useLocationStore((s) => s.setPermission)
  const [view, setView] = useState<View>('map')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null)
  /** Where the person moved the map to. Cards then show the branches nearest that area. */
  const [area, setArea] = useState<LatLng | null>(null)
  const [areaName, setAreaName] = useState<string | null>(null)
  const lookup = useRef<AbortController | null>(null)
  /** Bumped to recentre (pin chosen) or reset (my location) the map after the person moved it. */
  const [recenterKey, setRecenterKey] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [asking, setAsking] = useState(false)
  /** "Search by area" chosen: browse all stores without location. */
  const [browsing, setBrowsing] = useState(false)
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

  const ranked: Ranked[] = useMemo(() => {
    const rows = stores.map((store) => ({ store, km: user ? distanceKm(user, store) : null }))
    return user
      ? rows.sort((a, b) => (a.km ?? 0) - (b.km ?? 0))
      : rows.sort((a, b) => a.store.country.localeCompare(b.store.country) || a.store.name.localeCompare(b.store.name))
  }, [user])

  const q = query.trim().toLowerCase()
  const results = q
    ? ranked.filter(({ store }) => `${store.name} ${store.address} ${store.country}`.toLowerCase().includes(q))
    : null
  const nearby = useMemo(() => {
    if (area) {
      // Nearest branches to the map area; distance on the card stays "from you".
      const byArea = [...ranked].sort((a, b) => distanceKm(area, a.store) - distanceKm(area, b.store))
      const inArea = byArea.filter((r) => distanceKm(area, r.store) <= NEARBY_KM)
      return inArea.length ? inArea : byArea.slice(0, AREA_FALLBACK)
    }
    return user ? ranked.filter((r) => (r.km ?? Infinity) <= NEARBY_KM) : ranked
  }, [area, ranked, user])
  const closest = ranked[0]
  const shown = results ?? nearby
  const listMode = view === 'list' || Boolean(q)
  const onPermissionScreen = permission === 'prompt' || (permission === 'denied' && !browsing)

  useEffect(() => {
    const el = panelContentRef.current
    if (!el || listMode || onPermissionScreen) return
    const ro = new ResizeObserver(() => setMapPanelH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [listMode, onPermissionScreen])
  const areaEmpty = area ? !stores.some((s) => distanceKm(area, s) <= NEARBY_KM) : false
  const noneNearby = !results && !area && user && nearby.length === 0

  // Keep the carousel on the chosen card, or back at the start when the set changes.
  const shownKey = shown.map((r) => r.store.id).join()
  useEffect(() => {
    const row = cardsRef.current
    if (!row) return
    const card = selectedId ? row.querySelector<HTMLElement>(`[data-store="${selectedId}"]`) : null
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    else row.scrollTo({ left: 0, behavior: 'smooth' })
  }, [selectedId, shownKey])

  const moveArea = (c: LatLng) => {
    setArea(c)
    // Name the area ("Al Malqa, Riyadh"). The previous label stays until the new name arrives (or if it fails).
    lookup.current?.abort()
    const ctrl = new AbortController()
    lookup.current = ctrl
    placeName(c, ctrl.signal)
      .then((name) => {
        if (!ctrl.signal.aborted) setAreaName(name)
      })
      .catch(() => {})
    // A store that is no longer in the cards should not stay selected.
    if (selectedId && !nearbyIds(c).has(selectedId)) setSelectedId(null)
  }

  const order = (s: Store) => navigate(`/store/${s.slug}`)
  const select = (id: string) => {
    setSelectedId(id)
    const s = stores.find((x) => x.id === id)
    if (s) {
      setMapCenter({ lat: s.lat, lng: s.lng })
      setArea({ lat: s.lat, lng: s.lng })
      lookup.current?.abort()
      setAreaName(`Near ${s.name}`)
    }
    setRecenterKey((k) => k + 1)
  }

  const allow = () => {
    setAsking(true)
    window.setTimeout(() => {
      setAsking(false)
      setPermission('granted')
    }, 900)
  }
  const searchByArea = () => {
    if (permission === 'prompt') setPermission('denied')
    setBrowsing(true)
    setView('list')
    window.setTimeout(() => searchRef.current?.focus(), 50)
  }

  const center = mapCenter ?? user ?? (closest ? { lat: closest.store.lat, lng: closest.store.lng } : { lat: 24.71, lng: 46.68 })
  const pins = stores.map((s) => ({ id: s.id, point: { lat: s.lat, lng: s.lng }, label: s.name }))

  /** Profile and Help over the map. They slide away when the list covers the map. */
  const topButtons = (hidden = false) => (
    <div
      aria-hidden={hidden || undefined}
      inert={hidden}
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-between p-3 px-4 transition-[opacity,translate] duration-[450ms] ease-sheet',
        hidden && '-translate-y-3 opacity-0',
      )}
    >
      <IconButton icon="user" label="Profile" variant="elevated" className="pointer-events-auto" onClick={() => navigate('/profile')} />
      {permission !== 'prompt' && (
        <IconButton icon="help" label="Help" variant="elevated" className="pointer-events-auto" onClick={() => navigate('/help')} />
      )}
    </div>
  )

  /* ------------------------- permission screens ------------------------- */
  if (onPermissionScreen) {
    const denied = permission === 'denied'
    return (
      <div className="relative h-full overflow-hidden">
        <StaticMap center={center} zoom={11} pins={pins} showLabels={false} className="absolute inset-0" />
        <div className="absolute inset-0 bg-overlay backdrop-blur-[2px]" />
        {topButtons()}
        <section className="absolute inset-x-0 bottom-0 z-10 flex flex-col bg-surface-base px-4 pt-2.5 pb-8 animate-sheet-in">
          <span aria-hidden className="mx-auto h-1 w-9 rounded-2 bg-border-default" />
          <Icon name={denied ? 'pin' : 'locate'} size={32} className="mt-6" />
          <h1 className="mt-4 title-xl">{denied ? 'Location access is off' : 'Find your nearest SALT'}</h1>
          <p className="mt-2 body-s text-text-secondary">
            {denied
              ? 'Stores won’t be sorted by distance. You can turn it on, or search by area instead.'
              : 'Allow location access to see SALT stores near you and how long your order takes.'}
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {denied ? (
              <>
                <Button fullWidth leadingIcon="locate" loading={asking} onClick={allow}>
                  Try again
                </Button>
                <Button fullWidth variant="secondary" leadingIcon="search" onClick={searchByArea}>
                  Search by area
                </Button>
              </>
            ) : (
              <>
                <Button fullWidth leadingIcon="locate" loading={asking} onClick={allow}>
                  Allow location access
                </Button>
                <Button fullWidth variant="ghost" onClick={searchByArea}>
                  Not now, search by area
                </Button>
              </>
            )}
          </div>
        </section>
      </div>
    )
  }

  /* ------------------------------ map / list ----------------------------- */
  const list = listMode
  /** List view (not searching) shows every store, nearest first. */
  const listed = results ?? ranked
  const countLabel = results
    ? `${results.length} ${results.length === 1 ? 'store matches' : 'stores match'} “${query.trim()}”`
    : list
      ? `${ranked.length} stores`
      : noneNearby
      ? null
      : areaEmpty
        ? `No stores here · ${shown.length} closest`
        : `${shown.length} ${shown.length === 1 ? 'store' : 'stores'}`
  // "Near SALT ..." after tapping a pin, the area name after moving the map; until a name arrives the last label stays.
  const baseLabel = user ? scenario.near.label : 'Location off'
  const placeLabel = area
    ? (areaName ?? baseLabel)
    : user
      ? scenario.near.label
      : 'Location off'

  return (
    <div className="relative h-full overflow-hidden">
      <StaticMap
        center={center}
        zoom={noneNearby ? 6 : 12}
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
      {topButtons(list)}
      {user && (
        <div
          inert={list}
          className={cn('absolute end-4 z-10 transition-opacity duration-200', list && 'opacity-0')}
          style={{ bottom: (mapPanelH ?? 400) + 12 }}
        >
          <IconButton
            icon="locate"
            label="Back to my location"
            variant="elevated"
            onClick={() => {
              setMapCenter(null)
              setArea(null)
              lookup.current?.abort()
              setAreaName(null)
              setSelectedId(null)
              setResetKey((k) => k + 1)
            }}
          />
        </div>
      )}

      {/* The panel grows from its map height to the full screen (and back) with a height transition. */}
      <section
        aria-label="Stores"
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden bg-surface-base shadow-bar transition-[height] duration-[450ms] ease-sheet motion-reduce:transition-none"
        style={{ height: list ? '100%' : (mapPanelH ?? undefined) }}
      >
        <div ref={panelContentRef} className={cn('flex flex-col', list && 'min-h-0 flex-1')}>
        <button
          type="button"
          aria-label={list ? 'Show map' : 'Show list'}
          onClick={() => setView(list ? 'map' : 'list')}
          className="flex h-6 shrink-0 items-center justify-center"
        >
          <span className="h-1 w-9 rounded-2 bg-border-default" />
        </button>

        <div className="flex shrink-0 items-center gap-2 px-4 pt-1">
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

        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-3">
          {countLabel ? <p className="label-l text-text-primary">{countLabel}</p> : <span />}
          {!list && (
            <p className="flex min-w-0 items-center gap-1 caption text-text-secondary">
              <Icon name="pin" size={14} className="shrink-0" />
              <span className="truncate">{placeLabel}</span>
            </p>
          )}
        </div>

        {/* Results */}
        {results && results.length === 0 ? (
          <EmptyState
            icon="search"
            title={`No stores match “${query.trim()}”`}
            className="py-10"
            actions={
              <>
                <Button variant="secondary" fullWidth onClick={() => setQuery('')}>
                  See all stores
                </Button>
                <Button variant="ghost" leadingIcon="locate" onClick={() => (located ? setQuery('') : allow())}>
                  Use my location
                </Button>
              </>
            }
          >
            SALT is in Saudi Arabia, the UAE, Kuwait, Qatar and Bahrain. Try a district, mall or street name.
          </EmptyState>
        ) : !list && noneNearby && closest ? (
          <div className={cn('flex flex-col', list && 'min-h-0 flex-1 overflow-y-auto')}>
            <EmptyState icon="store" title="No SALT near you yet" className="py-6">
              Our closest store is in {closest.store.name.replace(/^SALT /, '')}, about {formatDistance(closest.km ?? 0)} away. You can
              still order ahead for a later visit.
            </EmptyState>
            <p className="overline-text px-4 pt-2 pb-2 text-text-secondary">Closest store</p>
            <div className="px-4 pb-8">
              <StoreCard store={closest.store} distanceKm={closest.km} onOrder={() => order(closest.store)} />
            </div>
          </div>
        ) : list ? (
          <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-8">
            {listed.map(({ store, km }) => (
              <li key={store.id}>
                <StoreCard
                  store={store}
                  distanceKm={km}
                  onOrder={() => order(store)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div
            ref={cardsRef}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {shown.map(({ store, km }) => (
              <div key={store.id} data-store={store.id} className="w-[326px] max-w-[calc(100%-32px)] shrink-0 snap-center">
                <StoreCard
                  store={store}
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
