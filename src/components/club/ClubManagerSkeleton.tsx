import ClubHeroSkeleton from '@/components/club/ClubHeroSkeleton'
import PlannedSessionCardSkeleton from '@/components/club/PlannedSessionCardSkeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { clubSkeletonCards } from '@/config/club'

/** The club manager while it loads: banner, tabs, and the Sessions tab's heading and plan cards. */
export default function ClubManagerSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading the club">
      <Skeleton className="h-9 w-28" />
      <ClubHeroSkeleton />
      <Skeleton className="h-9 w-72 rounded-lg" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <ul className="club-card-grid">
        {Array.from({ length: clubSkeletonCards }, (_, i) => (
          <li key={i}>
            <PlannedSessionCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  )
}
