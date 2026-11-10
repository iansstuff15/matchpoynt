import type { ClubBadgeView, LeaderboardEntry } from '@matchpoynt/shared'
import { Share2 } from 'lucide-react'
import { useState } from 'react'
import PlayerShareDialog from '@/components/leaderboard/share/PlayerShareDialog'
import { Button } from '@/components/ui/button'
import type { Sport } from '@/interfaces/Sport'

interface PlayerShareButtonProps {
  entry: LeaderboardEntry
  sport: Sport
  shareUrl: string | null
  /** The club badges this player earned. */
  clubBadges: ClubBadgeView[]
}

/** "Share" on a leaderboard row or podium card: opens the player's generated images. */
export default function PlayerShareButton({ entry, sport, shareUrl, clubBadges }: PlayerShareButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label={`Share ${entry.name}'s achievements`}
        title="Share achievements"
      >
        <Share2 />
      </Button>
      {open && <PlayerShareDialog open entry={entry} sport={sport} shareUrl={shareUrl} clubBadges={clubBadges} onOpenChange={setOpen} />}
    </>
  )
}
