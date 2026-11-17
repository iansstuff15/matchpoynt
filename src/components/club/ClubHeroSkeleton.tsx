import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as ClubHero: cover, overlapping avatar, name and counts, settings button. */
export default function ClubHeroSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="club-hero-cover" />
      <div className="flex flex-wrap items-end gap-4 px-2 sm:px-4">
        <Skeleton className="club-hero-avatar" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  )
}
