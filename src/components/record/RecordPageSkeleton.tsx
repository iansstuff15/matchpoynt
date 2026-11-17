import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Stands in for a page of Your record while it loads: the overview's total card and two sport cards. */
export default function RecordPageSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading your record">
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Card key={i} className="gap-3 py-4">
            <CardHeader className="px-4">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 px-4 sm:grid-cols-5">
              {Array.from({ length: 5 }, (_, j) => (
                <Skeleton key={j} className="h-9" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
