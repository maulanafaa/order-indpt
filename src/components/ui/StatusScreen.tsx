import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from './Icon'
import { IconButton } from './IconButton'

type StatusTone = 'success' | 'error' | 'warning' | 'neutral'

const tones: Record<StatusTone, { halo: string; dot: string }> = {
  success: { halo: 'bg-state-success-subtle', dot: 'bg-state-success' },
  error: { halo: 'bg-state-error-subtle', dot: 'bg-state-error' },
  warning: { halo: 'bg-state-warning-subtle', dot: 'bg-state-warning' },
  neutral: { halo: 'bg-surface-muted', dot: 'bg-surface-inverse' },
}

type StatusScreenProps = {
  tone: StatusTone
  icon: IconName
  title: string
  children: ReactNode
  /** Extra content under the text (order chip). */
  extra?: ReactNode
  /** Buttons pinned at the bottom. */
  actions?: ReactNode
  /** Bottom content without the action bar (auto-close progress). */
  footer?: ReactNode
  onHelp?: () => void
}

/** Figma checkout result screens: 136 px halo with a 96 px icon disc, Title/XL, Body/M. */
export function StatusScreen({ tone, icon, title, children, extra, actions, footer, onHelp }: StatusScreenProps) {
  const t = tones[tone]
  return (
    <div role={tone === 'success' ? 'status' : 'alert'} className="pointer-events-auto absolute inset-0 z-50 flex flex-col bg-surface-base animate-fade-in">
      {onHelp && (
        <div className="flex justify-end px-3 pt-2">
          <IconButton icon="help" label="Help" onClick={onHelp} />
        </div>
      )}
      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-8">
        <div className={cn('flex size-34 items-center justify-center rounded-full', t.halo)}>
          <div className={cn('flex size-24 items-center justify-center rounded-full text-text-on-inverse', t.dot)}>
            <Icon name={icon} size={48} />
          </div>
        </div>
        <div className={cn('flex w-full flex-col items-center gap-5', actions ? 'pb-10' : 'pb-24')}>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="title-xl text-text-primary">{title}</h1>
            <p className="body-m text-text-secondary">{children}</p>
          </div>
          {extra}
        </div>
      </div>
      {actions && <div className="flex flex-col gap-2 px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))]">{actions}</div>}
      {footer}
    </div>
  )
}
