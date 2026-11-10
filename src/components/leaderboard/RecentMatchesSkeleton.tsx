import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as RecentMatches: court and time, then one line per side. */
export default function RecentMatchesSkeleton({ items = 3 }: { items?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <ol className="divide-y">
          {Array.from({ length: items }, (_, i) => (
            <li key={i} className="grid gap-1 py-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-12" />
              </div>
              {[0, 1].map((side) => (
                <div key={side} className="flex justify-between gap-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
