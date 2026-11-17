import type { PhotoPosition, ProfileGamesResponse, ProfileInput, ProfilePageView, ProfileRecordView, SocialLink } from '@matchpoynt/shared'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { dismissProgress, notifyDone, notifyProgress } from '@/utils/feedback/notify'

/** The signed-in person's profile page: details, photo, links, clubs, record and badges. */
export function useProfilePage(enabled = true) {
  return useQuery({ queryKey: queryKeys.profilePage, queryFn: ({ signal }) => api<ProfilePageView>('GET', '/profile/page', { signal }), enabled })
}

/** Which games to show: one sport's, one club's or one session's (each optional). */
export interface GamesFilter {
  sport?: string
  club?: string
  session?: string
}

/** Their games, newest first, a page at a time, optionally filtered (the API filters). */
export function useProfileGames(enabled = true, filter: GamesFilter = {}) {
  const only = Object.fromEntries(Object.entries(filter).filter(([, v]) => v)) as Record<string, string>
  return useInfiniteQuery({
    queryKey: Object.keys(only).length ? queryKeys.profileGamesOf(only) : queryKeys.profileGames,
    queryFn: ({ signal, pageParam }) => {
      const query = new URLSearchParams(only)
      if (pageParam) query.set('before', pageParam)
      return api<ProfileGamesResponse>('GET', `/profile/games${query.size ? `?${query}` : ''}`, { signal })
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextBefore,
    enabled,
  })
}

/** Their record across every club, sport and session, and their badge collection. */
export function useProfileRecord() {
  return useQuery({ queryKey: queryKeys.profileRecord, queryFn: ({ signal }) => api<ProfileRecordView>('GET', '/profile/record', { signal }) })
}

interface Tracked<V> {
  mutationFn: (vars: V) => Promise<unknown>
  progress: string
  done: (vars: V) => string
}

/**
 * Changes to the signed-in person's profile: details, photo (upload, align,
 * remove) and links. The API checks each; afterwards the profile page and the
 * signed-in user (name and photo in the sidebar) reload. Failures show in the
 * caller's error banner.
 */
export function useProfileActions() {
  const client = useQueryClient()
  function useTracked<V>(t: Tracked<V>) {
    return useMutation<unknown, unknown, V, { toastId: string | number }>({
      mutationFn: t.mutationFn,
      scope: { id: 'profile' },
      onMutate: () => ({ toastId: notifyProgress(t.progress) }),
      onSuccess: (_d, vars, ctx) => {
        notifyDone(t.done(vars), { id: ctx?.toastId })
        void client.invalidateQueries({ queryKey: queryKeys.me })
        return client.invalidateQueries({ queryKey: ['profile'] })
      },
      onError: (_e, _v, ctx) => dismissProgress(ctx?.toastId),
    })
  }
  const form = (file: File) => {
    const data = new FormData()
    data.append('image', file)
    return data
  }
  return {
    saveProfile: useTracked({
      mutationFn: (profile: ProfileInput) => api('PUT', '/profile', { body: profile }),
      progress: 'Saving your profile…',
      done: () => 'Profile saved',
    }),
    uploadPhoto: useTracked({
      mutationFn: (file: File) => api<void>('PUT', '/profile/avatar', { form: form(file) }),
      progress: 'Uploading your photo…',
      done: () => 'New profile photo saved',
    }),
    alignPhoto: useTracked({
      mutationFn: (position: PhotoPosition) => api<void>('PUT', '/profile/avatar/position', { body: position }),
      progress: 'Saving the photo position…',
      done: () => 'Profile photo aligned',
    }),
    removePhoto: useTracked({
      mutationFn: () => api<void>('DELETE', '/profile/avatar'),
      progress: 'Removing your photo…',
      done: () => 'Profile photo removed',
    }),
    saveSocial: useTracked({
      mutationFn: (links: SocialLink[]) => api<void>('PUT', '/profile/social', { body: { links } }),
      progress: 'Saving your links…',
      done: (links) => (links.length ? `Links saved: ${links.length}` : 'Links removed'),
    }),
  }
}
