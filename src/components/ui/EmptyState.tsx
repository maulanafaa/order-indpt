import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from './Icon'

type EmptyStateProps = {
  icon: IconName
  /** Plain icon (search screens) or icon in a muted circle (errors). */
  iconStyle?: 'plain' | 'circle'
  title: ReactNode
  /** Title/L for full screens, Title/M for blocks inside a page. */
  size?: 'l' | 'm'
  children?: ReactNode
  actions?: ReactNode
  className?: string
}

/** Empty, no-result and error blocks used across screens. */
export function EmptyState({ icon, iconStyle = 'plain', title, size = 'l', children, actions, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 text-center', className)}>
      {iconStyle === 'circle' ? (
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-surface-muted">
          <Icon name={icon} size={24} />
        </span>
      ) : (
        <Icon name={icon} size={36} className="mb-4" />
      )}
      <h2 className={cn('text-text-primary', size === 'l' ? 'title-l' : 'title-m')}>{title}</h2>
      {children && <div className="mt-2 body-s text-text-secondary">{children}</div>}
      {actions && <div className="mt-6 flex w-full flex-col items-center gap-3">{actions}</div>}
    </div>
  )
}
