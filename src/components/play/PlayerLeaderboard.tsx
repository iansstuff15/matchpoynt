import ErrorBanner from '@/components/feedback/ErrorBanner'
import LeaderboardBoard from '@/components/leaderboard/LeaderboardBoard'
import LeaderboardSkeleton from '@/components/leaderboard/LeaderboardSkeleton'
import type { Sport } from '@/interfaces/Sport'
import { usePlayerLeaderboard } from '@/utils/hooks/usePlayerLive'

/** The session's leaderboard in the players' live view: the same podium, standings and recent results as the board's tab, ranked by the API. */
export default function PlayerLeaderboard({ sessionId, sport, title }: { sessionId: string; sport: Sport; title: string }) {
  const { data, isPending, error, refetch } = usePlayerLeaderboard(sessionId)
  if (isPending) return <LeaderboardSkeleton />
  if (error || !data) return <ErrorBanner error={error} action="load the leaderboard" onRetry={() => void refetch()} />
  return <LeaderboardBoard sport={sport} data={data} title={title} />
}
