import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as AuthCard with the step progress and two fields of a form. */
export default function AuthCardSkeleton() {
  return (
    <Card className="gap-6 rounded-2xl border-0 py-8 shadow-2xl sm:px-2" aria-busy="true" aria-label="Loading">
      <CardHeader className="gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-64" />
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-6 w-32" />
        {[0, 1].map((i) => (
          <div key={i} className="grid gap-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <div className="flex justify-between">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}
