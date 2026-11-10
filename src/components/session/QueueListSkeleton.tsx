import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as QueueList: title, count line, then numbered player rows with the tier below each name. */
export default function QueueListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="board-queue">
      <CardHeader className="gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-44" />
      </CardHeader>
      <CardContent className="board-queue-body">
        <ol className="divide-y overflow-hidden pr-3">
          {Array.from({ length: rows }, (_, i) => (
            <li key={i} className="flex items-start gap-3 py-2">
              <Skeleton className="mt-1.5 ml-2 h-4 w-4" />
              <div className="queue-player-row min-w-0 flex-1 py-0">
                <div className="flex w-full items-center gap-2">
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="size-8" />
                </div>
                <Skeleton className="ml-6 h-[22px] w-20 rounded-md" />
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
