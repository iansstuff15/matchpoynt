import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as BracketMatchCard: the label row and two sides. */
export default function BracketMatchCardSkeleton() {
  return (
    <div className="bracket-match">
      <div className="bracket-match-head">
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="bracket-side">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="bracket-side">
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  )
}
