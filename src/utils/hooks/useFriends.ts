import type { FriendSearchResponse, FriendsView } from '@matchpoynt/shared'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { dismissProgress, notifyDone, notifyProgress } from '@/utils/feedback/notify'
import { useDebounced } from '@/utils/hooks/useDebounced'

/** The signed-in person's friends and requests, as the API sorts them. */
export function useFriends(enabled = true) {
  return useQuery({ queryKey: queryKeys.friends, queryFn: ({ signal }) => api<FriendsView>('GET', '/friends', { signal }), enabled })
}

/** People to add, by name, email or @username, each with where they stand with you. */
export function useFriendSearch(q: string) {
  const query = useDebounced(q.trim(), 250)
  return useQuery({
    queryKey: queryKeys.friendSearch(query),
    queryFn: async ({ signal }) => (await api<FriendSearchResponse>('GET', `/friends/search?${new URLSearchParams({ q: query })}`, { signal })).people,
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
  })
}

/** One friends change: a loading toast that turns into its result, and the whole page from the answer. */
function useFriendMutation<V extends { name: string }>(request: (v: V) => Promise<FriendsView>, progress: (v: V) => string, done: (v: V) => string) {
  const client = useQueryClient()
  return useMutation<FriendsView, unknown, V, { toastId: string | number }>({
    mutationFn: request,
    onMutate: (v) => ({ toastId: notifyProgress(progress(v)) }),
    onSuccess: (view, v, ctx) => {
      notifyDone(done(v), { id: ctx?.toastId })
      client.setQueryData(queryKeys.friends, view)
      // The search's buttons follow where each person now stands.
      void client.invalidateQueries({ queryKey: ['friends', 'search'] })
      // So do people's profiles.
      void client.invalidateQueries({ queryKey: ['person'] })
    },
    onError: (_e, _v, ctx) => dismissProgress(ctx?.toastId),
  })
}

const friendPath = (id: string) => `/friends/${encodeURIComponent(id)}`

/** Adding, answering and removing friends. Failures show in the page's banner. */
export function useFriendActions() {
  return {
    add: useFriendMutation<{ userId: string; name: string }>(
      ({ userId }) => api<FriendsView>('POST', '/friends', { body: { userId } }),
      ({ name }) => `Asking ${name} to be friends…`,
      ({ name }) => `Friend request sent to ${name}`,
    ),
    answer: useFriendMutation<{ id: string; name: string; accept: boolean }>(
      ({ id, accept }) => api<FriendsView>('POST', friendPath(id), { body: { accept } }),
      ({ name, accept }) => (accept ? `Accepting ${name}…` : `Declining ${name}'s request…`),
      ({ name, accept }) => (accept ? `You and ${name} are friends` : `${name}'s request declined`),
    ),
    remove: useFriendMutation<{ id: string; name: string; pending: boolean }>(
      ({ id }) => api<FriendsView>('DELETE', friendPath(id)),
      ({ name, pending }) => (pending ? `Cancelling your request to ${name}…` : `Removing ${name}…`),
      ({ name, pending }) => (pending ? `Request to ${name} cancelled` : `${name} removed from your friends`),
    ),
  }
}
