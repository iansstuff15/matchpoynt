import { Skeleton } from '@/components/ui/skeleton'
import { clubBadgeUi } from '@/config/badges'

/** The GIF results grid while a search loads: the same grid and tile shape. */
export default function GifSearchSkeleton() {
  return (
    <ul className="gif-grid" aria-busy="true" aria-label="Searching GIFs">
      {Array.from({ length: clubBadgeUi.gifSkeletonTiles }, (_, i) => (
        <li key={i}>
          <Skeleton className="gif-tile" />
        </li>
      ))}
    </ul>
  )
}
