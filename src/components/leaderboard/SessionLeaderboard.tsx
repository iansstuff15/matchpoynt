import LeaderboardSkeleton from '@/components/leaderboard/LeaderboardSkeleton'
import LeaderboardBoard from '@/components/leaderboard/LeaderboardBoard'
import type { Sport } from '@/interfaces/Sport'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { useLeaderboard } from '@/utils/hooks/useLeaderboard'

interface SessionLeaderboardProps {
  sessionId: string
  sport: Sport
  /** The session's public leaderboard link, if published, for players' share images. */
  shareUrl?: string | null
  /** The session's title, for the leaderboard image. */
  title?: string | null
}

/** Leaderboard tab: podium, standings and recent results, ranked by the server. */
export default function SessionLeaderboard({ sessionId, sport, shareUrl = null, title = null }: SessionLeaderboardProps) {
  const { data, isPending, error, refetch } = useLeaderboard(sessionId)

  if (isPending) return <LeaderboardSkeleton />
  if (error || !data) return <ErrorBanner error={error} action="load the leaderboard" onRetry={() => void refetch()} />
  return <LeaderboardBoard sport={sport} data={data} shareUrl={shareUrl} title={title ?? undefined} />
}
