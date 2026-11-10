import type { ClubBadgeView, LeaderboardEntry, LeaderboardSpotlight as Spotlight, MatchResult } from '@matchpoynt/shared'
import { Trophy } from 'lucide-react'
import { useRef } from 'react'
import { useLiveRanking } from '@/animations/useLiveRanking'
import LeaderboardPodium from '@/components/leaderboard/LeaderboardPodium'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable'
import RecentMatches from '@/components/leaderboard/RecentMatches'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { Sport } from '@/interfaces/Sport'

interface LeaderboardBoardProps {
  sport: Sport
  data: { spotlight: Spotlight; entries: LeaderboardEntry[]; recentMatches: MatchResult[]; clubBadges: ClubBadgeView[] }
  /** The public leaderboard's address, shown on players' share images; `null` when not published. */
  shareUrl?: string | null
}

/**
 * The top three on a podium, then everyone else. When the
 * ranking changes while someone is looking, players slide to their new places.
 */
export default function LeaderboardBoard({ sport, data, shareUrl = null }: LeaderboardBoardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const shown = useLiveRanking(ref, data)
  const ranked = shown.entries.filter((e) => e.played > 0)
  const unplayed = shown.entries.filter((e) => e.played === 0)

  return (
    <div className="grid gap-6">
      {/* Only the rankings count as "being watched"; recent results below don't. */}
      <div ref={ref} className="grid gap-6">
      {ranked.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Trophy />
            </EmptyMedia>
            <EmptyTitle>No results yet</EmptyTitle>
            <EmptyDescription>The podium fills as matches finish with a score.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <LeaderboardPodium sport={sport} top={ranked.slice(0, 3)} shareUrl={shareUrl} clubBadges={data.clubBadges} />
          {ranked.length + unplayed.length > 3 && <LeaderboardTable sport={sport} entries={[...ranked.slice(3), ...unplayed]} shareUrl={shareUrl} clubBadges={data.clubBadges} />}
        </>
      )}
      </div>
      <RecentMatches matches={shown.recentMatches} />
    </div>
  )
}
