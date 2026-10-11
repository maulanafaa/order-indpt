import type { Store } from '../../data/schema'
import { branchAction, branchBadge, driveTime, type BranchState } from '../../lib/branch'
import { cn } from '../../lib/cn'
import { directionsUrl } from '../../lib/geo'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'

type StoreCardProps = {
  store: Store
  state: BranchState
  /** Distance from the person; shown as a drive time. Hidden when location is off. */
  distanceKm?: number | null
  selected?: boolean
  onSelect?: () => void
  onOrder: () => void
  className?: string
}

/**
 * Figma "Store card": State (Default, Selected) × Availability (Open, Opening soon,
 * Closed, Paused). Directions on the left, the main action on the right.
 */
export function StoreCard({ store, state, distanceKm, selected, onSelect, onOrder, className }: StoreCardProps) {
  return (
    <article
      onClick={onSelect}
      aria-current={selected || undefined}
      className={cn(
        // Same height for every card: the text block is fixed (two-line address), actions at the bottom.
        'flex flex-col gap-1.5 rounded-8 bg-surface-base p-4 transition-[box-shadow,scale] duration-500 ease-card',
        selected ? 'inset-ring-2 inset-ring-border-strong' : 'inset-ring inset-ring-border-default',
        onSelect && 'cursor-pointer active:scale-[0.98]',
        className,
      )}
    >
      <div className="flex h-26 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate title-l text-text-primary">{store.name}</h3>
          {distanceKm != null && <span className="shrink-0 caption text-text-tertiary">{driveTime(distanceKm)}</span>}
        </div>
        <p className="line-clamp-2 body-s text-text-secondary">{store.address || store.country}</p>
        <div className="flex items-center pt-1">
          <Badge variant={branchBadge[state.kind]}>{state.label}</Badge>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2.5">
        <IconButton
          icon="nav"
          label={`Directions to ${store.name}`}
          variant="muted"
          onClick={(e) => {
            e.stopPropagation()
            window.open(directionsUrl({ lat: store.lat, lng: store.lng }), '_blank', 'noopener')
          }}
        />
        <Button
          size="md"
          variant={state.kind === 'paused' ? 'secondary' : 'primary'}
          className="w-35"
          onClick={(e) => {
            e.stopPropagation()
            onOrder()
          }}
        >
          {branchAction[state.kind]}
        </Button>
      </div>
    </article>
  )
}
