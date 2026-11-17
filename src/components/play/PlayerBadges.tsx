import type { ClubBadgeView, PlayerLiveMe } from '@matchpoynt/shared'
import ClubBadgeChip from '@/components/leaderboard/ClubBadgeChip'
import HotStreakTag from '@/components/leaderboard/HotStreakTag'
import LeaderboardBadgeChip from '@/components/leaderboard/LeaderboardBadgeChip'
import { hotStreakBadge } from '@/config/leaderboard'
import { cn } from '@/utils/cn'

interface PlayerBadgesProps {
  me: PlayerLiveMe
  /** The club's own badges they hold. */
  clubBadges: ClubBadgeView[]
  className?: string
  /** Part of "You are now playing"'s entrance ([data-np-rest]). */
  rest?: boolean
}

/** The badges the viewer holds in this session: the club's own first, as on the leaderboard, then Matchpoynt's (hot streak as its flame tag). */
export default function PlayerBadges({ me, clubBadges, className, rest }: PlayerBadgesProps) {
  if (me.badges.length === 0 && clubBadges.length === 0) return null
  return (
    <ul data-np-rest={rest ? '' : undefined} className={cn('flex flex-wrap gap-1.5', className)} aria-label="Your badges this session">
      {clubBadges.map((b) => (
        <li key={b.id}>
          <ClubBadgeChip badge={b} />
        </li>
      ))}
      {me.badges.map((id) => (
        <li key={id}>{id === hotStreakBadge ? <HotStreakTag streak={me.streak} /> : <LeaderboardBadgeChip id={id} />}</li>
      ))}
    </ul>
  )
}
