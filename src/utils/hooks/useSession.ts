import type {
  ActiveSessionSummary,
  ActiveSessionsResponse,
  AddPlayerInput,
  AssignPlayerInput,
  CheckInLinkResponse,
  EndedSessionResponse,
  EndedSessionView,
  EndedSessionsResponse,
  FinishMatchInput,
  LatestEndedSessionResponse,
  PublishResponse,
  SessionSetupInput,
  SessionView,
  TournamentMatchView,
  TournamentPublishResponse,
  TournamentSetupInput,
} from '@matchpoynt/shared'
import { useInfiniteQuery, useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { board } from '@/config/board'
import type { ActionFailure } from '@/interfaces/ActionFailure'
import { api } from '@/utils/api/client'
import { ApiRequestError } from '@/utils/api/errors'
import { queryKeys } from '@/utils/api/queryClient'
import { dismissProgress, notifyChange, notifyDone, notifyProgress } from '@/utils/feedback/notify'
import { autoStarted, courtLabel, matchup, newlyCheckedIn, playerName, scoreLine } from '@/utils/feedback/sessionMessages'
import { tournamentFormatLabel } from '@/utils/feedback/tournamentMessages'
import { previewAssign, previewUnassign } from '@/utils/forms/lineupPreview'
import { forget, recall } from '@/utils/platform/remember'

/** The signed-in Queue Master's running sessions, newest first, for the session switchers. */
export function useActiveSessions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.activeSessions,
    queryFn: async ({ signal }) => (await api<ActiveSessionsResponse>('GET', '/sessions/active', { signal })).sessions,
    enabled,
  })
}

/**
 * One running session's board. While players are still to check in, it
 * polls, so QR check-ins show up on the board (and are announced). Polling
 * pauses while a board change is in flight.
 */
export function useSessionBoard(sessionId: string, enabled = true) {
  const client = useQueryClient()
  const changing = useIsMutating() > 0
  return useQuery({
    queryKey: queryKeys.session(sessionId),
    queryFn: async ({ signal }) => {
      const previous = client.getQueryData<SessionView>(queryKeys.session(sessionId))
      const session = await api<SessionView>('GET', `/sessions/${encodeURIComponent(sessionId)}`, { signal })
      const arrived = newlyCheckedIn(previous, session)
      if (arrived.length) notifyChange(arrived.length === 1 ? `${arrived[0]} checked in` : `${arrived.length} players checked in`, arrived.join(', '))
      return session
    },
    enabled,
    refetchInterval: (query) => (!changing && query.state.data?.awaitingCheckIn.length ? board.checkInPollMs : false),
  })
}

/** The last finished session, shown with its leaderboard while there's no running one. */
export function useLatestEndedSession(enabled = true) {
  const client = useQueryClient()
  return useQuery({
    queryKey: queryKeys.latestEndedSession,
    queryFn: async ({ signal }) => {
      const { session } = await api<LatestEndedSessionResponse>('GET', '/sessions/latest-ended', { signal })
      // The board moves on to this session's own page, which can then show it without asking again.
      if (session) client.setQueryData(queryKeys.endedSession(session.id), session)
      return session
    },
    enabled,
  })
}

