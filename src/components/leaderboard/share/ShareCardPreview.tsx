import { Download } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import type { ShareCard } from '@/interfaces/ShareCard'

/** One generated image, with its own download button. */
export default function ShareCardPreview({ card, alt, onDownload }: { card: ShareCard; alt: string; onDownload: () => void }) {
  const url = useMemo(() => URL.createObjectURL(card.blob), [card.blob])
  // Let go of the image when it's replaced or the preview closes.
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  return (
    <li className="grid gap-2">
      <img src={url} alt={alt} className="share-card-preview" />
      <Button type="button" variant="outline" size="sm" onClick={onDownload} aria-label={`Download ${card.title} image`}>
        <Download />
        {card.title}
      </Button>
    </li>
  )
}
