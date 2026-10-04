import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { IconButton } from './IconButton'

type SheetHeaderProps = {
  title: ReactNode
  titleId?: string
  onClose: () => void
  /** Back arrow before the title (second step of a sheet). */
  onBack?: () => void
  /** Help button before the close button. */
  onHelp?: () => void
  /** Bottom border, for sheets whose body scrolls under the header (cart). */
  divider?: boolean
  className?: string
}

/** Sheet header from Figma (cart, login): grab handle, Title/L at the start, round 32 px actions at the end. */
export function SheetHeader({ title, titleId, onClose, onBack, onHelp, divider, className }: SheetHeaderProps) {
  return (
    <div className={cn('flex shrink-0 flex-col gap-2.5 bg-surface-base px-4 pt-2.5', divider ? 'border-b border-border-default pb-3' : 'pb-0', className)}>
      <span aria-hidden className="mx-auto h-1 w-9 rounded-2 bg-border-default" />
      <div className="flex items-start gap-2 pt-3.5">
        {onBack && <IconButton icon="back" label="Back" variant="outline" size={32} onClick={onBack} />}
        <h2 id={titleId} className="min-w-0 flex-1 title-l text-text-primary">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {onHelp && <IconButton icon="help" label="Help" variant="outline" size={32} onClick={onHelp} />}
          <IconButton icon="x" label="Close" variant="outline" size={32} onClick={onClose} />
        </div>
      </div>
    </div>
  )
}
