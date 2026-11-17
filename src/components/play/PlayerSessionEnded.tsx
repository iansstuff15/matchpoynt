import type { PlayerSessionEndedView } from '@matchpoynt/shared'
import { CheckCircle2, Flag, MessageSquareText } from 'lucide-react'
import FeedbackAnswerForm from '@/components/clubFeedback/FeedbackAnswerForm'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PlayerLeaderboard from '@/components/play/PlayerLeaderboard'
import PlayerPaymentCard from '@/components/play/PlayerPaymentCard'
import PlayerResultCard from '@/components/play/PlayerResultCard'
import PlayReveal from '@/components/play/PlayReveal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { sports } from '@/config/sports'
import { useMemberFeedback } from '@/utils/hooks/useClubFeedback'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { formatWhen } from '@/utils/time/formatWhen'

/** The club's feedback form for this session, inline: to answer, or thanks once answered. Nothing while the club's form is off. */
function SessionFeedback({ session }: { session: PlayerSessionEndedView }) {
  const handle = session.clubHandle ?? ''
  const feedback = useMemberFeedback(handle, Boolean(handle))
  if (!handle) return null
  if (feedback.isPending) {
    return (
      <Card aria-busy="true" aria-label="Loading the feedback form">
        <CardHeader className="gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </CardContent>
      </Card>
    )
  }
  if (feedback.isError) return <ErrorBanner error={feedback.error} action="load the club's feedback form" onRetry={() => void feedback.refetch()} />
  const { form, sessions } = feedback.data
  const prompt = sessions.find((s) => s.sessionId === session.sessionId)
  if (!form || !prompt) return null
  return (
    <Card data-play-reveal aria-labelledby="ended-feedback-title">
      <CardHeader>
        <CardTitle id="ended-feedback-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <MessageSquareText className="size-5" aria-hidden />
          {form.title}
        </CardTitle>
        <CardDescription>{prompt.answered ? 'Thanks: your feedback was sent to the club.' : form.intro || 'Tell the club how it went. Only the club sees your answers.'}</CardDescription>
      </CardHeader>
      <CardContent>
        {prompt.answered ? (
          <p className="flex items-center gap-2 text-sm font-medium text-success-foreground">
            <CheckCircle2 className="size-4" aria-hidden />
            Feedback sent
          </p>
        ) : (
          <FeedbackAnswerForm handle={handle} form={form} session={prompt} />
        )}
      </CardContent>
    </Card>
  )
}

/**
 * A session's players' screen once it has ended, in place of the live view:
 * that it ended, what they owe (with the club's QR codes to pay with), their
 * result and badges, the club's feedback form for it, and its final
 * leaderboard. It's also each session's page in their session history.
 */
export default function PlayerSessionEnded({ session }: { session: PlayerSessionEndedView }) {
  const { web } = useFeatures()
  return (
    <PlayReveal>
      <Card data-play-reveal aria-labelledby="ended-title" className="border-primary/40">
        <CardHeader>
          <CardTitle id="ended-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display text-xl">
            <Flag className="size-5" aria-hidden />
            Session ended
          </CardTitle>
          <CardDescription>
            {session.title} at {session.clubName} ended {formatWhen(session.endedAt)}. Thanks for playing!
          </CardDescription>
        </CardHeader>
      </Card>
      {/* What they owe, with the club's QR codes up front while anything is left. */}
      <PlayerPaymentCard payment={session.payment} qrs={session.paymentQrs} />
      <PlayerResultCard sessionId={session.sessionId} />
      {web.clubFeedback && <SessionFeedback session={session} />}
      <Separator />
      <section aria-labelledby="ended-leaderboard-title" className="grid gap-4">
        <h2 id="ended-leaderboard-title" className="font-display text-xl font-bold">
          Final leaderboard
        </h2>
        <PlayerLeaderboard sessionId={session.sessionId} sport={sports[session.sportId]} title={session.title} />
      </section>
    </PlayReveal>
  )
}
