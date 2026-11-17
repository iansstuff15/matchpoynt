import type { ClubAnnouncementInput, ClubAnnouncementsView, ClubAnnouncementView } from '@matchpoynt/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { dismissProgress, notifyDone, notifyProgress } from '@/utils/feedback/notify'

const base = (clubId: string) => `/clubs/${encodeURIComponent(clubId)}/announcements`

/** The club's announcements, pinned first then newest, with whether another can be posted or pinned (owner). */
export function useClubAnnouncements(clubId: string) {
  return useQuery({ queryKey: queryKeys.clubAnnouncements(clubId), queryFn: ({ signal }) => api<ClubAnnouncementsView>('GET', base(clubId), { signal }) })
}

/** A club's newest announcements for a member. */
export function useMemberAnnouncements(handle: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.memberAnnouncements(handle),
    queryFn: ({ signal }) => api<ClubAnnouncementView[]>('GET', `/directory/${encodeURIComponent(handle)}/announcements`, { signal }),
    enabled,
  })
}

/** One change: a loading toast that turns into its result, and the whole list from the answer. */
function useAnnouncementMutation<V>(clubId: string, request: (v: V) => Promise<ClubAnnouncementsView>, progress: (v: V) => string, done: (v: V) => string) {
  const client = useQueryClient()
  return useMutation<ClubAnnouncementsView, unknown, V, { toastId: string | number }>({
    mutationFn: request,
    onMutate: (v) => ({ toastId: notifyProgress(progress(v)) }),
    onSuccess: (view, v, ctx) => {
      notifyDone(done(v), { id: ctx?.toastId })
      client.setQueryData(queryKeys.clubAnnouncements(clubId), view)
      void client.invalidateQueries({ queryKey: ['announcements', 'member'] })
    },
    onError: (_e, _v, ctx) => dismissProgress(ctx?.toastId),
  })
}

/** Posting, editing and deleting announcements. Failures show in the page's banner. */
export function useAnnouncementActions(clubId: string) {
  return {
    post: useAnnouncementMutation<ClubAnnouncementInput>(
      clubId,
      (input) => api<ClubAnnouncementsView>('POST', base(clubId), { body: input }),
      () => 'Posting the announcement…',
      (input) => `Posted “${input.title.trim()}”`,
    ),
    edit: useAnnouncementMutation<{ id: string; input: ClubAnnouncementInput }>(
      clubId,
      ({ id, input }) => api<ClubAnnouncementsView>('PUT', `${base(clubId)}/${encodeURIComponent(id)}`, { body: input }),
      () => 'Saving the announcement…',
      ({ input }) => `Saved “${input.title.trim()}”`,
    ),
    remove: useAnnouncementMutation<{ id: string; title: string }>(
      clubId,
      ({ id }) => api<ClubAnnouncementsView>('DELETE', `${base(clubId)}/${encodeURIComponent(id)}`),
      ({ title }) => `Deleting “${title}”…`,
      ({ title }) => `Deleted “${title}”`,
    ),
  }
}
