import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Smooth open and close for inline content (card form, order summary items):
 * the height eases between 0 and auto while the content fades. Closed content
 * stays mounted but inert, so it keeps its values and is skipped by focus.
 */
export function Collapse({ open, id, className, children }: { open: boolean; id?: string; className?: string; children: ReactNode }) {
  return (
    <div
      id={id}
      inert={!open}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-card motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
