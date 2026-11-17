import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { feedbackSkeleton } from '@/config/club'

/** Same frames as the Feedback page: the form editor with its questions, then a session's results. */
export default function ClubFeedbackSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading feedback">
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </CardHeader>
        <CardContent className="grid gap-5">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-9 w-full sm:w-1/2" />
          <Skeleton className="h-16" />
          {Array.from({ length: feedbackSkeleton.questions }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </CardContent>
      </Card>
      {Array.from({ length: feedbackSkeleton.sessions }, (_, i) => (
        <Card key={i}>
          <CardHeader className="gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
