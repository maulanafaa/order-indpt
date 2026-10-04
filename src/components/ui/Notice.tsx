import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from './Icon'

export type NoticeTone = 'neutral' | 'warning' | 'error' | 'success'
export type NoticeSize = 'default' | 'compact'

const tones: Record<NoticeTone, { bg: string; icon: string }> = {
  neutral: { bg: 'bg-surface-muted', icon: 'text-text-primary' },
  warning: { bg: 'bg-state-warning-subtle', icon: 'text-state-warning' },
  error: { bg: 'bg-state-error-subtle', icon: 'text-state-error' },
  success: { bg: 'bg-state-success-subtle', icon: 'text-state-success' },
}

type NoticeProps = {
  tone?: NoticeTone
  size?: NoticeSize
  /** Optional title, Default size only. */
  title?: string
  icon?: IconName
  className?: string
  children: ReactNode
}

/** Figma "Notice": inline message in a page or sheet. Tone × Size. */
export function Notice({ tone = 'neutral', size = 'default', title, icon = 'info', className, children }: NoticeProps) {
  const t = tones[tone]
  const compact = size === 'compact'
  const neutralCompact = compact && tone === 'neutral'
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex w-full',
        t.bg,
        compact ? 'items-center gap-1.5 rounded-6 px-2.5 py-2' : 'items-start gap-2.5 rounded-4 p-3',
        className,
      )}
    >
      <Icon
        name={icon}
        size={compact ? 16 : 20}
        className={cn('shrink-0', neutralCompact ? 'text-text-secondary' : t.icon, compact && 'self-start mt-px')}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title && !compact && <p className={cn('label-m', tone === 'error' ? 'text-state-error' : 'text-text-primary')}>{title}</p>}
        <div className={cn('body-s', neutralCompact ? 'text-text-secondary' : 'text-text-primary')}>{children}</div>
      </div>
    </div>
  )
}
