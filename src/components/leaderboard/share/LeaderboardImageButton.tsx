import type { LeaderboardClub, LeaderboardEntry } from '@matchpoynt/shared'
import { ImageDown } from 'lucide-react'
import { useState } from 'react'
import LeaderboardImageDialog from '@/components/leaderboard/share/LeaderboardImageDialog'
import { Button } from '@/components/ui/button'
import type { Sport } from '@/interfaces/Sport'

interface LeaderboardImageButtonProps {
  entries: LeaderboardEntry[]
  sport: Sport
  title: string
  shareUrl: string | null
  /** The club that runs the session, drawn at the top. */
  club: LeaderboardClub | null
}

/** "Download leaderboard": the whole standings as one image. Anyone who can see the leaderboard can save it. */
export default function LeaderboardImageButton(props: LeaderboardImageButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} title="Save the whole leaderboard as an image">
        <ImageDown />
        Download leaderboard
      </Button>
      <LeaderboardImageDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  )
}
