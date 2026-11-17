import type { PlayerClubPageView, PlayerSessionView } from '@matchpoynt/shared'
import { CalendarCheck, CalendarDays, CalendarX, Check, Clock, Hand, Radio, Timer } from 'lucide-react'
import { Link } from 'react-router'
import PlanAttendeesDialog from '@/components/directory/club/PlanAttendeesDialog'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { sports } from '@/config/sports'
import type { useJoining } from '@/utils/hooks/useDirectory'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { formatWhen } from '@/utils/time/formatWhen'

interface PlayerSessionsCardProps {
  page: PlayerClubPageView
  joining: ReturnType<typeof useJoining>
}

/** The club's sessions running now and coming up. Members sign up for open plans (or ask, and the owner adds them), take themselves off, and see who's coming. */
export default function PlayerSessionsCard({ page, joining }: PlayerSessionsCardProps) {
  const { requestSession, signUp } = joining
  const handle = page.club.handle ?? ''
  const signing = (s: PlayerSessionView) => signUp.isPending && signUp.variables?.planId === s.id
  const setGoing = (s: PlayerSessionView, going: boolean) => handle && signUp.mutate({ handle, planId: s.id, title: s.title, going })
  const { web } = useFeatures()
  const member = page.memberId !== null
  const ask = (s: PlayerSessionView) =>
    page.club.handle && requestSession.mutate({ handle: page.club.handle, title: s.title, planId: s.kind === 'planned' ? s.id : null, sessionId: s.kind === 'active' ? s.id : null })
  const busy = (s: PlayerSessionView) => requestSession.isPending && (requestSession.variables?.planId ?? requestSession.variables?.sessionId) === s.id

  return (
    <Card aria-labelledby="player-sessions-title">
      <CardHeader>
        <CardTitle id="player-sessions-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <CalendarDays className="size-5" aria-hidden />
          Sessions
        </CardTitle>
        <CardDescription>{member ? 'Running now and coming up. Sign up, or ask to join and the club adds you.' : 'Running now and coming up. Join the club to ask for a place.'}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {Boolean(requestSession.error) && requestSession.variables && (
          <ErrorBanner error={requestSession.error} action={`ask to join ${requestSession.variables.title}`} onRetry={() => requestSession.variables && requestSession.mutate(requestSession.variables)} />
        )}
        {Boolean(signUp.error) && signUp.variables && (
          <ErrorBanner
            error={signUp.error}
            action={signUp.variables.going ? `sign you up for ${signUp.variables.title}` : `take you off ${signUp.variables.title}`}
            onRetry={() => signUp.variables && signUp.mutate(signUp.variables)}
          />
        )}
        {page.sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions planned right now.</p>
        ) : (
          <ul className="grid gap-2" aria-label="Upcoming and running sessions">
            {page.sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="truncate">{s.title}</span>
                    {s.kind === 'active' && (
                      <Badge className="gap-1">
                        <Radio aria-hidden />
                        Live
                      </Badge>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {[sports[s.sportId].name, s.when ? (s.kind === 'active' ? `started ${formatWhen(s.when)}` : formatWhen(s.when)) : 'Date to be set', `${s.players} ${s.players === 1 ? 'player' : 'players'}`, s.spotsLeft !== null && `${s.spotsLeft} ${s.spotsLeft === 1 ? 'place' : 'places'} left`]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                {s.joined && s.kind === 'active' && web.playerView ? (
                  <Button asChild size="sm" title={`Your wait, the courts and the queue in ${s.title}`}>
                    <Link to={`/play/${s.id}`}>
                      <Timer />
                      Your place
                    </Link>
                  </Button>
                ) : s.joined && s.kind === 'planned' && member ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Check aria-hidden />
                      You're in
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={signing(s) || s.signUpBlockedReason !== null}
                      title={s.signUpBlockedReason ?? undefined}
                      onClick={() => setGoing(s, false)}
                      aria-label={`Can't make it to ${s.title}`}
                    >
                      <CalendarX />
                      Can't make it
                    </Button>
                  </span>
                ) : s.joined ? (
                  <Badge variant="secondary" className="gap-1">
                    <Check aria-hidden />
                    You're in
                  </Badge>
                ) : s.kind === 'planned' && s.signUp === 'open' && member ? (
                  <Button size="sm" disabled={signing(s) || s.signUpBlockedReason !== null} title={s.signUpBlockedReason ?? undefined} onClick={() => setGoing(s, true)} aria-label={`Sign up for ${s.title}`}>
                    <CalendarCheck />
                    {s.spotsLeft === 0 ? 'Full' : 'Sign up'}
                  </Button>
                ) : s.requested ? (
                  <Badge variant="outline" className="gap-1">
                    <Clock aria-hidden />
                    Asked to join
                  </Badge>
                ) : (
                  member && (
                    <Button size="sm" disabled={busy(s)} onClick={() => ask(s)} aria-label={`Ask to join ${s.title}`}>
                      <Hand />
                      Ask to join
                    </Button>
                  )
                )}
                {member && s.kind === 'planned' && handle && <PlanAttendeesDialog handle={handle} planId={s.id} title={s.title} />}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
