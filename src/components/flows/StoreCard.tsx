import type { Store } from '../../data/schema'
import { cn } from '../../lib/cn'
import { directionsUrl, formatDistance } from '../../lib/geo'
import { openStatus } from '../../lib/hours'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

type StoreCardProps = {
  store: Store
  distanceKm?: number | null
  selected?: boolean
  onSelect?: () => void
  onOrder: () => void
  className?: string
}

/** Figma "Store card": Default / Selected. Closed stores show Schedule instead of Order. */
export function StoreCard({ store, distanceKm, selected, onSelect, onOrder, className }: StoreCardProps) {
  const status = openStatus(store)
  return (
    <article
      onClick={onSelect}
      aria-current={selected || undefined}
      className={cn(
        // Same height for every card: tall enough for a two-line address.
        'flex min-h-49 flex-col gap-1.5 rounded-8 bg-surface-base p-4 transition-shadow',
        selected ? 'inset-ring-2 inset-ring-border-strong' : 'inset-ring inset-ring-border-default',
        onSelect && 'cursor-pointer',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate title-l text-text-primary">{store.name}</h3>
        {distanceKm != null && <span className="shrink-0 pt-1 caption text-text-tertiary">{formatDistance(distanceKm)}</span>}
      </div>
      <p className="line-clamp-2 body-s text-text-secondary">{store.address || store.country}</p>
      <div className="flex items-center pt-1">
        <Badge variant={status.open ? 'success' : 'error'}>{status.label}</Badge>
      </div>
      {/* Buttons sit at the bottom; any spare height (one-line address) goes above them. */}
      <div className="mt-auto flex gap-2 pt-2.5">
        <Button
          variant="tertiary"
          size="md"
          leadingIcon="nav"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation()
            window.open(directionsUrl({ lat: store.lat, lng: store.lng }), '_blank', 'noopener')
          }}
        >
          Directions
        </Button>
        <Button
          size="md"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation()
            onOrder()
          }}
        >
          {status.open ? 'Order' : 'Schedule'}
        </Button>
      </div>
    </article>
  )
}
