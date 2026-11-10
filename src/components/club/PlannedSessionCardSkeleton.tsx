import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as PlannedSessionCard: sport and title, three detail lines, the action row. */
export default function PlannedSessionCardSkeleton() {
  return (
    <Card className="h-full gap-4">
      <CardHeader className="gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="grid gap-2.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-36" />
      </CardContent>
      <CardFooter className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="size-9" />
        <Skeleton className="size-9" />
        <Skeleton className="size-9" />
      </CardFooter>
    </Card>
  )
}
