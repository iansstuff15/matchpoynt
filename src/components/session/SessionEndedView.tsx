import type { EndedSessionView } from '@matchpoynt/shared'
import { CircleStop, LayoutGrid, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import CoverCard from '@/components/club/CoverCard'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import SessionLeaderboard from '@/components/leaderboard/SessionLeaderboard'
import DeleteSessionButton from '@/components/session/DeleteSessionButton'
import { Button } from '@/components/ui/button'
import { CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { sports } from '@/config/sports'
import { useDeleteSession } from '@/utils/hooks/useSession'
import { formatWhen } from '@/utils/time/formatWhen'

interface SessionEndedViewProps {
  session: EndedSessionView
  /** Starts setup for the next session. Left out while another session is running: the card links back to its board instead. */
  onNewSession?: () => void
}


/** A finished session (its page is `/app/<session id>`): a "session ended" message with Delete, then its final leaderboard. */
export default function SessionEndedView({ session, onNewSession }: SessionEndedViewProps) {
  const sport = sports[session.sportId]
  const label = session.title ?? `${sport.name} session`
  const deleteSession = useDeleteSession()
  const navigate = useNavigate()
  return (
    <div className="space-y-8">
      {/* A session planned in a club shows its cover photo behind the card. */}
      <CoverCard role="status" coverUrl={session.coverUrl}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-xl">
            <CircleStop className="size-5 opacity-70" aria-hidden />
            {session.title ? `${session.title} ended` : 'Session ended'}
          </CardTitle>
          <CardDescription>
            {sport.name} · {formatWhen(session.startedAt)} to {formatWhen(session.endedAt)} · {session.matchesFinished}{' '}
            {session.matchesFinished === 1 ? 'match' : 'matches'} · {session.players} players. These are the final standings.
          </CardDescription>
          <CardAction className="flex flex-wrap gap-2">
            <DeleteSessionButton
              label={label}
              pending={deleteSession.isPending}
              onConfirm={() => deleteSession.mutate({ id: session.id, label }, { onSuccess: () => navigate('/app/past', { replace: true }) })}
            />
            {onNewSession ? (
              <Button onClick={onNewSession}>
                <Plus />
                New session
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/app">
                  <LayoutGrid />
                  Back to the board
                </Link>
              </Button>
            )}
          </CardAction>
        </CardHeader>
      </CoverCard>
      {Boolean(deleteSession.error) && (
        <ErrorBanner error={deleteSession.error} action={`delete ${label}`} onRetry={() => deleteSession.mutate({ id: session.id, label })} />
      )}
      <SessionLeaderboard sessionId={session.id} sport={sport} />
    </div>
  )
}
