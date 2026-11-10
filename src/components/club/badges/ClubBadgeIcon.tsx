import { Award } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'
import { prefersReducedMotion } from '@/utils/motion/prefersReducedMotion'

interface ClubBadgeIconProps {
  /** The badge's icon (`/api/media/...`), or `null` for the default award icon. */
  url: string | null
  /** The badge's name, for the image's description. */
  name: string
  className?: string
}

/**
 * A club badge's icon. GIFs play, except for people who ask for less motion:
 * they see the first frame, drawn once on a canvas (a GIF can't be paused).
 */
export default function ClubBadgeIcon({ url, name, className }: ClubBadgeIconProps) {
  const [still] = useState(prefersReducedMotion)
  const canvas = useRef<HTMLCanvasElement>(null)
  const animated = Boolean(url?.toLowerCase().endsWith('.gif'))

  useEffect(() => {
    if (!url || !still || !animated) return
    const image = new Image()
    image.onload = () => {
      const target = canvas.current
      if (!target) return
      target.width = image.naturalWidth
      target.height = image.naturalHeight
      target.getContext('2d')?.drawImage(image, 0, 0)
    }
    image.src = url
  }, [url, still, animated])

  const frame = cn('club-badge-icon', className)
  if (!url) {
    return (
      <span className={cn(frame, 'club-badge-icon-empty')} role="img" aria-label={`${name} badge`}>
        <Award aria-hidden />
      </span>
    )
  }
  if (still && animated) return <canvas ref={canvas} className={frame} role="img" aria-label={`${name} badge`} />
  return <img src={url} alt={`${name} badge`} className={frame} loading="lazy" decoding="async" />
}
