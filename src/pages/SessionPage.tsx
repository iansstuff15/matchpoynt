import { LayoutGrid, Medal, Settings2, Trophy, Unplug } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import SignInCard from '@/components/auth/SignInCard'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import SessionLeaderboard from '@/components/leaderboard/SessionLeaderboard'
import PageMeta from '@/components/seo/PageMeta'
import CheckInButton from '@/components/session/checkin/CheckInButton'
import BoardDnd from '@/components/session/dnd/BoardDnd'
import DeleteSessionButton from '@/components/session/DeleteSessionButton'
import FinishSessionButton from '@/components/session/FinishSessionButton'
import PublishSessionButton from '@/components/session/PublishSessionButton'
import QueueingSwitch from '@/components/session/QueueingSwitch'
import QueueList from '@/components/session/QueueList'
import QueueListSkeleton from '@/components/session/QueueListSkeleton'
import SessionActionsSkeleton from '@/components/session/SessionActionsSkeleton'
import SessionBoard from '@/components/session/SessionBoard'
import SessionBoardSkeleton from '@/components/session/SessionBoardSkeleton'
import SessionsOverview from '@/components/session/overview/SessionsOverview'
import SessionsOverviewSkeleton from '@/components/session/overview/SessionsOverviewSkeleton'
import SessionEndedSkeleton from '@/components/session/SessionEndedSkeleton'
import SessionEndedView from '@/components/session/SessionEndedView'
import SessionSummary from '@/components/session/SessionSummary'
import SessionSwitcher from '@/components/session/SessionSwitcher'
import StartOverButton from '@/components/session/StartOverButton'
import SessionSummarySkeleton from '@/components/session/SessionSummarySkeleton'
import SessionSetupDialog from '@/components/session/setup/SessionSetupDialog'
import TournamentPanel from '@/components/tournament/TournamentPanel'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { defaultSportId, sports } from '@/config/sports'
import type { SetupMode } from '@/types/session'
import { cn } from '@/utils/cn'
import { draftFromSession, lockedIds, newSessionDraft } from '@/utils/forms/sessionDraft'
import { clockOffset } from '@/utils/time/clockOffset'
import { useAppConfig, useFeatures } from '@/utils/hooks/useFeatures'
import { useMe } from '@/utils/hooks/useMe'
import { remember } from '@/utils/platform/remember'
import { useActiveSessions, useDeleteSession, useEndedSession, useSessionActions, useSessionBoard } from '@/utils/hooks/useSession'

/**
 * The Queue Master's page. Several sessions can run at once: each has its
 * own page, `/app/<session id>`, with its board while it runs and "Session
 * ended" with its leaderboard afterwards (that link keeps working). `/app`
 * opens the session this browser had open last (or the newest), else the
 * last finished one. The page never grows past the screen: the main column
 * scrolls, and while a session runs the queue is a full-height panel on the
 * right (stacked below on narrow screens).
 */
