import { useCallback, useEffect, useRef, useState } from 'react'
import { CARD_GLIDE_MS, easeCard } from '../../lib/motion'
import { cn } from '../../lib/cn'
import type { LatLng } from '../../lib/geo'

/**
 * A tile map without a map SDK: OpenStreetMap tile images placed with Web
 * Mercator maths, plus store pins. With `interactive` it pans (drag), zooms
 * (pinch, trackpad, mouse wheel, double tap) and stays put otherwise. If tiles
 * cannot load, a muted grid shows instead.
 */
export type MapPinData = { id: string; point: LatLng; label?: string }

type StaticMapProps = {
  /** Where the map looks. Changing it recentres the map (zoom is kept). */
  center: LatLng
  /** Starting zoom. Changing it, or `resetKey`, resets centre and zoom. */
  zoom: number
  pins: MapPinData[]
  selectedId?: string | null
  onPinClick?: (id: string) => void
  /** The person's position (black dot with a halo). */
  user?: LatLng | null
  /** Show store names under pins. */
  showLabels?: boolean
  /** Move the visual centre up, e.g. when a panel covers the bottom. px. */
  offsetY?: number
  /** Drag, pinch and wheel to move around. Off for small inline maps. */
  interactive?: boolean
  /** Bump to send the map back to `center` and `zoom` (e.g. "my location"). */
  resetKey?: number
  /** Bump to move back to `center` keeping the zoom (e.g. a pin was chosen). */
  recenterKey?: number
  /**
   * Called after the person pans or zooms (settled, debounced) with the new visual
   * centre and the ids of pins in the visible part of the map (above the bottom panel).
   */
  onMoveEnd?: (center: LatLng, visibleIds: string[]) => void
  className?: string
}

const TILE = 256
const MIN_ZOOM = 3
const MAX_ZOOM = 18
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

type Point = { x: number; y: number }

/** Lat/lng to world pixels at a (possibly fractional) zoom. */
function project({ lat, lng }: LatLng, zoom: number): Point {
  const scale = TILE * 2 ** zoom
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale,
  }
}

function unproject({ x, y }: Point, zoom: number): LatLng {
  const scale = TILE * 2 ** zoom
  const lng = (x / scale) * 360 - 180
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI
  return { lat: Math.max(-85, Math.min(85, lat)), lng: ((((lng + 180) % 360) + 360) % 360) - 180 }
}

