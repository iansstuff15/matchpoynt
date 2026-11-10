import { Skeleton } from '@/components/ui/skeleton'
import { podiumBars } from '@/config/leaderboard'
import { cn } from '@/utils/cn'

/** Same frame as LeaderboardPodium: three cards on bars, 2nd · 1st · 3rd. */
export default function PodiumSkeleton() {
  return (
    <div className="grid grid-cols-3 items-end gap-3 sm:gap-5" aria-hidden>
      {([2, 1, 3] as const).map((place) => (
        <div key={place} className="flex flex-col justify-end">
          <div className="grid gap-2 rounded-2xl border bg-card p-2.5 sm:gap-3 sm:p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="size-10 rounded-full sm:size-14" />
              <span className="flex items-center gap-1">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="size-8" />
              </span>
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="hidden gap-1.5 sm:flex">
              <Skeleton className="h-[22px] w-20 rounded-md" />
              <Skeleton className="h-[22px] w-16 rounded-md" />
            </div>
          </div>
          <Skeleton className={cn('mt-3 rounded-t-2xl rounded-b-none', podiumBars[place])} />
        </div>
      ))}
    </div>
  )
}
