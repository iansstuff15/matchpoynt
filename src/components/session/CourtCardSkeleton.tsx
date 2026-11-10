import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as CourtCard: title and status badge, the two side panels with "vs" between, action button and its reason line. */
export default function CourtCardSkeleton({ perSide = 2 }: { perSide?: number }) {
  return (
    <Card className="court-card gap-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <Skeleton className="h-4 w-20" />
        {/* Status badge and the remove button, as on an open court. */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-[22px] w-14 rounded-md" />
          <Skeleton className="size-8" />
        </div>
      </CardHeader>
      <CardContent className="court-body">
        <div className="court-matchup">
          {[0, 1].map((side) => (
            <div key={side} className="contents">
              {side === 1 && <Skeleton className="h-3 w-4 self-center" />}
              <div className="court-side">
                <Skeleton className="h-3 w-10" />
                {Array.from({ length: perSide }, (_, i) => (
                  <Skeleton key={i} className="court-row w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="grid gap-2">
        <Skeleton className="h-9 w-full" />
        <div className="court-footer-slot" />
      </CardFooter>
    </Card>
  )
}
