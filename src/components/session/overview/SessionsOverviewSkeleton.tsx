import PastSessionCardSkeleton from '@/components/session/past/PastSessionCardSkeleton'
import PastSessionsSkeleton from '@/components/session/past/PastSessionsSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

/** The session board's overview while it loads: the running sessions' heading and a card, then the previous sessions' grid. */
export default function SessionsOverviewSkeleton() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-label="Loading your sessions">
      <div className="grid gap-3">
        <Skeleton className="h-7 w-48" />
        <ul className="club-card-grid">
          <li>
            <PastSessionCardSkeleton />
          </li>
        </ul>
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-7 w-48" />
        <PastSessionsSkeleton />
      </div>
    </div>
  )
}
