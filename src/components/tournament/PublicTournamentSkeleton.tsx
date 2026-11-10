import BracketMatchCardSkeleton from '@/components/tournament/BracketMatchCardSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

/** The public tournament page's heading, live badge and a bracket's first rounds, while it loads. */
export default function PublicTournamentSkeleton() {
  return (
    <div className="container-page space-y-8" aria-busy="true" aria-label="Loading the tournament">
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-8" />
          <Skeleton className="h-11 w-72 max-w-full" />
        </div>
        <Skeleton className="h-[22px] w-52 rounded-md" />
      </div>
      <Skeleton className="h-6 w-28" />
      <div className="bracket">
        {[4, 2, 1].map((count) => (
          <div key={count} className="bracket-round">
            <Skeleton className="bracket-round-title h-3 w-20" />
            <div className="bracket-round-matches">
              {Array.from({ length: count }, (_, i) => (
                <BracketMatchCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
