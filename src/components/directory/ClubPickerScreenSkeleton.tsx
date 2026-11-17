import { Skeleton } from '@/components/ui/skeleton'
import { clubSkeletonCards } from '@/config/club'

/** The club picker while the clubs load: the same stage, title and rectangle tiles, and the sheet's top. */
export default function ClubPickerScreenSkeleton() {
  return (
    <div className="full-screen-page" aria-busy="true" aria-label="Loading your clubs">
      <section className="club-picker club-picker-stage">
        <Skeleton className="h-12 w-[min(36rem,80vw)] bg-deep" />
        <ul className="club-picker-grid">
          {Array.from({ length: clubSkeletonCards }, (_, i) => (
            <li key={i} className="member-club-tile">
              <Skeleton className="aspect-[4/3] w-full rounded-xl bg-deep" />
              <Skeleton className="h-4 w-24 bg-deep" />
            </li>
          ))}
        </ul>
      </section>
      <section className="club-picker-sheet">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </section>
    </div>
  )
}
