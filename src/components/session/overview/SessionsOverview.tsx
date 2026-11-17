import type { ActiveSessionSummary } from '@matchpoynt/shared'
import { History, LayoutGrid, Plus } from 'lucide-react'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import RunningSessionCard from '@/components/session/overview/RunningSessionCard'
import PastSessionCard from '@/components/session/past/PastSessionCard'
import PastSessionsSkeleton from '@/components/session/past/PastSessionsSkeleton'
import SessionEmptyState from '@/components/session/SessionEmptyState'
import { Button } from '@/components/ui/button'
import { sports } from '@/config/sports'
import { useDeleteSession, useEndedSessions } from '@/utils/hooks/useSession'

interface SessionsOverviewProps {
  /** Sessions set up and running, newest first. */
  running: ActiveSessionSummary[]
  onSetup: () => void
}

/**
 * The session board with no session open (`/app`): the sessions that are set
 * up and running, each opening its board, then every finished one, newest
 * first, a page at a time ("Show older sessions"). Nothing opens by itself, and
 * no session's leaderboard, results or invoices show here: they're on each
 * session's own page.
 */
export default function SessionsOverview({ running, onSetup }: SessionsOverviewProps) {
  const ended = useEndedSessions()
  const deleteSession = useDeleteSession()
  const past = ended.data?.pages.flatMap((p) => p.sessions) ?? []

  if (running.length === 0 && ended.isSuccess && past.length === 0) return <SessionEmptyState onSetup={onSetup} />

  return (
    <div className="grid gap-8">
      <section aria-labelledby="running-sessions-title" className="grid gap-3">
        <h2 id="running-sessions-title" className="flex items-center gap-2 font-display text-lg font-bold">
          <LayoutGrid className="size-5" aria-hidden />
          Running sessions
        </h2>
        {running.length === 0 ? (
          <p className="text-sm text-muted-foreground">No session is running. Set one up to open its board.</p>
        ) : (
          <ul className="club-card-grid" aria-label="Running sessions">
            {running.map((session) => (
              <li key={session.id}>
                <RunningSessionCard session={session} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="previous-sessions-title" className="grid gap-3">
        <h2 id="previous-sessions-title" className="flex items-center gap-2 font-display text-lg font-bold">
          <History className="size-5" aria-hidden />
          Previous sessions
        </h2>
        {Boolean(deleteSession.error) && (
          <ErrorBanner
            error={deleteSession.error}
            action={`delete ${deleteSession.variables?.label ?? 'the session'}`}
            onRetry={() => deleteSession.variables && deleteSession.mutate(deleteSession.variables)}
          />
        )}
        {ended.isError ? (
          <ErrorBanner error={ended.error} action="load your previous sessions" onRetry={() => void ended.refetch()} />
        ) : ended.isPending ? (
          <PastSessionsSkeleton />
        ) : past.length === 0 ? (
          <p className="text-sm text-muted-foreground">Finished sessions show here, each with its final leaderboard on its own page.</p>
        ) : (
          <ul className="club-card-grid" aria-label="Previous sessions">
            {past.map((session) => (
              <li key={session.id}>
                <PastSessionCard
                  session={session}
                  deleting={deleteSession.isPending && deleteSession.variables?.id === session.id}
                  onDelete={() => deleteSession.mutate({ id: session.id, label: session.title ?? `${sports[session.sportId].name} session` })}
                />
              </li>
            ))}
          </ul>
        )}
        {ended.hasNextPage && (
          <Button variant="outline" className="mx-auto" disabled={ended.isFetchingNextPage} onClick={() => void ended.fetchNextPage()}>
            <Plus />
            Show older sessions
          </Button>
        )}
      </section>
    </div>
  )
}
