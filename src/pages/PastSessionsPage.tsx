import { History, LayoutGrid, Plus } from 'lucide-react'
import { Link } from 'react-router'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import PageMeta from '@/components/seo/PageMeta'
import PastSessionCard from '@/components/session/past/PastSessionCard'
import PastSessionsSkeleton from '@/components/session/past/PastSessionsSkeleton'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { sports } from '@/config/sports'
import { useDeleteSession, useEndedSessions } from '@/utils/hooks/useSession'

/** Every finished session, newest first. Each opens its page with the final leaderboard. */
export default function PastSessionsPage() {
  const ended = useEndedSessions()
  const deleteSession = useDeleteSession()
  const sessions = ended.data?.pages.flatMap((p) => p.sessions) ?? []

  return (
    <section aria-labelledby="past-sessions-title" className="app-page">
      <PageMeta title="Past sessions" description="Every finished session, newest first, with its final leaderboard and results." />
      <div>
        <h1 id="past-sessions-title" className="font-display text-2xl font-bold">
          Past sessions
        </h1>
        <p className="text-sm text-muted-foreground">Finished sessions keep their final leaderboard. Open one to see the standings and results.</p>
      </div>

      {Boolean(deleteSession.error) && (
        <ErrorBanner
          error={deleteSession.error}
          action={`delete ${deleteSession.variables?.label ?? 'the session'}`}
          onRetry={() => deleteSession.variables && deleteSession.mutate(deleteSession.variables)}
        />
      )}
      {ended.isError ? (
        <ErrorBanner error={ended.error} action="load your past sessions" onRetry={() => void ended.refetch()} />
      ) : ended.isPending ? (
        <PastSessionsSkeleton />
      ) : sessions.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <History />
            </EmptyMedia>
            <EmptyTitle>No finished sessions yet</EmptyTitle>
            <EmptyDescription>When you finish a session, its final leaderboard is kept here.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/app">
                <LayoutGrid />
                Go to the board
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <ul className="club-card-grid" aria-label="Finished sessions">
            {sessions.map((session) => (
              <li key={session.id}>
                <PastSessionCard
                  session={session}
                  deleting={deleteSession.isPending && deleteSession.variables?.id === session.id}
                  onDelete={() => deleteSession.mutate({ id: session.id, label: session.title ?? `${sports[session.sportId].name} session` })}
                />
              </li>
            ))}
          </ul>
          {ended.hasNextPage && (
            <Button variant="outline" className="mx-auto" disabled={ended.isFetchingNextPage} onClick={() => void ended.fetchNextPage()}>
              <Plus />
              Show older sessions
            </Button>
          )}
        </>
      )}
    </section>
  )
}
