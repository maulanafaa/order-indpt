import { useNavigate, useSearchParams } from 'react-router'
import { isPaused } from '../../lib/branch'
import { cn } from '../../lib/cn'
import { stores, storeById } from '../../lib/data'
import { demoBranches } from '../../lib/demoBranches'
import type { LocationFlag } from '../../lib/scenarios'
import { nearPresets } from '../../lib/scenarios'
import { BottomSheet } from '../ui/BottomSheet'
import { Chip } from '../ui/Chip'
import { Icon } from '../ui/Icon'

const PERMISSIONS: { value: LocationFlag; label: string }[] = [
  { value: 'prompt', label: 'Ask' },
  { value: 'granted', label: 'Allowed' },
  { value: 'denied', label: 'Denied' },
]

const PLACES: { key: string; label: string }[] = [
  { key: 'riyadh', label: 'Riyadh' },
  { key: 'khobar', label: 'Al Khobar' },
  { key: 'dubai', label: 'Dubai' },
  { key: 'hail', label: 'Ha’il (no store nearby)' },
]

/** Branches that show each state (lib/demoBranches.ts), plus a plain open one and a paused one. */
function testStores() {
  const open = stores.find((s) => s.slug === 'salt-u-walk')
  const paused = stores.find((s) => isPaused(s))
  const rows = [
    ...(open ? [{ store: open, label: 'Open, no active order' }] : []),
    ...Object.entries(demoBranches).map(([id, b]) => ({ store: storeById.get(id), label: b.label })),
    ...(paused ? [{ store: paused, label: 'Online ordering paused' }] : []),
  ]
  return rows.filter((r): r is { store: NonNullable<typeof r.store>; label: string } => Boolean(r.store))
}

/**
 * Prototype only (not in Figma): the gear on Find a store. Set the location
 * permission and where "you" are, and jump to a branch in each state.
 */
export function FindStoreTestSheet({
  open,
  onClose,
  permission,
  onPermission,
}: {
  open: boolean
  onClose: () => void
  permission: LocationFlag
  onPermission: (p: LocationFlag) => void
}) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const near = nearPresets[params.get('near') ?? ''] ? (params.get('near') as string) : 'riyadh'

  const setNear = (key: string) =>
    setParams(
      (p) => {
        if (key === 'riyadh') p.delete('near')
        else p.set('near', key)
        return p
      },
      { replace: true },
    )

  return (
    <BottomSheet open={open} onClose={onClose} title="Test settings">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h3 className="overline-text text-text-tertiary">Location access</h3>
          <div role="radiogroup" aria-label="Location access" className="flex gap-2">
            {PERMISSIONS.map((o) => (
              <Chip
                key={o.value}
                role="radio"
                aria-checked={permission === o.value}
                selected={permission === o.value}
                onClick={() => onPermission(o.value)}
                className="flex-1"
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </section>

        <section className={cn('flex flex-col gap-3 transition-opacity duration-200', permission !== 'granted' && 'opacity-40')}>
          <h3 className="overline-text text-text-tertiary">You are in</h3>
          <div role="radiogroup" aria-label="You are in" inert={permission !== 'granted'} className="flex flex-wrap gap-2">
            {PLACES.map((o) => (
              <Chip key={o.key} role="radio" aria-checked={near === o.key} selected={near === o.key} onClick={() => setNear(o.key)}>
                {o.label}
              </Chip>
            ))}
          </div>
          {permission !== 'granted' && <p className="body-s text-text-secondary">Allow location to use this.</p>}
        </section>

        <section className="flex flex-col gap-1">
          <h3 className="overline-text text-text-tertiary">Stores to try</h3>
          <ul className="flex flex-col">
            {testStores().map(({ store, label }) => (
              <li key={store.id} className="border-b border-border-default last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate(`/store/${store.slug}`)
                  }}
                  className="flex w-full items-center gap-3 py-3 text-start active:bg-surface-muted"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="label-m text-text-primary">{label}</span>
                    <span className="truncate body-s text-text-secondary">{store.name}</span>
                  </span>
                  <Icon name="chev" size={18} className="shrink-0 text-text-tertiary" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </BottomSheet>
  )
}
