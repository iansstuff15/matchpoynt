import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as ClubPickerTile: the round avatar and the name under it. */
export default function ClubPickerTileSkeleton() {
  return (
    <div className="club-tile">
      <Skeleton className="club-tile-avatar bg-glass" />
      <Skeleton className="h-4 w-20 bg-glass" />
    </div>
  )
}
