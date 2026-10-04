import { methodLabels, supportedServices } from '../../lib/data'
import { cn } from '../../lib/cn'
import type { OrderMethod } from '../../data/schema'
import { Icon, type IconName } from '../ui/Icon'

const icons: Record<OrderMethod, IconName> = { pickup: 'bag', carhop: 'car', dineIn: 'cup' }

/**
 * Order methods the branch supports. Methods it does not offer are hidden;
 * methods that are paused right now are shown disabled.
 */
export function ServiceChips({ storeId, size = 'md', className }: { storeId: string; size?: 'md' | 'sm'; className?: string }) {
  const services = supportedServices(storeId)
  if (!services.length) return null
  return (
    <ul className={cn('flex flex-wrap gap-2', size === 'sm' && 'gap-1.5', className)} aria-label="Order methods">
      {services.map((s) => (
        <li
          key={s.method}
          aria-disabled={!s.availableNow || undefined}
          title={s.availableNow ? undefined : `${methodLabels[s.method]} is paused right now`}
          className={cn(
            'inline-flex items-center rounded-full inset-ring inset-ring-border-default',
            size === 'md' ? 'h-[34px] gap-1.5 px-3 label-m' : 'h-[26px] gap-1 px-2 label-s',
            s.availableNow ? 'text-text-primary' : 'text-text-disabled',
          )}
        >
          <Icon name={icons[s.method]} size={size === 'md' ? 16 : 14} />
          {methodLabels[s.method]}
          {!s.availableNow && <span className="sr-only">, paused</span>}
        </li>
      ))}
    </ul>
  )
}
