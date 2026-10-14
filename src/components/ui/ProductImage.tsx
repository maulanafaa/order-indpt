import { useState } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'

type ProductImageProps = {
  /** From menuImage() or storeImage() in lib/format (Supabase Storage bucket `images`). */
  src: string
  alt: string
  /** Dims the photo (sold out). */
  dimmed?: boolean
  iconSize?: number
  className?: string
}

/**
 * Photo with a skeleton while it loads (muted block with a light sweep), fading
 * in once ready. Falls back to the Figma placeholder (muted block with an image
 * icon) when the file is missing. Photos are added by hand later.
 */
export function ProductImage({ src, alt, dimmed, iconSize = 28, className }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const failed = failedSrc === src
  const loading = !failed && loadedSrc !== src
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden bg-surface-muted', className)}>
      {failed ? (
        <Icon name="image" size={iconSize} className={cn('text-text-tertiary', dimmed && 'opacity-50')} aria-label={alt} />
      ) : (
        <img
          // Already in the cache: no skeleton.
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0 && loadedSrc !== src) setLoadedSrc(src)
          }}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          className={cn(
            'size-full object-cover transition-opacity duration-300 ease-out',
            loading ? 'opacity-0' : dimmed ? 'opacity-50 grayscale' : 'opacity-100',
          )}
        />
      )}
      {/* Skeleton while the photo loads: a soft light sweep over the muted block. */}
      {loading && (
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="absolute inset-y-0 -left-full w-full animate-shimmer bg-linear-to-r from-transparent via-surface-base/70 to-transparent motion-reduce:hidden" />
        </span>
      )}
    </div>
  )
}
