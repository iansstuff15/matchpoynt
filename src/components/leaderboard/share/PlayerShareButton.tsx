import type { ClubBadgeView, LeaderboardClub, LeaderboardEntry } from '@matchpoynt/shared'
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
  /** The club that runs the session, drawn on the images. */
  club: LeaderboardClub | null
  /** A labelled outline button ("Share") instead of the icon alone, e.g. on the record page's sessions. */
  labelled?: boolean
  /** What the button says to screen readers; the player's name by default. */
  ariaLabel?: string
}

/** "Share" on a leaderboard row or podium card: opens the player's generated images. */
export default function PlayerShareButton({ entry, sport, shareUrl, clubBadges, club, labelled = false, ariaLabel }: PlayerShareButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant={labelled ? 'outline' : 'ghost'}
        size={labelled ? 'sm' : 'icon-sm'}
        onClick={() => setOpen(true)}
        aria-label={ariaLabel ?? `Share ${entry.name}'s achievements`}
        title="Share achievements"
      >
        <Share2 />
        {labelled && 'Share'}
      </Button>
      {open && <PlayerShareDialog open entry={entry} sport={sport} shareUrl={shareUrl} clubBadges={clubBadges} club={club} onOpenChange={setOpen} />}
    </>
  )
}
