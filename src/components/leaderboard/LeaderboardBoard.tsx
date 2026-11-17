import type { ClubBadgeView, LeaderboardClub, LeaderboardEntry, LeaderboardSpotlight as Spotlight, MatchResult } from '@matchpoynt/shared'
import { Trophy } from 'lucide-react'
import { useRef } from 'react'
import { useLiveRanking } from '@/animations/useLiveRanking'
import LeaderboardPodium from '@/components/leaderboard/LeaderboardPodium'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable'
import LeaderboardImageButton from '@/components/leaderboard/share/LeaderboardImageButton'
import RecentMatches from '@/components/leaderboard/RecentMatches'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { Sport } from '@/interfaces/Sport'

interface LeaderboardBoardProps {
  sport: Sport
  data: { spotlight: Spotlight; entries: LeaderboardEntry[]; recentMatches: MatchResult[]; clubBadges: ClubBadgeView[]; viewerPlayerId: string | null; club: LeaderboardClub | null }
  /** The public leaderboard's address, shown on players' share images; `null` when not published. */
  shareUrl?: string | null
  /** The session's name on the leaderboard image; "<Sport> session" by default. */
  title?: string
}

/**
 * The top three on a podium, then everyone else, with "Download leaderboard"
 * for the whole standings as one image. Only the viewer's own entry has a
 * Share button for their own images. When the
 * ranking changes while someone is looking, players slide to their new places.
 */
export default function LeaderboardBoard({ sport, data, shareUrl = null, title }: LeaderboardBoardProps) {
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
          <div className="flex justify-end">
            <LeaderboardImageButton entries={data.entries} sport={sport} title={title ?? `${sport.name} session`} shareUrl={shareUrl} club={data.club} />
          </div>
          <LeaderboardPodium sport={sport} top={ranked.slice(0, 3)} shareUrl={shareUrl} clubBadges={data.clubBadges} viewerPlayerId={data.viewerPlayerId} club={data.club} />
          {ranked.length + unplayed.length > 3 && <LeaderboardTable sport={sport} entries={[...ranked.slice(3), ...unplayed]} shareUrl={shareUrl} clubBadges={data.clubBadges} viewerPlayerId={data.viewerPlayerId} club={data.club} />}
        </>
      )}
      </div>
      <RecentMatches matches={shown.recentMatches} />
    </div>
  )
}
