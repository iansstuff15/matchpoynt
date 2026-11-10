import type { ClubBadgeView, LeaderboardEntry } from '@matchpoynt/shared'
import { Download, Share2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import ShareCardPreview from '@/components/leaderboard/share/ShareCardPreview'
import ShareCardPreviewSkeleton from '@/components/leaderboard/share/ShareCardPreviewSkeleton'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Sport } from '@/interfaces/Sport'
import { notifyDone } from '@/utils/feedback/notify'
import { renderPlayerCards } from '@/utils/share/renderCards'
import { canShareImages, downloadImage, shareImages } from '@/utils/share/shareImages'

interface PlayerShareDialogProps {
  open: boolean
  entry: LeaderboardEntry
  sport: Sport
  /** The public leaderboard's address, when there is one, for the card footer and the share text. */
  shareUrl: string | null
  /** The club badges this player earned, one image each. */
  clubBadges: ClubBadgeView[]
  onOpenChange: (open: boolean) => void
}

/**
 * A player's shareable images: a summary card and one per badge the API gave
 * them, drawn in the browser. Share them all at once (where the device can) or
 * download them one by one or together.
 */
export default function PlayerShareDialog({ open, entry, sport, shareUrl, clubBadges, onOpenChange }: PlayerShareDialogProps) {
  const badgeCount = entry.badges.length + clubBadges.length
  const footer = shareUrl ? shareUrl.replace(/^https?:\/\//, '') : `${sport.name} on Matchpoynt`
  const cards = useQuery({
    // Redrawn whenever the player's numbers or badges change.
    queryKey: ['share-cards', entry, sport.id, footer, clubBadges.map((b) => b.id)],
    queryFn: () => renderPlayerCards(entry, { sportName: sport.name, scoreUnit: sport.terminology.scoreUnit, footer, clubBadges }),
    enabled: open,
    staleTime: Infinity,
    gcTime: 60_000,
    retry: false,
  })
  const list = cards.data ?? []
  const shareable = canShareImages(list)
  const text = `${entry.name}: #${entry.rank} in ${sport.name}, ${entry.wins}–${entry.losses}${shareUrl ? ` · ${shareUrl}` : ''}`

  const share = async () => {
    try {
      if (await shareImages(list, `${entry.name} on Matchpoynt`, text)) notifyDone(`Shared ${list.length} images of ${entry.name}`)
    } catch {
      // The share sheet refused the files: save them instead.
      downloadAll()
    }
  }
  const downloadAll = () => {
    list.forEach(downloadImage)
    notifyDone(`Saved ${list.length} ${list.length === 1 ? 'image' : 'images'} of ${entry.name}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">Share {entry.name}'s achievements</DialogTitle>
          <DialogDescription>
            {badgeCount
              ? `A summary card and ${badgeCount === 1 ? 'one image for their badge' : `one image for each of their ${badgeCount} badges`}.`
              : 'A summary card. Badges they earn later get their own images.'}
          </DialogDescription>
        </DialogHeader>
        {cards.isError ? (
          <ErrorBanner error={cards.error} action={`create ${entry.name}'s images`} onRetry={() => void cards.refetch()} />
        ) : (
          <ul className="share-card-grid" aria-busy={cards.isPending} aria-label={`${entry.name}'s images`}>
            {cards.isPending
              ? Array.from({ length: 1 + badgeCount }, (_, i) => <ShareCardPreviewSkeleton key={i} />)
              : list.map((card) => (
                  <ShareCardPreview
                    key={card.fileName}
                    card={card}
                    alt={`${card.title} card for ${entry.name}`}
                    onDownload={() => {
                      downloadImage(card)
                      notifyDone(`Saved ${card.title.toLowerCase()} image`)
                    }}
                  />
                ))}
          </ul>
        )}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" disabled={!list.length} onClick={downloadAll}>
            <Download />
            Download all
          </Button>
          {shareable && (
            <Button type="button" disabled={!list.length} onClick={() => void share()}>
              <Share2 />
              Share {list.length} images
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
