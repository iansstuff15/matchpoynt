import type { FeedbackPromptView } from '@matchpoynt/shared'
import { Check, MessageSquareText } from 'lucide-react'
import { useState } from 'react'
import FeedbackAnswerDialog from '@/components/clubFeedback/FeedbackAnswerDialog'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { sports } from '@/config/sports'
import { useMemberFeedback } from '@/utils/hooks/useClubFeedback'
import { formatWhen } from '@/utils/time/formatWhen'

/**
 * The club's feedback form for members: their recent sessions, each with a
 * button to answer or a mark once they have. Shows nothing while the club's
 * form is off or there's nothing to answer.
 */
export default function PlayerFeedbackCard({ handle }: { handle: string }) {
  const feedback = useMemberFeedback(handle)
  const [answering, setAnswering] = useState<FeedbackPromptView | null>(null)
  if (feedback.isPending) {
    return (
      <Card aria-busy="true" aria-label="Loading feedback">
        <CardHeader className="gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-14 rounded-lg" />
        </CardContent>
      </Card>
    )
  }
  if (feedback.isError) return <ErrorBanner error={feedback.error} action="load the club's feedback form" onRetry={() => void feedback.refetch()} />
  const { form, sessions } = feedback.data
  if (!form || sessions.length === 0) return null

  return (
    <Card aria-labelledby="player-feedback-title">
      <CardHeader>
        <CardTitle id="player-feedback-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <MessageSquareText className="size-5" aria-hidden />
          {form.title}
        </CardTitle>
        <CardDescription>Tell the club how your recent sessions went. Only the club's owner sees your answers.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2" aria-label="Sessions to give feedback on">
          {sessions.map((s) => (
            <li key={s.sessionId} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <span className="grid min-w-0 flex-1">
                <span className="truncate font-medium">{s.label}</span>
                <span className="text-xs text-muted-foreground">{[sports[s.sportId].name, `ended ${formatWhen(s.endedAt)}`].join(' · ')}</span>
              </span>
              {s.answered ? (
                <Badge variant="secondary" className="gap-1">
                  <Check aria-hidden />
                  Sent
                </Badge>
              ) : (
                <Button size="sm" onClick={() => setAnswering(s)} aria-label={`Give feedback on ${s.label}`}>
                  <MessageSquareText />
                  Give feedback
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
      <FeedbackAnswerDialog handle={handle} form={form} session={answering} onClose={() => setAnswering(null)} />
    </Card>
  )
}
