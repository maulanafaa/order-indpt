import { cn } from '../../lib/cn'
import { Icon, type IconName } from './Icon'
import type { ToastOptions, ToastType } from './toastContext'

const icons: Record<ToastType, IconName> = { success: 'check', info: 'info', error: 'alert' }

type ToastProps = Omit<ToastOptions, 'duration'> & { className?: string }

/** Figma "Toast": short confirmation, black, shown above the bottom bar for about 3 s. */
export function Toast({ type = 'success', message, showIcon = true, action, className }: ToastProps) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-8 bg-surface-inverse px-3.5 py-3 text-text-on-inverse shadow-toast',
        className,
      )}
    >
      {showIcon && <Icon name={icons[type]} size={18} className="shrink-0" />}
      <p className="min-w-0 flex-1 body-m">{message}</p>
      {action && (
        <button type="button" className="cta-m text-text-on-inverse" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
