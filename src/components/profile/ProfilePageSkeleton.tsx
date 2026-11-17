import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** The profile page while it loads: the photo and name, then the cards in the same grid. */
export default function ProfilePageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your profile">
      <div className="flex items-center gap-4">
        <Skeleton className="profile-avatar" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="club-dashboard-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="grid gap-3">
              {Array.from({ length: 4 }, (__, j) => (
                <Skeleton key={j} className="h-5 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
