import { useCallback, useEffect, useRef, useState } from 'react'
import { CARD_GLIDE_MS, easeCard } from '../../lib/motion'
import { cn } from '../../lib/cn'
import type { LatLng } from '../../lib/geo'
import { Icon } from '../ui/Icon'

/**
 * A tile map without a map SDK: OpenStreetMap tile images placed with Web
 * Mercator maths, plus store pins. With `interactive` it pans (drag), zooms
 * (pinch, trackpad, mouse wheel, double tap) and stays put otherwise. If tiles
 * cannot load, a muted grid shows instead.
 */
export type MapPinData = { id: string; point: LatLng; label?: string; /** Green dot: an active order at this store. */ activeOrder?: boolean }

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
  /** Called with the new visual centre after the person pans or zooms (settled, debounced). */
  onMoveEnd?: (center: LatLng) => void
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
  useEffect(() => {
    viewRef.current = view
    sizeRef.current = size
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
    moveTimer.current = window.setTimeout(() => onMoveEndRef.current?.(viewRef.current.center), 250)
  }, [])
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
          activeOrder={p.activeOrder}
          onClick={onPinClick ? () => onPinClick(p.id) : undefined}
        />
      ))}

      <p className="pointer-events-none absolute bottom-1 start-1 rounded-2 bg-surface-base/80 px-1 text-[9px] leading-3 text-text-tertiary">
        © OpenStreetMap contributors
      </p>
    </div>
  )
}

/**
 * Figma "Map pin": white circle with the logo (Default 36), black circle (Selected 48),
 * a tail under it, and a green dot when the store has an active order.
 */
function MapPin({
  left,
  top,
  label,
  selected,
  activeOrder,
  onClick,
}: {
  left: number
  top: number
  label?: string
  selected: boolean
  activeOrder?: boolean
  onClick?: () => void
}) {
  const size = selected ? 48 : 36
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ? `${label}${activeOrder ? ', active order' : ''}${selected ? ', selected' : ''}` : 'Store'}
      aria-pressed={selected}
      className={cn('absolute flex -translate-x-1/2 flex-col items-center', selected ? 'z-20' : 'z-10')}
      style={{ left, top: top - size - 6 }}
    >
      <span
        className={cn(
          'relative flex items-center justify-center rounded-full transition-all duration-500 ease-card',
          selected
            ? 'size-12 bg-surface-inverse text-text-on-inverse ring-2 ring-surface-base shadow-[0_2px_12px_rgb(0_0_0/0.2)]'
            : 'size-9 bg-surface-base text-text-primary inset-ring inset-ring-border-default shadow-[0_2px_8px_rgb(0_0_0/0.12)]',
        )}
      >
        {/* Placeholder until the SALT logo SVG is added (Figma Brand/Logo). */}
        <Icon name="store" size={selected ? 28 : 20} />
        {activeOrder && (
          <span
            aria-hidden
            className={cn(
              'absolute -top-0.75 rounded-full bg-state-success ring-2 ring-surface-base',
              selected ? '-end-0.75 size-4' : '-end-0.75 size-3.5',
            )}
          />
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          '-mt-px border-x-transparent',
          selected ? 'border-x-[7px] border-t-8 border-t-surface-inverse' : 'border-x-[6px] border-t-[7px] border-t-surface-base drop-shadow-[0_1px_0_var(--color-border-default)]',
        )}
      />
      {label && (
        <span className="mt-0.5 max-w-28 truncate label-s text-text-primary [text-shadow:0_0_2px_var(--color-surface-base),0_0_2px_var(--color-surface-base),0_0_3px_var(--color-surface-base)]">
          {label}
        </span>
      )}
    </button>
  )
}
