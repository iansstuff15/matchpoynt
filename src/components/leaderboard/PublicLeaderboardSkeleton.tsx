import LeaderboardSkeleton from '@/components/leaderboard/LeaderboardSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

/** The public page's heading, live badge and leaderboard, while it loads. */
export default function PublicLeaderboardSkeleton() {
  return (
    <div className="container-page space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-8" />
          <Skeleton className="h-11 w-72" />
        </div>
        <Skeleton className="h-[22px] w-52 rounded-md" />
      </div>
      <LeaderboardSkeleton />
    </div>
  )
}
