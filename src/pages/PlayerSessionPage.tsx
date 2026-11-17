import { Building2, Timer, Trophy, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import CalledAlertButton from '@/components/play/CalledAlertButton'
import NowPlayingBanner from '@/components/play/NowPlayingBanner'
import PlayerFriendsHereCard from '@/components/play/PlayerFriendsHereCard'
import PlayerSessionInfoCard from '@/components/play/PlayerSessionInfoCard'
import PlayerCourtsCard from '@/components/play/PlayerCourtsCard'
import PlayReveal from '@/components/play/PlayReveal'
import PlayerSessionEnded from '@/components/play/PlayerSessionEnded'
import PlayStatusSwap from '@/components/play/PlayStatusSwap'
import PlayerLeaderboard from '@/components/play/PlayerLeaderboard'
import PlayerQueueCard from '@/components/play/PlayerQueueCard'
import PlayerSessionSkeleton from '@/components/play/PlayerSessionSkeleton'
import PlayerStatusCard from '@/components/play/PlayerStatusCard'
import PlayerUpNextCard from '@/components/play/PlayerUpNextCard'
import PageMeta from '@/components/seo/PageMeta'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RecentMatches from '@/components/leaderboard/RecentMatches'
import { board } from '@/config/board'
import { sports } from '@/config/sports'
import { useNow } from '@/utils/hooks/useNow'
import { usePlayerBreak, usePlayerCheckIn, usePlayerLive } from '@/utils/hooks/usePlayerLive'
import { useCalledAlert } from '@/utils/hooks/useCalledAlert'
import { clockOffset } from '@/utils/time/clockOffset'

/**
 * A player's live view of a running club session (`/play/<session id>`):
 * "You are now playing" with their court and matchup while they're on court,
 * otherwise where they stand and how long they've waited, who's on court, who plays
 * next, with the queue and the session's leaderboard in tabs of their own.
 * Refreshes on its own; when the session ends, the page turns into its ended
 * screen (the club's feedback form and the final leaderboard). Nothing here
 * changes the board.
 */
export default function PlayerSessionPage() {
  const { sessionId = '' } = useParams()
  const live = usePlayerLive(sessionId)
  const [tab, setTab] = useState('session')
  const data = live.data
  // Live while it runs; its ended screen (feedback and final leaderboard) once it's over.
  const view = data && !data.ended ? data : null
  const ended = data?.ended ? data : null
  // The court the viewer is playing on, for "You are now playing".
  const playingOn = view?.courts.find((c) => c.mine && c.status === 'playing') ?? null
  const now = useNow(Boolean(view), board.timerTickMs, view ? clockOffset(view.serverTime, live.dataUpdatedAt) : 0)
  const checkIn = usePlayerCheckIn(sessionId)
  const takeBreak = usePlayerBreak(sessionId)
  // Buzz and notify when they're called up next or onto a court, once they've asked to be.
  const alerts = useCalledAlert(view?.me ?? null)

  return (
    <section aria-labelledby="play-title" className="app-page">
      <PageMeta title={data ? `${data.title} · Playing now` : 'Playing now'} description="Your place in a running club session: your wait, who's on court, who's up next and the queue." />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="play-title" className="font-display text-2xl font-bold">
            {data?.title ?? 'Session'}
          </h1>
          {view && <p className="text-sm text-muted-foreground">{[view.clubName, sports[view.sportId].name, `${view.counts.playing} playing`, `${view.counts.waiting} waiting`].join(' · ')}</p>}
          {ended && <p className="text-sm text-muted-foreground">{[ended.clubName, sports[ended.sportId].name, 'Ended'].join(' · ')}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {view?.me && <CalledAlertButton on={alerts.on} onToggle={() => void alerts.toggle()} />}
          <Button asChild variant="ghost" size="sm">
            <Link to="/play">
              <Timer />
              Your sessions
            </Link>
          </Button>
          {data?.clubHandle && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/c/${data.clubHandle}`}>
                <Building2 />
                {data.clubName}
              </Link>
            </Button>
          )}
        </div>
      </div>
      {live.isError && !data ? (
        <ErrorBanner error={live.error} action="load the session" onRetry={() => void live.refetch()} />
      ) : ended ? (
        <PlayerSessionEnded session={ended} />
      ) : !view ? (
        <PlayerSessionSkeleton />
      ) : (
        <>
          {live.isError && <ErrorBanner error={live.error} action="refresh the session" onRetry={() => void live.refetch()} />}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="session">
                <Timer aria-hidden />
                Your session
              </TabsTrigger>
              <TabsTrigger value="queue">
                <Users aria-hidden />
                Queue
              </TabsTrigger>
              <TabsTrigger value="leaderboard">
                <Trophy aria-hidden />
                Leaderboard
              </TabsTrigger>
            </TabsList>
            {/* Each tab plays its entrance as it opens. */}
            <TabsContent value="session">
              <PlayReveal>
                {/* On or off court: the card hands over to the next with a transition. */}
                <PlayStatusSwap mode={view.me?.status === 'playing' && playingOn ? `playing-${playingOn.id}-${playingOn.startedAt}` : view.me ? 'waiting' : 'none'}>
                  {view.me?.status === 'playing' && playingOn ? (
                    <NowPlayingBanner key={`${playingOn.id}-${playingOn.startedAt}`} court={playingOn} me={view.me} clubBadges={view.clubBadges} now={now} />
                  ) : view.me ? (
                    <PlayerStatusCard me={view.me} clubBadges={view.clubBadges} now={now} onCheckIn={() => checkIn.mutate()} checkingIn={checkIn.isPending} onSetBreak={(on) => takeBreak.mutate(on)} settingBreak={takeBreak.isPending} />
                  ) : (
                    <Alert>
                      <Timer />
                      <AlertTitle>You're not on this session's roster</AlertTitle>
                      <AlertDescription>Ask to join it from the club's page, or ask the Queue Master to add you. You can still follow the courts and the queue here.</AlertDescription>
                    </Alert>
                  )}
                </PlayStatusSwap>
                {checkIn.isError && <ErrorBanner error={checkIn.error} action="check you in" onRetry={() => checkIn.mutate()} />}
                {takeBreak.isError && <ErrorBanner error={takeBreak.error} action={takeBreak.variables ? 'start your break' : 'put you back in the queue'} onRetry={() => takeBreak.mutate(takeBreak.variables ?? false)} />}
                <div className="play-grid">
                  <PlayerCourtsCard courts={view.courts} now={now} />
                  {view.upNext && <PlayerUpNextCard matches={view.upNext} />}
                  {view.friendsHere.length > 0 && <PlayerFriendsHereCard friends={view.friendsHere} />}
                  <PlayerSessionInfoCard info={view.info} typicalMatchMinutes={view.typicalMatchMinutes} />
                </div>
                {/* What's happened so far, below what's happening now. */}
                <Separator />
                <div data-play-reveal>
                  <RecentMatches matches={view.history} title="Match history" />
                </div>
              </PlayReveal>
            </TabsContent>
            <TabsContent value="queue">
              <PlayReveal>
                <PlayerQueueCard queue={view.queue} checkingIn={view.counts.checkingIn} now={now} />
              </PlayReveal>
            </TabsContent>
            <TabsContent value="leaderboard">{tab === 'leaderboard' && <PlayerLeaderboard sessionId={sessionId} sport={sports[view.sportId]} title={view.title} />}</TabsContent>
          </Tabs>
        </>
      )}
    </section>
  )
}
