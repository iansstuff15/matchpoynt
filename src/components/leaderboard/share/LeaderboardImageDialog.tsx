import type { LeaderboardClub, LeaderboardEntry } from '@matchpoynt/shared'
import { useQuery } from '@tanstack/react-query'
import { Download, Share2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import ShareBackgroundPicker from '@/components/leaderboard/share/ShareBackgroundPicker'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { Sport } from '@/interfaces/Sport'
import type { ShareBackground } from '@/types/leaderboard'
import { cn } from '@/utils/cn'
import { notifyDone } from '@/utils/feedback/notify'
import { renderLeaderboardImage } from '@/utils/share/renderLeaderboard'
import { canShareImages, downloadImage, shareImages } from '@/utils/share/shareImages'

interface LeaderboardImageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: LeaderboardEntry[]
  sport: Sport
  title: string
  /** The public leaderboard's address, printed at the bottom when there is one. */
  shareUrl: string | null
  /** The club that runs the session, drawn at the top. */
  club: LeaderboardClub | null
}

/** The whole leaderboard as one image, on a black, white or transparent background, to download or share. */
export default function LeaderboardImageDialog({ open, onOpenChange, entries, sport, title, shareUrl, club }: LeaderboardImageDialogProps) {
  const [background, setBackground] = useState<ShareBackground>('black')
  const footer = shareUrl ? shareUrl.replace(/^https?:\/\//, '') : `${sport.name} on Matchpoynt`
  const image = useQuery({
    // Redrawn whenever the standings or the background change.
    queryKey: ['leaderboard-image', entries, sport.id, title, footer, background, club],
    queryFn: () => renderLeaderboardImage(entries, { title, sportName: sport.name, footer, background, club }),
    enabled: open,
    staleTime: Infinity,
    gcTime: 60_000,
    retry: false,
  })
  const card = image.data
  // The preview's address is made when the <img> mounts and let go of when it unmounts.
  const attach = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img || !card) return
      const url = URL.createObjectURL(card.blob)
      img.src = url
      return () => URL.revokeObjectURL(url)
    },
    [card],
  )
  const download = () => {
    if (!card) return
    downloadImage(card)
    notifyDone('Saved the leaderboard image')
  }
  const share = async () => {
    if (!card) return
    try {
      if (await shareImages([card], `${title} leaderboard`, `${title}: the leaderboard${shareUrl ? ` · ${shareUrl}` : ''}`)) notifyDone('Shared the leaderboard image')
    } catch {
      download()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Download the leaderboard</DialogTitle>
          <DialogDescription>Everyone's place, record and points in one image.</DialogDescription>
        </DialogHeader>
        <ShareBackgroundPicker value={background} onChange={setBackground} />
        {image.isError ? (
          <ErrorBanner error={image.error} action="create the leaderboard image" onRetry={() => void image.refetch()} />
        ) : card ? (
          <div className="min-h-0 overflow-y-auto">
            <img ref={attach} alt={`${title} leaderboard`} className={cn('leaderboard-image-preview', background === 'transparent' && 'share-card-transparent')} />
          </div>
        ) : (
          <Skeleton className="leaderboard-image-preview aspect-[3/4]" />
        )}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" disabled={!card} onClick={download}>
            <Download />
            Download
          </Button>
          {card && canShareImages([card]) && (
            <Button type="button" onClick={() => void share()}>
              <Share2 />
              Share
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
