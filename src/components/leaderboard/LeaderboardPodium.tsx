import type { ClubBadgeView, LeaderboardClub, LeaderboardEntry } from '@matchpoynt/shared'
import PodiumSpot from '@/components/leaderboard/PodiumSpot'
import type { Sport } from '@/interfaces/Sport'

/** The top three in their own section, shown 2nd · 1st · 3rd like a podium. */
export default function LeaderboardPodium({ sport, top, shareUrl, clubBadges, viewerPlayerId, club }: { sport: Sport; top: LeaderboardEntry[]; shareUrl: string | null; clubBadges: ClubBadgeView[]; viewerPlayerId: string | null; club: LeaderboardClub | null }) {
  return (
    <ol aria-label="Top three" className="grid grid-cols-3 items-end gap-3 sm:gap-5">
      <PodiumSpot sport={sport} place={2} entry={top[1]} shareUrl={shareUrl} clubBadges={clubBadges} viewerPlayerId={viewerPlayerId} club={club} />
      <PodiumSpot sport={sport} place={1} entry={top[0]} shareUrl={shareUrl} clubBadges={clubBadges} viewerPlayerId={viewerPlayerId} club={club} />
      <PodiumSpot sport={sport} place={3} entry={top[2]} shareUrl={shareUrl} clubBadges={clubBadges} viewerPlayerId={viewerPlayerId} club={club} />
    </ol>
  )
}
