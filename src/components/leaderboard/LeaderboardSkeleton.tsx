import LeaderboardTableSkeleton from '@/components/leaderboard/LeaderboardTableSkeleton'
import PodiumSkeleton from '@/components/leaderboard/PodiumSkeleton'
import RecentMatchesSkeleton from '@/components/leaderboard/RecentMatchesSkeleton'

/** Same order and frames as LeaderboardBoard: podium, table, recent results. */
export default function LeaderboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading leaderboard" className="grid gap-6">
      <PodiumSkeleton />
      <LeaderboardTableSkeleton />
      <RecentMatchesSkeleton />
    </div>
  )
}
