import { cn } from '../../lib/cn'

/** 20px spinner used in the Loading state of buttons. Uses currentColor. */
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={cn('animate-spin', className)}
      aria-hidden
    >
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