export default function SessionPage() {
  const config = useAppConfig()
  const me = useMe()
  const { web } = useFeatures()
  // With sign-in off, the API runs the board as a guest; there's nothing to sign in to.
  const signedIn = web.signIn ? Boolean(me.data?.user) : true
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const deleteSession = useDeleteSession()
  const actives = useActiveSessions(config.isSuccess && signedIn)
  const running = actives.data ?? []
  const isRunning = Boolean(sessionId && running.some((s) => s.id === sessionId))
  const board = useSessionBoard(sessionId ?? '', isRunning)
  const session = isRunning ? (board.data ?? null) : null
  const viewed = useEndedSession(sessionId ?? '', Boolean(sessionId) && actives.isSuccess && !isRunning)
  const actions = useSessionActions(isRunning ? sessionId! : null)
  const sport = session ? sports[session.sportId] : null

  useEffect(() => {
    if (isRunning && sessionId) remember('session', sessionId)
  }, [isRunning, sessionId])

  // Setup opens only when asked for ("New session", ?new=1, or the empty board's button), never by itself.
  const [dialog, setDialog] = useState<SetupMode | null>(null)
  const [tab, setTab] = useState('management')
  // A closed tournament takes its tab with it: fall back to the board.
  const shownTab = tab === 'tournament' && !(web.tournaments && session?.tournament) ? 'management' : tab
  // "New session" from the sidebar's switcher arrives as /app?new=1.
  const [params, setParams] = useSearchParams()
  // Handled once per ?new=1: clearing it updates the address only after this render, so without the flag it would be handled again forever.
  const [newHandled, setNewHandled] = useState(false)
  if (params.has('new') && signedIn && config.isSuccess && !newHandled) {
    setNewHandled(true)
    setDialog('create')
    setParams({}, { replace: true })
  }
  if (!params.has('new') && newHandled) setNewHandled(false)

  const loading = config.isSuccess && (me.isLoading || (signedIn && (actives.isPending || (isRunning && board.isPending))))
  const save = dialog === 'edit' ? actions.update : actions.create
  const openDialog = (mode: SetupMode) => {
    save.reset()
    setDialog(mode)
  }
  // The queue panel is a running board's (and its skeleton while one opens); the overview has none.
  const withQueue = (loading && Boolean(sessionId)) || Boolean(session && sport)

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 id="session-title" className="text-2xl font-bold">
            {session?.title ?? 'Session board'}
          </h1>
          {signedIn && actives.isSuccess && (
            <SessionSwitcher sessions={running} currentId={sessionId ?? null} onNew={() => openDialog('create')} />
          )}
        </div>
        {session && sport && <SessionSummary settings={session} sport={sport} />}
        {loading && <SessionSummarySkeleton />}
      </div>
      {loading && <SessionActionsSkeleton />}
      {session && (
        <div className="flex flex-wrap items-center gap-2">
          <QueueingSwitch session={session} actions={actions} />
          <CheckInButton
            checkIn={session.checkIn}
            pending={actions.openCheckIn.isPending}
            error={actions.openCheckIn.error}
            onOpen={() => actions.openCheckIn.mutate()}
          />
          <Button variant="outline" onClick={() => openDialog('edit')}>
            <Settings2 />
            Session settings
          </Button>
          {web.publishSessions && (
            <PublishSessionButton
              publicUrl={session.publicUrl}
              publishing={actions.publish.isPending}
              unpublishing={actions.unpublish.isPending}
              error={actions.publish.error ?? actions.unpublish.error}
              onPublish={() => actions.publish.mutate()}
              onUnpublish={() => actions.unpublish.mutate()}
            />
          )}
          <StartOverButton pending={actions.restartSession.isPending} onConfirm={() => actions.restartSession.mutate()} />
          <FinishSessionButton
            blockedReason={session.endBlockedReason}
            pending={actions.finish.isPending}
            onConfirm={() => actions.finish.mutate()}
          />
          <DeleteSessionButton
            label={session.title ?? `${sport?.name ?? 'This'} session`}
            pending={deleteSession.isPending}
            onConfirm={() =>
              deleteSession.mutate(
                { id: session.id, label: session.title ?? `${sport?.name ?? 'This'} session` },
                // Back to /app: the running and previous sessions.
                { onSuccess: () => navigate('/app', { replace: true }) },
              )
            }
          />
        </div>
      )}
      {Boolean(deleteSession.error) && (
        <ErrorBanner className="basis-full" error={deleteSession.error} action="delete the session" onRetry={() => session && deleteSession.mutate({ id: session.id, label: session.title ?? 'the session' })} />
      )}
    </div>
  )

  let body: ReactNode
  if (config.isError) {
    body = (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Unplug />
          </EmptyMedia>
          <EmptyTitle>Session board is offline</EmptyTitle>
          <EmptyDescription>It needs the Matchpoynt API. The banner above says what went wrong; the board comes back on its own once the API answers.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  } else if (loading) {
    body = !sessionId ? <SessionsOverviewSkeleton /> : isRunning ? <SessionBoardSkeleton /> : <SessionEndedSkeleton />
  } else if (!signedIn) {
    body = (
      <div className="flex justify-center py-10">
        <SignInCard title="Sign in to run a session" />
      </div>
    )
  } else if (actives.isError) {
    body = <ErrorBanner error={actives.error} action="load your sessions" onRetry={() => void actives.refetch()} />
  } else if (!sessionId) {
    // No session open: the running and previous sessions to pick from; nothing opens by itself.
    body = <SessionsOverview running={running} onSetup={() => openDialog('create')} />
  } else if (isRunning && board.isError) {
    body = <ErrorBanner error={board.error} action="load this session" onRetry={() => void board.refetch()} />
  } else if (sessionId && !isRunning) {
    if (viewed.isPending) body = <SessionEndedSkeleton />
    else if (viewed.isError) body = <ErrorBanner error={viewed.error} action="open this session" onRetry={() => void viewed.refetch()} />
    else body = <SessionEndedView session={viewed.data} onNewSession={() => openDialog('create')} />
  } else if (session && sport) {
    body = (
      <Tabs value={shownTab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="management">
            <LayoutGrid aria-hidden />
            Management
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy aria-hidden />
            Leaderboard
          </TabsTrigger>
          {/* Appears once a court is switched to tournament play, and stays until the tournament is closed. */}
          {web.tournaments && session.tournament && (
            <TabsTrigger value="tournament">
              <Medal aria-hidden />
              Tournament
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="management" className="mt-6">
          <SessionBoard session={session} sport={sport} actions={actions} clockOffsetMs={clockOffset(session.serverTime, board.dataUpdatedAt)} />
        </TabsContent>
        <TabsContent value="leaderboard" className="mt-6">
          <SessionLeaderboard sessionId={session.id} sport={sport} shareUrl={session.publicUrl} title={session.title} />
        </TabsContent>
        {web.tournaments && session.tournament && (
          <TabsContent value="tournament" className="mt-6">
            <TournamentPanel tournament={session.tournament} actions={actions} />
          </TabsContent>
        )}
      </Tabs>
    )
  }

  const main = (
    <div className="session-main">
      {header}
      {body}
    </div>
  )

  return (
    <section aria-labelledby="session-title" className={cn('session-page', withQueue && 'session-page-split')}>
      {sessionId && !isRunning && !loading ? (
        <PageMeta title="Session results" description="Final standings, badges and results of a finished session." />
      ) : (
        <PageMeta title="Session board" description="Set up courts, players, scoring and matchmaking, then run a fair player queue." />
      )}
      {session && sport ? (
        <BoardDnd
          onAssign={(player, courtId, side) => actions.assignPlayer.mutate({ courtId, input: { playerId: player.playerId, side } })}
          onUnassign={(player) => actions.unassignPlayer.mutate(player.playerId)}
        >
          {main}
          <aside aria-label="Queue" className="session-queue-panel">
            <QueueList
              sport={sport}
              queue={session.queue}
              upNext={session.upNext}
              awaitingCheckIn={session.awaitingCheckIn}
              onBreak={session.onBreak}
              playersPerMatch={session.playersPerMatch}
              onRemove={(id) => actions.removePlayer.mutate(id)}
              onCheckIn={(id) => actions.checkInPlayer.mutate(id)}
              onSetBreak={(playerId, onBreak) => actions.setBreak.mutate({ playerId, onBreak })}
              clockOffsetMs={clockOffset(session.serverTime, board.dataUpdatedAt)}
              tournament={
                web.tournaments && session.tournament?.status === 'active'
                  ? {
                      competitors: session.tournamentCompetitors,
                      blockedReason: session.competitorsBlockedReason,
                      pending: actions.setCompetitors.isPending,
                      onUpdate: (ids) => actions.setCompetitors.mutate(ids),
                    }
                  : null
              }
            />
          </aside>
        </BoardDnd>
      ) : (
        <>
          {main}
          {loading && sessionId && (
            <aside aria-label="Queue" className="session-queue-panel">
              <QueueListSkeleton />
            </aside>
          )}
        </>
      )}

      {signedIn && (
        <SessionSetupDialog
          open={dialog !== null}
          mode={dialog ?? 'create'}
          initial={dialog === 'edit' && session ? draftFromSession(session) : newSessionDraft(defaultSportId)}
          locks={lockedIds(dialog === 'edit' ? session : null)}
          pending={save.isPending}
          error={save.error}
          onOpenChange={(open) => !open && setDialog(null)}
          onSubmit={(draft) =>
            save.mutate(draft, {
              onSuccess: (s) => {
                setDialog(null)
                // A new session opens on its own page; other running sessions stay in the switcher.
                if (dialog === 'create') navigate(`/app/${s.id}`)
              },
            })
          }
        />
      )}
    </section>
  )
}