/** A finished session by id, for its page (`/app/<session id>`). */
/** Every finished session, newest first, a page at a time (Past sessions). */
export function useEndedSessions(enabled = true) {
  const client = useQueryClient()
  return useInfiniteQuery({
    queryKey: queryKeys.endedSessions,
    queryFn: async ({ signal, pageParam }) => {
      const page = await api<EndedSessionsResponse>('GET', `/sessions/ended${pageParam ? `?${new URLSearchParams({ before: pageParam })}` : ''}`, { signal })
      // Each session's page can then open without asking again.
      for (const session of page.sessions) client.setQueryData(queryKeys.endedSession(session.id), session)
      return page
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextBefore,
    enabled,
  })
}

/**
 * Deletes a session for good, running or finished (unlike finishing, which
 * keeps its results). Its queries are dropped and the session lists reload;
 * the caller decides where to go next. Failures show in the caller's banner.
 */
export function useDeleteSession() {
  const client = useQueryClient()
  return useMutation<void, unknown, { id: string; label: string }, { toastId: string | number }>({
    mutationFn: ({ id }) => api<void>('DELETE', `/sessions/${encodeURIComponent(id)}`),
    onMutate: ({ label }) => ({ toastId: notifyProgress(`Deleting ${label}…`) }),
    onSuccess: (_v, { id, label }, ctx) => {
      notifyDone(`${label} deleted`, { id: ctx?.toastId, description: 'Its board, players and results are gone.' })
      if (recall('session') === id) forget('session')
      // Out of the cached lists at once: /app reads them before they reload, and would otherwise reopen the deleted session.
      client.setQueryData<ActiveSessionSummary[]>(queryKeys.activeSessions, (prev) => prev?.filter((s) => s.id !== id))
      client.setQueryData<EndedSessionView | null>(queryKeys.latestEndedSession, (prev) => (prev?.id === id ? null : prev))
      client.removeQueries({ queryKey: ['sessions', id] })
      void client.invalidateQueries({ queryKey: queryKeys.activeSessions })
      void client.invalidateQueries({ queryKey: queryKeys.latestEndedSession })
      void client.invalidateQueries({ queryKey: queryKeys.endedSessions })
      void client.invalidateQueries({ queryKey: queryKeys.clubs })
    },
    onError: (_e, _v, ctx) => dismissProgress(ctx?.toastId),
  })
}

export function useEndedSession(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.endedSession(sessionId),
    queryFn: async ({ signal }) => (await api<EndedSessionResponse>('GET', `/sessions/${encodeURIComponent(sessionId)}/ended`, { signal })).session,
    enabled,
  })
}

interface Tracked<V, D> {
  mutationFn: (vars: V) => Promise<D>
  /** Completes "Couldn't …" in the error banner. */
  action: (vars: V) => string
  progress: (vars: V) => string
  done: (data: D, vars: V) => string
  /** May return a promise: callers' own onSuccess (e.g. navigating) waits for it. */
  onSuccess?: (data: D, vars: V) => void | Promise<unknown>
  /** Board actions report failures to the board banner; dialogs show their own. */
  scope: 'board' | 'dialog'
  /** Show the expected result at once (drags); the API's answer replaces it. */
  optimistic?: (session: SessionView, vars: V) => SessionView
  /** Skip the loading toast for instant actions like drags. */
  quiet?: boolean
}

/**
 * Board actions. Every change goes to the API, which runs the rules and
 * returns the new board. Progress and results are toasted; failures go to an
 * error banner, never a toast. On a version conflict the board is refetched.
 */
