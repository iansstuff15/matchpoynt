import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Same frames as the Friends page's lists: requests, then friends, each with a few rows. */
export default function FriendsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2" aria-busy="true" aria-label="Loading your friends">
      {[2, 4].map((rows, card) => (
        <Card key={card}>
          <CardHeader className="gap-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="grid gap-2">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border p-2">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="ml-auto h-8 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
