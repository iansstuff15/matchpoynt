import type { LeaderboardView, PlayerLiveListResponse, PlayerLiveView, PlayerSessionResponse } from '@matchpoynt/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { board } from '@/config/board'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { dismissProgress, notifyDone, notifyProgress } from '@/utils/feedback/notify'

/** Running sessions of your clubs that you're on the roster of. */
export function usePlayerSessions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.playSessions,
    queryFn: async ({ signal }) => (await api<PlayerLiveListResponse>('GET', '/play', { signal })).sessions,
    enabled,
    refetchInterval: board.playerViewPollMs,
  })
}

/**
 * One session as its players see it: live, refreshed every
 * `board.playerViewPollMs` while open, until it ends; then its ended screen
 * (no more refreshing, and the list of running sessions is refreshed).
 */
export function usePlayerLive(sessionId: string) {
  const client = useQueryClient()
  return useQuery({
    queryKey: queryKeys.playSession(sessionId),
    queryFn: async ({ signal }) => {
      const answer = await api<PlayerSessionResponse>('GET', `/play/${encodeURIComponent(sessionId)}`, { signal })
      if (answer.ended) void client.invalidateQueries({ queryKey: queryKeys.playSessions, exact: true })
      return answer
    },
    refetchInterval: (query) => (query.state.data?.ended ? false : board.playerViewPollMs),
    refetchIntervalInBackground: false,
  })
}

/** The session's leaderboard for a player in it, refreshed like the live view while its tab is open. */
export function usePlayerLeaderboard(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.playLeaderboard(sessionId),
    queryFn: ({ signal }) => api<LeaderboardView>('GET', `/play/${encodeURIComponent(sessionId)}/leaderboard`, { signal }),
    enabled,
    refetchInterval: board.playerViewPollMs,
    refetchIntervalInBackground: false,
  })
}

/** Checks the viewer in to the session from the app (as the venue's QR does); the API answers with the refreshed view. */
export function usePlayerCheckIn(sessionId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api<PlayerLiveView>('POST', `/play/${encodeURIComponent(sessionId)}/check-in`),
    onMutate: () => ({ toast: notifyProgress('Checking you in…') }),
    onSuccess: (view, _v, context) => {
      client.setQueryData(queryKeys.playSession(sessionId), view)
      void client.invalidateQueries({ queryKey: queryKeys.playSessions, exact: true })
      notifyDone("You're checked in", { id: context?.toast, description: view.me?.headline })
    },
    onError: (_e, _v, context) => dismissProgress(context?.toast),
  })
}

/** Starts (`true`) or ends the viewer's break; they sit out the queue meanwhile. The API answers with the refreshed view. */
export function usePlayerBreak(sessionId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (onBreak: boolean) => api<PlayerLiveView>('POST', `/play/${encodeURIComponent(sessionId)}/break`, { body: { onBreak } }),
    onMutate: (onBreak) => ({ toast: notifyProgress(onBreak ? 'Starting your break…' : 'Putting you back in the queue…') }),
    onSuccess: (view, onBreak, context) => {
      client.setQueryData(queryKeys.playSession(sessionId), view)
      void client.invalidateQueries({ queryKey: queryKeys.playSessions, exact: true })
      notifyDone(onBreak ? "You're on a break" : "You're back in the queue", { id: context?.toast, description: view.me?.headline })
    },
    onError: (_e, _v, context) => dismissProgress(context?.toast),
  })
}
