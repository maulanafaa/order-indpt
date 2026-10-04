import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type SectionCardProps = {
  title?: ReactNode
  /** Link or button at the end of the title row (e.g. "Edit"). */
  action?: ReactNode
  id?: string
  className?: string
  children: ReactNode
}

/** White card on the grey checkout page: Title/L heading, 16 px padding, radius 8. */
export function SectionCard({ title, action, id, className, children }: SectionCardProps) {
  return (
    <section id={id} className={cn('flex scroll-mt-20 flex-col gap-3 rounded-8 bg-surface-base p-4', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h2 className="title-l text-text-primary">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
