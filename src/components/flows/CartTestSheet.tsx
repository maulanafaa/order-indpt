import { useCart } from '../../lib/cart'
import { CART_PRESETS, useAvailabilityOverrides } from '../../lib/testCart'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

/**
 * Prototype only (not in Figma): the gear on the cart sheet. Replaces the cart with a
 * ready-made set of lines, forcing sold out items or unavailable add-ons where needed.
 */
export function CartTestSheet({ storeSlug, open, onClose }: { storeSlug: string; open: boolean; onClose: () => void }) {
  const replace = useCart((s) => s.replace)
  const setOverrides = useAvailabilityOverrides((s) => s.set)
  const forced = useAvailabilityOverrides((s) => s.soldOut.length + s.unavailableMods.length)

  return (
    <BottomSheet open={open} onClose={onClose} title="Test settings">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-1">
          <h3 className="title-s text-text-primary">Fill the cart with</h3>
          <ul className="flex flex-col">
            {CART_PRESETS.map((p) => (
              <li key={p.id} className="border-b border-border-default last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    setOverrides(p.overrides)
                    replace(storeSlug, p.lines())
                    onClose()
                  }}
                  className="flex w-full items-center gap-3 py-3 text-start active:bg-surface-muted"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="label-m text-text-primary">{p.label}</span>
                    <span className="body-s text-text-secondary">{p.detail}</span>
                  </span>
                  <Icon name="chev" size={18} className="shrink-0 text-text-tertiary" />
                </button>
              </li>
            ))}
          </ul>
        </section>
        {forced > 0 && (
          <Button variant="secondary" fullWidth onClick={() => setOverrides({ soldOut: [], unavailableMods: [] })}>
            Make everything available again
          </Button>
        )}
        <p className="body-s text-text-secondary">
          Replaces the cart at this branch. Sold out items and unavailable add-ons are forced here only, on top of the branch’s own.
        </p>
      </div>
    </BottomSheet>
  )
}
