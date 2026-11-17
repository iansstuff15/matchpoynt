import { MessageSquareText } from 'lucide-react'
import ClubFeedbackSkeleton from '@/components/clubFeedback/ClubFeedbackSkeleton'
import FeedbackFormEditor from '@/components/clubFeedback/FeedbackFormEditor'
import FeedbackSessionCard from '@/components/clubFeedback/FeedbackSessionCard'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useClubFeedback } from '@/utils/hooks/useClubFeedback'
import { useClubPage } from '@/utils/hooks/useClubPage'

/** `/clubs/<id>/feedback`: the club's post-session feedback form, and how each recent session was rated. */
export default function ClubFeedbackPage() {
  const { view } = useClubPage()
  const feedback = useClubFeedback(view.club.id)
  return (
    <>
      <PageMeta title={`Feedback · ${view.club.name}`} description={`${view.club.name}'s post-session feedback form, and how members rated each session.`} />
      {feedback.isError ? (
        <ErrorBanner error={feedback.error} action="load the feedback form" onRetry={() => void feedback.refetch()} />
      ) : !feedback.data ? (
        <ClubFeedbackSkeleton />
      ) : (
        <div className="grid gap-6">
          {/* Keyed by the last save, so the editor starts again from what the API kept. */}
          <FeedbackFormEditor key={feedback.data.form.updatedAt ?? 'default'} clubId={view.club.id} form={feedback.data.form} />
          <section aria-labelledby="feedback-results-title" className="grid gap-4">
            <h2 id="feedback-results-title" className="font-display text-xl font-bold">
              Results by session
            </h2>
            {feedback.data.sessions.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageSquareText />
                  </EmptyMedia>
                  <EmptyTitle>No finished sessions yet</EmptyTitle>
                  <EmptyDescription>Once the club runs a session, its feedback shows here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              feedback.data.sessions.map((s) => <FeedbackSessionCard key={s.sessionId} session={s} />)
            )}
          </section>
        </div>
      )}
    </>
  )
}
