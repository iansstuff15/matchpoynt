import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Stands in for someone's profile while it loads: the hero, then the About and Clubs cards. */
export default function PersonProfileSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading the profile">
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="profile-avatar" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="grid gap-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