export function useSessionActions(sessionId: string | null) {
  const client = useQueryClient()
  const [failure, setFailure] = useState<ActionFailure | null>(null)
  const key = queryKeys.session(sessionId ?? 'none')
  // Callbacks read the session from the query cache, so they always see the latest version.
  const latest = () => (sessionId ? (client.getQueryData<SessionView>(key) ?? null) : null)

  const path = (suffix = '') => `/sessions/${latest()?.id}${suffix}`
  const version = () => latest()?.version

  const setBoard = (next: SessionView, requestedCourtId?: string) => {
    for (const court of autoStarted(latest(), next, requestedCourtId)) {
      notifyChange(`Auto-fill started a match on ${court.label}`, matchup(court))
    }
    client.setQueryData(queryKeys.session(next.id), next)
    void client.invalidateQueries({ queryKey: queryKeys.leaderboard(next.id) })
  }

  function useTracked<V, D>(t: Tracked<V, D>) {
    const mutation = useMutation<D, unknown, V, { toastId?: string | number }>({
      mutationFn: t.mutationFn,
      // One change at a time per board: each sends the version the previous one produced.
      scope: { id: `session-board-${sessionId ?? 'new'}` },
      onMutate: async (vars) => {
        if (t.optimistic) {
          await client.cancelQueries({ queryKey: key })
          const current = latest()
          if (current) client.setQueryData(key, t.optimistic(current, vars))
        }
        return { toastId: t.quiet ? undefined : notifyProgress(t.progress(vars)) }
      },
      onSuccess: (data, vars, ctx) => {
        notifyDone(t.done(data, vars), { id: ctx?.toastId })
        if (t.scope === 'board') setFailure(null)
        return t.onSuccess?.(data, vars)
      },
      onError: (error, vars, ctx) => {
        dismissProgress(ctx?.toastId)
        if (t.optimistic || (error instanceof ApiRequestError && error.status === 409)) {
          void client.invalidateQueries({ queryKey: key })
        }
        if (t.scope === 'board') setFailure({ action: t.action(vars), error, retry: () => mutation.mutate(vars) })
      },
    })
    return mutation
  }

  const actions = {
    create: useTracked({
      scope: 'dialog',
      mutationFn: (setup: SessionSetupInput) => api<SessionView>('POST', '/sessions', { body: setup }),
      action: () => 'start the session',
      progress: () => 'Starting the session…',
      done: (s) => `Session started: ${s.courts.length} courts, ${s.players.length} players`,
      // The switcher lists the new session before the page moves to it, so it opens as a board.
      onSuccess: (s) => {
        setBoard(s)
        return client.invalidateQueries({ queryKey: queryKeys.activeSessions })
      },
    }),
    update: useTracked({
      scope: 'dialog',
      mutationFn: (setup: SessionSetupInput) => api<SessionView>('PUT', path('/setup'), { body: setup, version: version() }),
      action: () => 'save the session settings',
      progress: () => 'Saving session settings…',
      done: () => 'Session settings saved',
      onSuccess: (s) => setBoard(s),
    }),
    finish: useTracked({
      scope: 'board',
      mutationFn: () => api<void>('POST', path('/end'), { version: version() }),
      action: () => 'finish the session',
      progress: () => 'Finishing the session…',
      done: () => 'Session finished. Results are saved.',
      onSuccess: () => {
        if (sessionId) {
          // Out of the running list first, so the page shows its results instead of reloading its board.
          client.setQueryData<ActiveSessionSummary[]>(queryKeys.activeSessions, (prev) => prev?.filter((s) => s.id !== sessionId))
          client.removeQueries({ queryKey: key })
          void client.invalidateQueries({ queryKey: queryKeys.endedSession(sessionId) })
        }
        void client.invalidateQueries({ queryKey: queryKeys.activeSessions })
        void client.invalidateQueries({ queryKey: queryKeys.latestEndedSession })
        void client.invalidateQueries({ queryKey: queryKeys.endedSessions })
      },
    }),
    addCourt: useTracked({
      scope: 'board',
      mutationFn: () => api<SessionView>('POST', path('/courts'), { version: version() }),
      action: () => 'add a court',
      progress: () => 'Adding a court…',
      done: (s) => `${s.courts.at(-1)?.label ?? 'Court'} added`,
      onSuccess: (s) => setBoard(s),
    }),
    checkInPlayer: useTracked({
      scope: 'board',
      mutationFn: (playerId: string) => api<SessionView>('POST', path(`/players/${playerId}/check-in`), { version: version() }),
      action: (id) => `check ${playerName(latest(), id)} in`,
      progress: (id) => `Checking ${playerName(latest(), id)} in…`,
      done: (_s, id) => `${playerName(latest(), id)} checked in and joined the queue`,
      onSuccess: (s) => setBoard(s),
    }),
    openCheckIn: useTracked({
      scope: 'dialog',
      quiet: true,
      mutationFn: () => api<CheckInLinkResponse>('POST', path('/check-in')),
      action: () => 'make the check-in QR code',
      progress: () => '',
      done: () => 'Check-in QR is ready to scan',
      onSuccess: ({ checkInUrl }) => {
        const s = latest()
        if (s) client.setQueryData(key, { ...s, checkIn: { ...s.checkIn, url: checkInUrl } })
      },
    }),
    addPlayer: useTracked({
      scope: 'board',
      mutationFn: (input: AddPlayerInput) => api<SessionView>('POST', path('/players'), { body: input, version: version() }),
      action: (input) => `add ${input.name} to the queue`,
      progress: (input) => `Adding ${input.name}…`,
      done: (_s, input) => (input.checkedIn === false ? `${input.name} added, waiting to check in` : `${input.name} checked in and joined the queue`),
      onSuccess: (s) => setBoard(s),
    }),
    removePlayer: useTracked({
      scope: 'board',
      mutationFn: (playerId: string) => api<SessionView>('DELETE', path(`/players/${playerId}`), { version: version() }),
      action: (id) => `remove ${playerName(latest(), id)}`,
      progress: (id) => `Removing ${playerName(latest(), id)}…`,
      done: (_s, id) => `${playerName(latest(), id)} left the session`,
      onSuccess: (s) => setBoard(s),
    }),
    restartMatch: useTracked({
      scope: 'board',
      mutationFn: (courtId: string) => api<SessionView>('POST', path(`/courts/${courtId}/restart`), { version: version() }),
      action: (courtId) => `restart the match on ${courtLabel(latest(), courtId)}`,
      progress: (courtId) => `Restarting the match on ${courtLabel(latest(), courtId)}…`,
      done: (s, courtId) => `${courtLabel(s, courtId)}: match restarted from 0:00`,
      onSuccess: (s) => setBoard(s),
    }),
    setCompetitors: useTracked({
      scope: 'board',
      mutationFn: (playerIds: string[]) => api<SessionView>('PUT', path('/tournament/competitors'), { body: { playerIds }, version: version() }),
      action: () => "update who's competing in the tournament",
      progress: () => 'Redrawing the tournament…',
      done: (_s, ids) => `Tournament redrawn: ${ids.length} competing`,
      onSuccess: (s) => setBoard(s),
    }),
    removeCourt: useTracked({
      scope: 'board',
      mutationFn: (courtId: string) => api<SessionView>('DELETE', path(`/courts/${courtId}`), { version: version() }),
      action: (courtId) => `remove ${courtLabel(latest(), courtId)}`,
      progress: (courtId) => `Removing ${courtLabel(latest(), courtId)}…`,
      done: () => 'Court removed',
      onSuccess: (s) => setBoard(s),
    }),
    cancelMatch: useTracked({
      scope: 'board',
      mutationFn: (courtId: string) => api<SessionView>('POST', path(`/courts/${courtId}/cancel`), { version: version() }),
      action: (courtId) => `cancel the match on ${courtLabel(latest(), courtId)}`,
      progress: (courtId) => `Cancelling the match on ${courtLabel(latest(), courtId)}…`,
      done: (s, courtId) => `${courtLabel(s, courtId)}: match cancelled, players back in the queue`,
      onSuccess: (s) => setBoard(s),
    }),
    restartSession: useTracked({
      scope: 'board',
      mutationFn: () => api<SessionView>('POST', path('/restart'), { version: version() }),
      action: () => 'start the session over',
      progress: () => 'Starting the session over…',
      done: () => 'Session started over: results cleared, everyone back in the queue',
      onSuccess: (s) => {
        setBoard(s)
        // Its results are gone: the leaderboard and lists showing it reload.
        if (sessionId) void client.invalidateQueries({ queryKey: queryKeys.leaderboard(sessionId) })
        void client.invalidateQueries({ queryKey: queryKeys.activeSessions })
      },
    }),
    startMatch: useTracked({
      scope: 'board',
      mutationFn: (courtId: string) => api<SessionView>('POST', path(`/courts/${courtId}/start`), { version: version() }),
      action: (courtId) => `start a match on ${courtLabel(latest(), courtId)}`,
      progress: (courtId) => `Starting a match on ${courtLabel(latest(), courtId)}…`,
      done: (s, courtId) => {
        const court = s.courts.find((c) => c.id === courtId)
        return court ? `${court.label}: ${matchup(court)}` : 'Match started'
      },
      onSuccess: (s, courtId) => setBoard(s, courtId),
    }),
    assignPlayer: useTracked({
      scope: 'board',
      quiet: true,
      mutationFn: ({ courtId, input }: { courtId: string; input: AssignPlayerInput }) =>
        api<SessionView>('POST', path(`/courts/${courtId}/lineup`), { body: input, version: version() }),
      optimistic: (s, { courtId, input }) => previewAssign(s, courtId, input.playerId, input.side),
      action: ({ courtId, input }) => `place ${playerName(latest(), input.playerId)} on ${courtLabel(latest(), courtId)}`,
      progress: () => '',
      done: (_s, { courtId, input }) => `${playerName(latest(), input.playerId)} → ${courtLabel(latest(), courtId)}, side ${input.side + 1}`,
      onSuccess: (s) => setBoard(s),
    }),
    unassignPlayer: useTracked({
      scope: 'board',
      quiet: true,
      mutationFn: (playerId: string) => api<SessionView>('DELETE', path(`/players/${playerId}/lineup`), { version: version() }),
      optimistic: (s, playerId) => previewUnassign(s, playerId),
      action: (playerId) => `move ${playerName(latest(), playerId)} back to the queue`,
      progress: () => '',
      done: (_s, playerId) => `${playerName(latest(), playerId)} is back in the queue`,
      onSuccess: (s) => setBoard(s),
    }),
    setQueueing: useTracked({
      scope: 'board',
      mutationFn: (setup: SessionSetupInput) => api<SessionView>('PUT', path('/setup'), { body: setup, version: version() }),
      action: (setup) => `turn automatic queueing ${setup.rules.queueing === 'automatic' ? 'on' : 'off'}`,
      progress: (setup) => `Turning automatic queueing ${setup.rules.queueing === 'automatic' ? 'on' : 'off'}…`,
      done: (s) =>
        s.rules.queueing === 'automatic'
          ? 'Automatic queueing on: open places fill from the queue'
          : 'Automatic queueing off: drag players onto courts',
      onSuccess: (s) => setBoard(s),
    }),
    finishMatch: useTracked({
      scope: 'dialog',
      mutationFn: ({ courtId, input }: { courtId: string; input: FinishMatchInput }) =>
        api<SessionView>('POST', path(`/courts/${courtId}/finish`), { body: input, version: version() }),
      action: ({ courtId }) => `save the result on ${courtLabel(latest(), courtId)}`,
      progress: ({ courtId }) => `Saving the result on ${courtLabel(latest(), courtId)}…`,
      done: (_s, { courtId, input }) =>
        input.games.length
          ? `${courtLabel(latest(), courtId)} result saved: ${scoreLine(input.games)}`
          : `${courtLabel(latest(), courtId)} finished without a score`,
      onSuccess: (s) => setBoard(s),
    }),
    publish: useTracked({
      scope: 'dialog',
      mutationFn: () => api<PublishResponse>('POST', path('/publish')),
      action: () => 'publish the leaderboard',
      progress: () => 'Publishing the leaderboard…',
      done: () => 'Leaderboard link is live',
      onSuccess: ({ publicUrl }) => {
        const s = latest()
        if (s) client.setQueryData(key, { ...s, publicUrl })
      },
    }),
    createTournament: useTracked({
      scope: 'dialog',
      mutationFn: (input: TournamentSetupInput) => api<SessionView>('POST', path('/tournament'), { body: input, version: version() }),
      action: () => 'set up the tournament',
      progress: (input) => `Setting up ${input.name.trim() || 'the tournament'}…`,
      done: (s) =>
        s.tournament
          ? `${s.tournament.name}: ${tournamentFormatLabel(s.tournament.format)}, ${s.tournament.teamMode === 'rotating' ? `${s.players.length} players` : `${s.tournament.entrants.length} entrants`}`
          : 'Tournament set up',
      onSuccess: (s) => setBoard(s),
    }),
    setCourtTournament: useTracked({
      scope: 'board',
      mutationFn: ({ courtId, on }: { courtId: string; on: boolean }) =>
        api<SessionView>('PUT', path(`/courts/${courtId}/tournament`), { body: { on }, version: version() }),
      action: ({ courtId, on }) => `switch ${courtLabel(latest(), courtId)} ${on ? 'to tournament play' : 'back to open play'}`,
      progress: ({ courtId, on }) => `Switching ${courtLabel(latest(), courtId)} ${on ? 'to tournament play' : 'to open play'}…`,
      done: (s, { courtId, on }) => `${courtLabel(s, courtId)} ${on ? 'plays tournament matches' : 'is back to open play'}`,
      onSuccess: (s) => setBoard(s),
    }),
    startTournamentMatch: useTracked({
      scope: 'board',
      mutationFn: (match: TournamentMatchView) => api<SessionView>('POST', path(`/tournament/matches/${match.id}/start`), { version: version() }),
      action: (m) => `start ${m.label}`,
      progress: (m) => `Starting ${m.label}…`,
      done: (s, m) => {
        const court = s.courts.find((c) => c.tournamentMatch?.label === m.label && c.status === 'playing')
        return court ? `${court.label}, ${m.label}: ${matchup(court)}` : `${m.label} started`
      },
      onSuccess: (s) => setBoard(s),
    }),
    cancelTournament: useTracked({
      scope: 'board',
      mutationFn: () => api<SessionView>('DELETE', path('/tournament'), { version: version() }),
      action: () => 'cancel the tournament',
      progress: () => 'Cancelling the tournament…',
      done: () => 'Tournament cancelled. Its courts are back to open play.',
      onSuccess: (s) => setBoard(s),
    }),
    publishTournament: useTracked({
      scope: 'dialog',
      mutationFn: () => api<TournamentPublishResponse>('POST', path('/tournament/publish')),
      action: () => 'publish the tournament',
      progress: () => 'Publishing the tournament…',
      done: () => 'Tournament link is live',
      onSuccess: ({ publicUrl }) => {
        const s = latest()
        if (s?.tournament) client.setQueryData(key, { ...s, tournament: { ...s.tournament, publicUrl } })
      },
    }),
    unpublishTournament: useTracked({
      scope: 'dialog',
      mutationFn: () => api<TournamentPublishResponse>('DELETE', path('/tournament/publish')),
      action: () => 'stop sharing the tournament',
      progress: () => 'Turning off the tournament link…',
      done: () => 'Stopped sharing the tournament',
      onSuccess: () => {
        const s = latest()
        if (s?.tournament) client.setQueryData(key, { ...s, tournament: { ...s.tournament, publicUrl: null } })
      },
    }),
    unpublish: useTracked({
      scope: 'dialog',
      mutationFn: () => api<PublishResponse>('DELETE', path('/publish')),
      action: () => 'stop sharing the leaderboard',
      progress: () => 'Turning off the public link…',
      done: () => 'Stopped sharing the leaderboard',
      onSuccess: () => {
        const s = latest()
        if (s) client.setQueryData(key, { ...s, publicUrl: null })
      },
    }),
  }

  return { ...actions, failure, clearFailure: () => setFailure(null) }
}
