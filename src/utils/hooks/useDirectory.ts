import type { PlanAttendeesView, UpcomingSessionView, ClubDirectoryResponse, ClubJoinCardView, JoinClubResponse, MyClubInvitesResponse, PlayerClubPageView, SessionJoinInput, MyClubsResponse } from '@matchpoynt/shared'
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { localCache } from '@/config/cache'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { dismissProgress, notifyDone, notifyProgress } from '@/utils/feedback/notify'

const clubPath = (handle: string, rest = '') => `/directory/${encodeURIComponent(handle)}${rest}`

/** The club directory, newest first, a page at a time; `q` narrows it by name or handle. */
export function useDirectory(q: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.directory(q.trim()),
    queryFn: ({ signal, pageParam }) => api<ClubDirectoryResponse>('GET', `/directory?${new URLSearchParams({ q: q.trim(), offset: String(pageParam) })}`, { signal }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
    placeholderData: keepPreviousData,
  })
}

/** A club's page for players, by handle. */
export function usePlayerClub(handle: string, enabled = true) {
  return useQuery({ queryKey: queryKeys.playerClub(handle), queryFn: ({ signal }) => api<PlayerClubPageView>('GET', clubPath(handle), { signal }), enabled, staleTime: localCache.clubStaleMs })
}

/** A club's join page, readable signed out. */
export function useJoinCard(handle: string) {
  return useQuery({ queryKey: queryKeys.joinCard(handle), queryFn: ({ signal }) => api<ClubJoinCardView>('GET', `/public/clubs/${encodeURIComponent(handle)}`, { signal }), staleTime: localCache.clubStaleMs })
}

/** In-app invites waiting for the signed-in person. */
/** The clubs the viewer is a member of, by name, for the club picker players see when they sign in. */
export function useMyClubs(enabled = true) {
  return useQuery({ queryKey: queryKeys.myClubs, queryFn: async ({ signal }) => (await api<MyClubsResponse>('GET', '/directory/mine', { signal })).clubs, enabled })
}

export function useMyInvites(enabled = true) {
  return useQuery({ queryKey: queryKeys.myInvites, queryFn: async ({ signal }) => (await api<MyClubInvitesResponse>('GET', '/directory/invites', { signal })).invites, enabled })
}

/**
 * Joining clubs and sessions, and answering invites. The API decides what
 * happens (joining at once or asking the owner); the club's page and the
 * directory reload with the answer. Failures show in the caller's banner.
 */
export function useJoining() {
  const client = useQueryClient()
  const refresh = (handle?: string) => {
    void client.invalidateQueries({ queryKey: ['directory'] })
    void client.invalidateQueries({ queryKey: queryKeys.clubs })
    if (handle) void client.invalidateQueries({ queryKey: queryKeys.joinCard(handle) })
  }
  return {
    joinClub: useMutation<JoinClubResponse, unknown, { handle: string; name: string }, { toastId: string | number }>({
      mutationFn: ({ handle }) => api<JoinClubResponse>('POST', clubPath(handle, '/join')),
      onMutate: ({ name }) => ({ toastId: notifyProgress(`Asking to join ${name}…`) }),
      onSuccess: (res, { handle, name }, ctx) => {
        notifyDone(res.status === 'joined' ? `You joined ${name}` : `Request sent to ${name}`, {
          id: ctx?.toastId,
          description: res.status === 'joined' ? undefined : 'The club owner reviews requests. You will see it here once they approve.',
        })
        client.setQueryData(queryKeys.playerClub(handle), res.page)
        refresh(handle)
      },
      onError: (_e, _v, ctx) => dismissProgress(ctx?.toastId),
    }),
    requestSession: useMutation<PlayerClubPageView, unknown, SessionJoinInput & { handle: string; title: string }, { toastId: string | number }>({
      mutationFn: ({ handle, planId, sessionId }) => api<PlayerClubPageView>('POST', clubPath(handle, '/sessions'), { body: { planId, sessionId } }),
      onMutate: ({ title }) => ({ toastId: notifyProgress(`Asking to join ${title}…`) }),
      onSuccess: (page, { handle, title }, ctx) => {
        notifyDone(`Asked to join ${title}`, { id: ctx?.toastId, description: 'The club owner adds you when they approve.' })
        client.setQueryData(queryKeys.playerClub(handle), page)
      },
      onError: (_e, _v, ctx) => dismissProgress(ctx?.toastId),
    }),
    signUp: useMutation<PlayerClubPageView, unknown, { handle: string; planId: string; title: string; going: boolean }, { toastId: string | number }>({
      mutationFn: ({ handle, planId, going }) => api<PlayerClubPageView>('POST', clubPath(handle, `/plans/${encodeURIComponent(planId)}/sign-up`), { body: { going } }),
      onMutate: ({ title, going }) => ({ toastId: notifyProgress(going ? `Signing you up for ${title}…` : `Taking you off ${title}…`) }),
      onSuccess: (page, { handle, planId, title, going }, ctx) => {
        notifyDone(going ? `You're signed up for ${title}` : `You're off ${title}`, { id: ctx?.toastId })
        client.setQueryData(queryKeys.playerClub(handle), page)
        void client.invalidateQueries({ queryKey: queryKeys.planAttendees(handle, planId) })
        void client.invalidateQueries({ queryKey: queryKeys.upcomingSessions })
      },
      onError: (_e, _v, ctx) => dismissProgress(ctx?.toastId),
    }),
    answerInvite: useMutation<MyClubInvitesResponse, unknown, { id: string; name: string; accept: boolean }, { toastId: string | number }>({
      mutationFn: ({ id, accept }) => api<MyClubInvitesResponse>('POST', `/directory/invites/${encodeURIComponent(id)}`, { body: { accept } }),
      onMutate: ({ name, accept }) => ({ toastId: notifyProgress(accept ? `Joining ${name}…` : `Declining ${name}'s invite…`) }),
      onSuccess: (res, { name, accept }, ctx) => {
        notifyDone(accept ? `You joined ${name}` : `${name}'s invite declined`, { id: ctx?.toastId })
        client.setQueryData(queryKeys.myInvites, res.invites)
        refresh()
      },
      onError: (_e, _v, ctx) => dismissProgress(ctx?.toastId),
    }),
  }
}

/** Who's signed up for a planned session, for the club's members. */
export function usePlanAttendees(handle: string, planId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.planAttendees(handle, planId),
    queryFn: ({ signal }) => api<PlanAttendeesView>('GET', clubPath(handle, `/plans/${encodeURIComponent(planId)}/attendees`), { signal }),
    enabled,
  })
}

/** Planned sessions the viewer is signed up for that start soon, soonest first: the reminder on Playing now. */
export function useUpcomingSessions(enabled = true) {
  return useQuery({ queryKey: queryKeys.upcomingSessions, queryFn: ({ signal }) => api<UpcomingSessionView[]>('GET', '/play/upcoming', { signal }), enabled })
}