// OpenStreetMap standard tiles: keyless. Fine for a prototype; see the OSM tile usage policy before real traffic.
const tileUrl = (x: number, y: number, z: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`

type View = { center: LatLng; zoom: number }

/** Same motion as the store cards (--ease-card). */
const FLY_MS = CARD_GLIDE_MS

export function StaticMap({
  center,
  zoom,
  pins,
  selectedId,
  onPinClick,
  user,
  showLabels = true,
  offsetY = 0,
  interactive = false,
  resetKey = 0,
  recenterKey = 0,
  onMoveEnd,
  className,
}: StaticMapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 390, h: 400 })
  const [view, setView] = useState<View>({ center, zoom })

  // Follow the props: new centre recentres, new zoom or resetKey resets both.
  const propKey = `${center.lat},${center.lng},${recenterKey}|${zoom}|${resetKey}`
  const [prevKey, setPrevKey] = useState(propKey)
  // The move itself is animated (see the fly effect below).
  const [flight, setFlight] = useState<{ center: LatLng; zoom: number | null; n: number } | null>(null)
  if (propKey !== prevKey) {
    const [prevCenter, prevZoom, prevReset] = prevKey.split('|')
    const reset = prevZoom !== String(zoom) || prevReset !== String(resetKey)
    if (reset || prevCenter !== `${center.lat},${center.lng},${recenterKey}`) {
      setFlight((f) => ({ center, zoom: reset ? zoom : null, n: (f?.n ?? 0) + 1 }))
    }
    setPrevKey(propKey)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ------------------------------ gestures ------------------------------ */
  const viewRef = useRef(view)
  const sizeRef = useRef(size)
  const pinsRef = useRef(pins)
  useEffect(() => {
    viewRef.current = view
    sizeRef.current = size
    pinsRef.current = pins
  })
  const draggedRef = useRef(false)

  /* ------------------------- animated recentring ------------------------- */
  const frame = useRef(0)
  const stopFlight = useCallback(() => cancelAnimationFrame(frame.current), [])
  useEffect(() => {
    if (!flight) return
    const from = viewRef.current
    const toZoom = flight.zoom ?? from.zoom
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setView({ center: flight.center, zoom: toZoom })
      return
    }
    // Interpolate in world pixels at zoom 0, so the path is a straight line on screen.
    const a = project(from.center, 0)
    const b = project(flight.center, 0)
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FLY_MS)
      const k = easeCard(t)
      setView({
        zoom: from.zoom + (toZoom - from.zoom) * k,
        center: unproject({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, 0),
      })
      if (t < 1) frame.current = requestAnimationFrame(step)
    }
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
  }, [flight])

  // Tell the parent where the map settled, once the gesture is over.
  const onMoveEndRef = useRef(onMoveEnd)
  useEffect(() => {
    onMoveEndRef.current = onMoveEnd
  })
  const moveTimer = useRef(0)
  const notifyMoved = useCallback(() => {
    window.clearTimeout(moveTimer.current)
    moveTimer.current = window.setTimeout(() => {
      const v = viewRef.current
      const sz = sizeRef.current
      // The visible part: the map above the bottom panel (the visual centre sits offsetY above the middle).
      const bottom = sz.h - 2 * offsetY
      const c = project(v.center, v.zoom)
      const ox = c.x - sz.w / 2
      const oy = c.y - (sz.h / 2 - offsetY)
      const visibleIds = (pinsRef.current ?? [])
        .filter((p) => {
          const q = project(p.point, v.zoom)
          const x = q.x - ox
          const y = q.y - oy
          return x >= 0 && x <= sz.w && y >= 0 && y <= bottom
        })
        .map((p) => p.id)
      onMoveEndRef.current?.(v.center, visibleIds)
    }, 250)
  }, [offsetY])
  useEffect(() => () => window.clearTimeout(moveTimer.current), [])

  /** Screen point (relative to the map box) of the visual centre. */
  const screenCenter = (sz: { w: number; h: number }) => ({ x: sz.w / 2, y: sz.h / 2 - offsetY })

  /** Zoom to `nextZoom` keeping the geographic point under `anchor` still. */
  const zoomAround = useCallback(
    (anchorLatLng: LatLng, anchor: Point, nextZoom: number) => {
      const z = clampZoom(nextZoom)
      const sc = { x: sizeRef.current.w / 2, y: sizeRef.current.h / 2 - offsetY }
      const a = project(anchorLatLng, z)
      setView({ zoom: z, center: unproject({ x: a.x - (anchor.x - sc.x), y: a.y - (anchor.y - sc.y) }, z) })
    },
    [offsetY],
  )

  const toLatLng = useCallback(
    (pt: Point) => {
      const v = viewRef.current
      const sc = { x: sizeRef.current.w / 2, y: sizeRef.current.h / 2 - offsetY }
      const c = project(v.center, v.zoom)
      return unproject({ x: c.x + pt.x - sc.x, y: c.y + pt.y - sc.y }, v.zoom)
    },
    [offsetY],
  )

  useEffect(() => {
    const el = ref.current
    if (!el || !interactive) return
    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    // Wheel and trackpad pinch (ctrlKey wheel). Non-passive so the page does not zoom.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      stopFlight()
      const pt = local(e)
      const factor = e.ctrlKey ? 0.01 : 0.002
      zoomAround(toLatLng(pt), pt, viewRef.current.zoom - e.deltaY * factor)
      notifyMoved()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [interactive, toLatLng, zoomAround, notifyMoved, stopFlight])

  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef<{
    startView: View
    start: Point // single finger: start point; two fingers: start midpoint
    startDist: number
    anchor: LatLng
  } | null>(null)

  const beginGesture = () => {
    const pts = [...pointers.current.values()]
    if (!pts.length) {
      gesture.current = null
      return
    }
    const mid = pts.length >= 2 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[0]
    const dist = pts.length >= 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0
    gesture.current = { startView: viewRef.current, start: mid, startDist: dist, anchor: toLatLng(mid) }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || (e.pointerType === 'mouse' && e.button !== 0)) return
    const el = ref.current
    if (!el) return
    stopFlight()
    const r = el.getBoundingClientRect()
    pointers.current.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top })
    if (pointers.current.size === 1) draggedRef.current = false
    beginGesture()

    // Listen on window so a drag that leaves the map still tracks, and pin clicks still work.
    if (pointers.current.size === 1) {
      const move = (ev: PointerEvent) => {
        if (!pointers.current.has(ev.pointerId)) return
        const rr = el.getBoundingClientRect()
        pointers.current.set(ev.pointerId, { x: ev.clientX - rr.left, y: ev.clientY - rr.top })
        const g = gesture.current
        if (!g) return
        const pts = [...pointers.current.values()]
        if (pts.length >= 2) {
          const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
          draggedRef.current = true
          zoomAround(g.anchor, mid, g.startView.zoom + Math.log2(dist / (g.startDist || dist)))
        } else {
          const dx = pts[0].x - g.start.x
          const dy = pts[0].y - g.start.y
          if (!draggedRef.current && Math.hypot(dx, dy) < 5) return
          draggedRef.current = true
          const c = project(g.startView.center, g.startView.zoom)
          setView({ zoom: g.startView.zoom, center: unproject({ x: c.x - dx, y: c.y - dy }, g.startView.zoom) })
        }
      }
      const up = (ev: PointerEvent) => {
        pointers.current.delete(ev.pointerId)
        beginGesture()
        if (pointers.current.size === 0) {
          if (draggedRef.current) notifyMoved()
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          window.removeEventListener('pointercancel', up)
        }
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    }
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    if (!interactive) return
    stopFlight()
    const r = e.currentTarget.getBoundingClientRect()
    const pt = { x: e.clientX - r.left, y: e.clientY - r.top }
    zoomAround(toLatLng(pt), pt, Math.round(viewRef.current.zoom) + 1)
    notifyMoved()
  }

  /* ------------------------------- layout -------------------------------- */
  const z = Math.round(view.zoom) // tile zoom
  const scale = 2 ** (view.zoom - z)
  const tileSize = TILE * scale
  const sc = screenCenter(size)
  const c = project(view.center, view.zoom) // world px at view zoom
  const originX = c.x - sc.x
  const originY = c.y - sc.y
  const n = 2 ** z
  const tiles: { x: number; y: number; left: number; top: number }[] = []
  for (let tx = Math.floor(originX / tileSize); tx <= Math.floor((originX + size.w) / tileSize); tx++) {
    for (let ty = Math.floor(originY / tileSize); ty <= Math.floor((originY + size.h) / tileSize); ty++) {
      if (ty < 0 || ty >= n) continue
      tiles.push({ x: ((tx % n) + n) % n, y: ty, left: tx * tileSize - originX, top: ty * tileSize - originY })
    }
  }
  const toScreen = (p: LatLng) => {
    const q = project(p, view.zoom)
    return { left: q.x - originX, top: q.y - originY }
  }
  const visible = pins
    .map((p) => ({ ...p, ...toScreen(p.point) }))
    .filter((p) => p.left > -40 && p.left < size.w + 40 && p.top > -40 && p.top < size.h + 60)
    // Selected pin on top.
    .sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId))

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      // A drag that ends on a pin should not select it.
      onClickCapture={(e) => {
        if (draggedRef.current) {
          e.stopPropagation()
          e.preventDefault()
          draggedRef.current = false
        }
      }}
      className={cn(
        // Callers may position the map (absolute inset-0); otherwise it is relative for the pins.
        /\b(absolute|fixed)\b/.test(className ?? '') ? null : 'relative',
        // isolate: pins stack inside the map, never above panels laid over it.
        'isolate overflow-hidden bg-surface-muted select-none',
        interactive && 'cursor-grab touch-none active:cursor-grabbing',
        '[background-image:linear-gradient(var(--color-border-default)_1px,transparent_1px),linear-gradient(90deg,var(--color-border-default)_1px,transparent_1px)] [background-size:48px_48px]',
        className,
      )}
    >
      {tiles.map((t) => (
        <img
          key={`${z}-${t.x}-${t.y}-${Math.round(t.left / tileSize)}`}
          src={tileUrl(t.x, t.y, z)}
          alt=""
          draggable={false}
          onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
          className="pointer-events-none absolute max-w-none select-none"
          // +0.5px hides hairline seams between scaled tiles.
          style={{ left: t.left, top: t.top, width: tileSize + 0.5, height: tileSize + 0.5 }}
        />
      ))}

      {user && (() => {
        const u = toScreen(user)
        return (
          <span aria-label="You are here" role="img" className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={u}>
            <span className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface-inverse/10" />
            <span className="relative block size-3.5 rounded-full bg-surface-inverse ring-[3px] ring-surface-base" />
          </span>
        )
      })()}

      {visible.map((p) => (
        <MapPin
          key={p.id}
          left={p.left}
          top={p.top}
          label={showLabels ? p.label : undefined}
          selected={p.id === selectedId}
          onClick={onPinClick ? () => onPinClick(p.id) : undefined}
        />
      ))}

      <p className="pointer-events-none absolute bottom-1 start-1 rounded-2 bg-surface-base/80 px-1 text-[9px] leading-3 text-text-tertiary">
        © OpenStreetMap contributors
      </p>
    </div>
  )
}

/** Latin SALT wordmark from Figma salt-logo (814:34825), drawn in currentColor. */
function SaltMark({ width }: { width: number }) {
  return (
    <svg width={width} viewBox="0 0 38.66 20.1" fill="currentColor" aria-hidden className="block">
      <path d="M6.01852 8.84831L5.99846 8.82893C4.3909 7.26614 3.32877 6.23475 3.32877 4.84977C3.32877 3.84311 3.85014 3.2422 4.72377 3.2422C5.41359 3.2422 6.11878 3.53096 6.11878 5.66993V6.55359C6.11878 6.69129 6.23241 6.80425 6.37211 6.80425H8.9596C9.09997 6.80425 9.2136 6.69129 9.2136 6.55359V5.51753C9.2136 2.16201 7.66084 0.388672 4.72377 0.388672C1.33685 0.388672 0.129675 2.76026 0.129675 4.97944C0.129675 7.74139 1.94512 9.47797 3.4043 10.8743L3.56739 11.0267C5.06534 12.4318 6.24912 13.5407 6.24912 15.1503C6.24912 16.5239 5.40557 16.8126 4.69837 16.8126C3.60483 16.8126 3.09549 16.1302 3.09549 14.6643V13.2466C3.09549 13.0374 2.9237 12.8669 2.71181 12.8669H0.384346C0.172454 12.8669 0 13.0374 0 13.2466V14.8956C0 17.7792 1.89833 19.7163 4.72377 19.7163C7.54855 19.7163 9.44688 17.7892 9.44688 14.921C9.44688 12.389 8.0258 10.8068 6.01852 8.84831Z" />
      <path d="M29.8169 16.4792H25.3772V0.946282C25.3772 0.808586 25.2636 0.696289 25.1239 0.696289H22.3285C22.1888 0.696289 22.0752 0.808586 22.0752 0.946282V19.1603C22.0752 19.298 22.1888 19.4103 22.3285 19.4103H29.8169C29.9566 19.4103 30.0703 19.298 30.0703 19.1603V16.7299C30.0703 16.5915 29.9566 16.4792 29.8169 16.4792Z" />
      <path d="M38.4028 0.696289H29.0749C28.9352 0.696289 28.8215 0.808586 28.8215 0.946282V3.40142C28.8215 3.53979 28.9352 3.65208 29.0749 3.65208H32.1135V19.1603C32.1135 19.298 32.2272 19.4103 32.3669 19.4103H35.1622C35.3019 19.4103 35.4162 19.298 35.4162 19.1603V3.65208H38.4028C38.5431 3.65208 38.6561 3.53979 38.6561 3.40142V0.946282C38.6561 0.808586 38.5431 0.696289 38.4028 0.696289Z" />
      <path d="M13.9394 12.9279L15.0877 5.40604C15.1131 5.24361 15.3504 5.24361 15.3745 5.40671L16.4988 12.9279H13.9394ZM17.1859 0.962324C17.1585 0.807917 17.0235 0.696289 16.8644 0.696289H13.5737C13.4147 0.696289 13.2796 0.808585 13.2522 0.962324L10.0465 19.1169C10.0338 19.1897 10.0538 19.2639 10.1019 19.3214C10.1507 19.3782 10.2216 19.4103 10.2964 19.4103H12.9802C13.1058 19.4103 13.2135 19.3181 13.2308 19.1951L13.7449 15.5675H16.6933L17.2073 19.1951C17.2247 19.3181 17.3323 19.4103 17.458 19.4103H20.1404C20.2159 19.4103 20.2861 19.3782 20.3349 19.3214C20.383 19.2639 20.4031 19.1897 20.3904 19.1169L17.1859 0.962324Z" />
    </svg>
  )
}

/**
 * Figma 854:178611 "Map pin": a teardrop with a white 2px edge and a SALT badge.
 * Default: white 32 × 37 pin, 24px black badge. Selected: black 46 × 53 pin, 35px badge.
 * Paths are the Figma exports; the tip sits on the store's point.
 */
const pinShapes = {
  default: {
    box: { w: 34, h: 39 },
    viewBox: '12 10 34 39',
    tip: 37.6,
    d: 'M29 11C37.8367 11 45.0007 18.1634 45.001 27C45.001 32.2006 42.3251 36.0424 39.2041 39.1885C37.6474 40.7576 35.9435 42.1893 34.3809 43.5303C32.799 44.8877 31.3697 46.1465 30.2666 47.4229C29.6013 48.1927 28.3997 48.1927 27.7344 47.4229C26.6313 46.1465 25.2019 44.8877 23.6201 43.5303C22.0575 42.1893 20.3536 40.7576 18.7969 39.1885C15.6759 36.0424 13 32.2006 13 27C13.0002 18.1635 20.1635 11.0002 29 11Z',
    badge: { size: 24, top: 5, mark: 17 },
  },
  selected: {
    box: { w: 48, h: 56 },
    viewBox: '12 10 48 56',
    tip: 54.3,
    d: 'M36 11C48.7025 11 59 21.2975 59 34C59 41.4478 55.174 46.9693 50.6328 51.5469C48.3661 53.8318 45.8849 55.9167 43.5869 57.8887C41.2699 59.877 39.1478 61.7444 37.5039 63.6465C36.7142 64.5602 35.2858 64.5602 34.4961 63.6465C32.8522 61.7444 30.7301 59.877 28.4131 57.8887C26.1151 55.9167 23.6339 53.8318 21.3672 51.5469C16.826 46.9693 13 41.4478 13 34C13 21.2975 23.2975 11 36 11Z',
    badge: { size: 35, top: 6.5, mark: 24 },
  },
} as const

function MapPin({
  left,
  top,
  label,
  selected,
  onClick,
}: {
  left: number
  top: number
  label?: string
  selected: boolean
  onClick?: () => void
}) {
  const shape = pinShapes[selected ? 'selected' : 'default']
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ? `${label}${selected ? ', selected' : ''}` : 'Store'}
      aria-pressed={selected}
      className={cn('absolute flex -translate-x-1/2 flex-col items-center', selected ? 'z-20' : 'z-10')}
      style={{ left, top: top - shape.tip }}
    >
      <span key={selected ? 'on' : 'off'} className={cn('relative block origin-bottom', selected && 'animate-pin-in')} style={{ width: shape.box.w, height: shape.box.h }}>
        <svg
          width={shape.box.w}
          height={shape.box.h}
          viewBox={shape.viewBox}
          aria-hidden
          className={cn('absolute inset-0 overflow-visible drop-shadow-[0_2px_6px_rgb(0_0_0/0.2)]', selected ? 'fill-surface-inverse' : 'fill-surface-base')}
        >
          <path d={shape.d} strokeWidth={2} className="stroke-surface-base" />
        </svg>
        <span
          className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full bg-surface-inverse text-text-on-inverse"
          style={{ top: shape.badge.top, width: shape.badge.size, height: shape.badge.size }}
        >
          <SaltMark width={shape.badge.mark} />
        </span>
      </span>
      {label && (
        <span className="mt-0.5 max-w-28 truncate label-s text-text-primary [text-shadow:0_0_2px_var(--color-surface-base),0_0_2px_var(--color-surface-base),0_0_3px_var(--color-surface-base)]">
          {label}
        </span>
      )}
    </button>
  )
}
