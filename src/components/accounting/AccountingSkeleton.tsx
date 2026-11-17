import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as the dashboard: four tiles, the chart card, then the two tables side by side. */
export default function AccountingSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading the accounting dashboard">
      <div className="accounting-tiles">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="gap-2">
            <CardHeader className="gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="grid gap-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i}>
            <CardContent className="grid gap-3">
              <Skeleton className="h-5 w-40" />
              {Array.from({ length: 4 }, (__, j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
