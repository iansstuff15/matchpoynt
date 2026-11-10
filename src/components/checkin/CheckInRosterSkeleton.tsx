import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as CheckInRoster: title, hint, search, name list and the check-in button. */
export default function CheckInRosterSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card aria-busy="true" aria-label="Loading the player list">
      <CardHeader className="gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-full" />
      </CardHeader>
      <CardContent className="grid gap-3">
        <Skeleton className="h-9 w-full" />
        <div className="h-72 divide-y overflow-hidden rounded-md border">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="px-3 py-2.5">
              <Skeleton className="h-5 w-40" />
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  )
}
