import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { playSkeleton } from '@/config/play'

/** Same frames as the live view: the status card with its four figures, then courts and the queue side by side. */
export default function PlayerSessionSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading the session">
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[4.25rem] rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="play-grid">
        {[playSkeleton.courts, playSkeleton.queue].map((rows, card) => (
          <Card key={card}>
            <CardHeader className="gap-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="grid gap-2">
              {Array.from({ length: rows }, (_, i) => (
                <Skeleton key={i} className={card === 0 ? 'h-[4.5rem] rounded-lg' : 'h-10 rounded-lg'} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
