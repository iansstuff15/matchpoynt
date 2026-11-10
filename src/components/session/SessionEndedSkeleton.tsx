import LeaderboardSkeleton from '@/components/leaderboard/LeaderboardSkeleton'
import { Card, CardAction, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Same layout as SessionEndedView: the ended card, then the leaderboard. */
export default function SessionEndedSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading the last session">
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-full max-w-md" />
          <CardAction>
            <Skeleton className="h-9 w-36" />
          </CardAction>
        </CardHeader>
      </Card>
      <LeaderboardSkeleton />
    </div>
  )
}
