import type { OrderMethod } from '../../data/schema'
import { cn } from '../../lib/cn'
import { methodLabels, servicesByStore } from '../../lib/data'
import { Icon } from '../ui/Icon'

/** Figma order: Dine-in · Pickup · Carhop. */
const order: OrderMethod[] = ['dineIn', 'pickup', 'carhop']

/** Figma "Order methods": store icon and the methods this branch supports ("Dine-in · Pickup · Carhop"). */
export function OrderMethods({ storeId, className }: { storeId: string; className?: string }) {
  const supported = (servicesByStore.get(storeId) ?? []).filter((s) => s.supported).map((s) => s.method)
  const methods = order.filter((m) => supported.includes(m))
  if (!methods.length) return null
  return (
    <p className={cn('flex items-center gap-1.5 body-m text-text-secondary', className)}>
      <Icon name="store" size={14} className="shrink-0" />
      <span>
        <span className="sr-only">Order methods: </span>
        {methods.map((m) => methodLabels[m]).join(' · ')}
      </span>
    </p>
  )
}
