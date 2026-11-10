import { Card, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** A past session card while the list loads: the same card frame, lines and button. */
export default function PastSessionCardSkeleton() {
  return (
    <Card className="h-full gap-4">
      <CardHeader className="grid gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardFooter className="mt-auto gap-2">
        <Skeleton className="size-8 shrink-0" />
        <Skeleton className="h-9 flex-1" />
      </CardFooter>
    </Card>
  )
}
