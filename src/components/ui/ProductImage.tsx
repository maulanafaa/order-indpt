import { useState } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

type ProductImageProps = {
  /** /images/menu/{slug}.webp or /images/stores/{slug}.webp */
  src: string
  alt: string
  /** Dims the photo (sold out). */
  dimmed?: boolean
  iconSize?: number
  className?: string
}

/**
 * Photo that falls back to the Figma placeholder (muted block with an image
 * icon) when the file is missing. Photos are added by hand later.
 */
export function ProductImage({ src, alt, dimmed, iconSize = 28, className }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = failedSrc === src
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden bg-surface-muted', className)}>
      {failed ? (
        <Icon name="image" size={iconSize} className={cn('text-text-tertiary', dimmed && 'opacity-50')} aria-label={alt} />
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          className={cn('size-full object-cover', dimmed && 'opacity-50 grayscale')}
        />
      )}
    </div>
  )
}
