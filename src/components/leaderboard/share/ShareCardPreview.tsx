import { Download } from 'lucide-react'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import type { ShareCard } from '@/interfaces/ShareCard'
import { cn } from '@/utils/cn'

/** One generated image, with its own download button. Transparent ones show on a checkerboard. */
export default function ShareCardPreview({ card, alt, onDownload, transparent = false }: { card: ShareCard; alt: string; onDownload: () => void; transparent?: boolean }) {
  // The image's address is made when the <img> mounts and let go of when it unmounts (a ref cleanup), so a
  // remount (StrictMode runs refs twice) always gets a fresh one instead of a revoked one.
  const attach = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return
      const url = URL.createObjectURL(card.blob)
      img.src = url
      return () => URL.revokeObjectURL(url)
    },
    [card.blob],
  )

  return (
    <li className="grid gap-2">
      {/* A transparent image is previewed on a checkerboard, so its see-through parts show as such. */}
      <img ref={attach} alt={alt} className={cn('share-card-preview', transparent && 'share-card-transparent')} />
      <Button type="button" variant="outline" size="sm" onClick={onDownload} aria-label={`Download ${card.title} image`}>
        <Download />
        {card.title}
      </Button>
    </li>
  )
}
