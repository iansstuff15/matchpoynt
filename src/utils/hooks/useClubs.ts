import type {
  ClubBadgeInput,
  ClubJoiningInput,
  ClubImageKind,
  ClubThemeInput,
  ClubInfoInput,
  ClubListResponse,
  ClubMemberInput,
  ClubSessionsResponse,
  ClubSummary,
  ClubView,
  CreateClubInput,
  FeeScheme,
  GifResult,
  PhotoPosition,
  PlannedSessionInput,
  PlannedSessionView,
  SavedThemeInput,
  SocialLink,
  SessionView,
} from '@matchpoynt/shared'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ActionFailure } from '@/interfaces/ActionFailure'
import { localCache } from '@/config/cache'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { photoLabel, planSummary } from '@/utils/feedback/clubMessages'
import { dismissProgress, notifyDone, notifyProgress } from '@/utils/feedback/notify'

/** A badge icon the person picked in the dialog, sent after the badge itself is saved. */
export type BadgeIconChoice = { kind: 'upload'; file: File } | { kind: 'gif'; gif: GifResult } | { kind: 'remove' }

const clubPath = (clubId: string, suffix = '') => `/clubs/${encodeURIComponent(clubId)}${suffix}`

const imageForm = (file: File) => {
  const form = new FormData()
  form.append('image', file)
  return form
}

/** The signed-in person's clubs. */
export function useClubs(enabled = true) {
  return useQuery({
    queryKey: queryKeys.clubs,
    queryFn: async ({ signal }) => (await api<ClubListResponse>('GET', '/clubs', { signal })).clubs,
    enabled,
    // Kept on this device (utils/api/persistCache.ts) and fresh for a while; changes made here refresh it at once.
    staleTime: localCache.clubStaleMs,
  })
}

/** The club picker's list: every club the account runs, a page at a time. */
export function useClubPages() {
  return useInfiniteQuery({
    queryKey: queryKeys.clubPages,
    queryFn: ({ signal, pageParam }) => api<ClubListResponse>('GET', `/clubs?${new URLSearchParams({ offset: String(pageParam) })}`, { signal }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
  })
}

/** One club with its members, planned sessions and past sessions, as the API assembles it. */
export function useClub(clubId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.club(clubId),
    queryFn: ({ signal }) => api<ClubView>('GET', clubPath(clubId), { signal }),
    enabled,
  })
}

/** Creates a club; the dialog shows its own error banner. */
export function useCreateClub() {
  const client = useQueryClient()
  return useMutation<ClubView, unknown, CreateClubInput, { toastId: string | number }>({
    mutationFn: (club) => api<ClubView>('POST', '/clubs', { body: club }),
    onMutate: (info) => ({ toastId: notifyProgress(`Creating ${info.name.trim() || 'the club'}…`) }),
    onSuccess: (view, _vars, ctx) => {
      notifyDone(`${view.club.name} is ready`, { id: ctx?.toastId, description: 'Its dashboard lists what to set up next.' })
      client.setQueryData(queryKeys.club(view.club.id), view)
      void client.invalidateQueries({ queryKey: queryKeys.clubs })
    },
    onError: (_error, _vars, ctx) => dismissProgress(ctx?.toastId),
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
  /** Page actions report failures to the page banner; dialogs show their own. */
  scope: 'page' | 'dialog'
}

/**
 * Club manager actions. Every change goes to the API, which checks it and
 * answers with the whole club, so the page only renders what comes back.
 * Progress and results are toasted; failures go to an error banner.
 */
export function useClubActions(clubId: string, onSessionStarted?: (session: SessionView) => void) {
  const client = useQueryClient()
  const [failure, setFailure] = useState<ActionFailure | null>(null)

  const setClub = (view: ClubView) => {
    client.setQueryData(queryKeys.club(clubId), view)
    // The kept list gets the change at once (not only when it's fetched again), so a reload never shows the old one.
    client.setQueryData<ClubSummary[]>(queryKeys.clubs, (list) => list?.map((c) => (c.id === view.club.id ? view.club : c)))
    void client.invalidateQueries({ queryKey: queryKeys.clubs, exact: true })
    void client.invalidateQueries({ queryKey: queryKeys.clubPages })
  }

  function useTracked<V, D>(t: Tracked<V, D>) {
    const mutation = useMutation<D, unknown, V, { toastId?: string | number }>({
      mutationFn: t.mutationFn,
      // One club change at a time, in the order they were made.
      scope: { id: `club-${clubId}` },
      onMutate: (vars) => ({ toastId: notifyProgress(t.progress(vars)) }),
      onSuccess: (data, vars, ctx) => {
        notifyDone(t.done(data, vars), { id: ctx?.toastId })
        if (t.scope === 'page') setFailure(null)
        return t.onSuccess?.(data, vars)
      },
      onError: (error, vars, ctx) => {
        dismissProgress(ctx?.toastId)
        if (t.scope === 'page') setFailure({ action: t.action(vars), error, retry: () => mutation.mutate(vars) })
      },
    })
    return mutation
  }

  const actions = {
    saveInfo: useTracked({
      scope: 'dialog',
      mutationFn: (info: ClubInfoInput) => api<ClubView>('PUT', clubPath(clubId), { body: info }),
      action: () => 'save the club info',
      progress: () => 'Saving club info…',
      done: () => 'Club info saved',
      onSuccess: setClub,
    }),
    uploadImage: useTracked({
      scope: 'page',
      mutationFn: ({ kind, file }: { kind: ClubImageKind; file: File }) => api<ClubView>('PUT', clubPath(clubId, `/${kind}`), { form: imageForm(file) }),
      action: ({ kind }) => `upload the club ${photoLabel[kind]}`,
      progress: ({ kind }) => `Uploading the ${photoLabel[kind]}…`,
      done: (_v, { kind }) => `New ${photoLabel[kind]} saved`,
      onSuccess: setClub,
    }),
    removeImage: useTracked({
      scope: 'page',
      mutationFn: (kind: ClubImageKind) => api<ClubView>('DELETE', clubPath(clubId, `/${kind}`)),
      action: (kind) => `remove the club ${photoLabel[kind]}`,
      progress: (kind) => `Removing the ${photoLabel[kind]}…`,
      done: (_v, kind) => `${photoLabel[kind][0]!.toUpperCase()}${photoLabel[kind].slice(1)} removed`,
      onSuccess: setClub,
    }),
    alignImage: useTracked({
      scope: 'dialog',
      mutationFn: ({ kind, position }: { kind: ClubImageKind; position: PhotoPosition }) =>
        api<ClubView>('PUT', clubPath(clubId, `/${kind}/position`), { body: position }),
      action: ({ kind }) => `align the ${photoLabel[kind]}`,
      progress: ({ kind }) => `Saving the ${photoLabel[kind]} position…`,
      done: (_v, { kind }) => `${photoLabel[kind][0]!.toUpperCase()}${photoLabel[kind].slice(1)} aligned`,
      onSuccess: setClub,
    }),
    saveTheme: useTracked({
      scope: 'dialog',
      mutationFn: (theme: ClubThemeInput) => api<ClubView>('PUT', clubPath(clubId, '/theme'), { body: theme }),
      action: () => 'save the club colours',
      progress: () => 'Saving the club colours…',
      done: (_v, theme) => (theme.accent || theme.sidebar || theme.page ? 'Club colours saved' : "Back to Matchpoynt's colours"),
      onSuccess: setClub,
    }),
    saveThemeAs: useTracked({
      scope: 'dialog',
      mutationFn: (theme: SavedThemeInput) => api<ClubView>('POST', clubPath(clubId, '/themes'), { body: theme }),
      action: (t) => `save the theme ${t.name.trim() || ''}`.trim(),
      progress: (t) => `Saving the theme ${t.name.trim()}…`,
      done: (_v, t) => `Theme saved: ${t.name.trim()}`,
      onSuccess: setClub,
    }),
    deleteSavedTheme: useTracked({
      scope: 'dialog',
      mutationFn: ({ id }: { id: string; name: string }) => api<ClubView>('DELETE', clubPath(clubId, `/themes/${id}`)),
      action: ({ name }) => `delete the theme ${name}`,
      progress: ({ name }) => `Deleting the theme ${name}…`,
      done: (_v, { name }) => `Theme deleted: ${name}`,
      onSuccess: setClub,
    }),
    saveSocial: useTracked({
      scope: 'dialog',
      mutationFn: (links: SocialLink[]) => api<ClubView>('PUT', clubPath(clubId, '/social'), { body: { links } }),
      action: () => "save the club's links",
      progress: () => "Saving the club's links…",
      done: (_v, links) => (links.length ? `Links saved: ${links.length}` : 'Links removed'),
      onSuccess: setClub,
    }),
    saveJoining: useTracked({
      scope: 'dialog',
      mutationFn: (joining: ClubJoiningInput) => api<ClubView>('PUT', clubPath(clubId, '/joining'), { body: joining }),
      action: () => 'save how people join',
      progress: () => 'Saving how people join…',
      done: (_v, joining) => (joining.approval === 'auto' ? 'People who ask now join at once' : 'You now approve each request to join'),
      onSuccess: setClub,
    }),
    decideJoinRequest: useTracked({
      scope: 'page',
      mutationFn: ({ id, approve }: { id: string; name: string; approve: boolean }) => api<ClubView>('POST', clubPath(clubId, `/requests/${id}`), { body: { approve } }),
      action: ({ name, approve }) => `${approve ? 'approve' : 'decline'} ${name}'s request`,
      progress: ({ name, approve }) => `${approve ? 'Approving' : 'Declining'} ${name}…`,
      done: (_v, { name, approve }) => (approve ? `${name} joined the club` : `${name}'s request declined`),
      onSuccess: setClub,
    }),
    decideSessionRequest: useTracked({
      scope: 'page',
      mutationFn: ({ id, approve }: { id: string; name: string; session: string; approve: boolean }) => api<ClubView>('POST', clubPath(clubId, `/session-requests/${id}`), { body: { approve } }),
      action: ({ name, approve }) => `${approve ? 'add' : 'decline'} ${name}`,
      progress: ({ name, session, approve }) => (approve ? `Adding ${name} to ${session}…` : `Declining ${name}…`),
      done: (_v, { name, session, approve }) => (approve ? `${name} is in ${session}` : `${name}'s request declined`),
      onSuccess: setClub,
    }),
    addPaymentQr: useTracked({
      scope: 'dialog',
      mutationFn: ({ label, file, position }: { label: string; file: File; position: PhotoPosition }) => {
        const form = imageForm(file)
        form.append('label', label)
        form.append('position', JSON.stringify(position))
        return api<ClubView>('POST', clubPath(clubId, '/payment-qrs'), { form })
      },
      action: ({ label }) => `add the ${label.trim() || 'payment'} QR code`,
      progress: () => 'Uploading the QR code…',
      done: (_v, { label }) => `${label.trim()} QR code added`,
      onSuccess: setClub,
    }),
    alignPaymentQr: useTracked({
      scope: 'dialog',
      mutationFn: ({ id, position }: { id: string; label: string; position: PhotoPosition }) => api<ClubView>('PUT', clubPath(clubId, `/payment-qrs/${encodeURIComponent(id)}/position`), { body: position }),
      action: ({ label }) => `frame the ${label} QR code`,
      progress: () => 'Saving the framing…',
      done: (_v, { label }) => `${label} QR code framed`,
      onSuccess: setClub,
    }),
    removePaymentQr: useTracked({
      scope: 'dialog',
      mutationFn: ({ id }: { id: string; label: string }) => api<ClubView>('DELETE', clubPath(clubId, `/payment-qrs/${encodeURIComponent(id)}`)),
      action: ({ label }) => `remove the ${label} QR code`,
      progress: () => 'Removing the QR code…',
      done: (_v, { label }) => `${label} QR code removed`,
      onSuccess: setClub,
    }),
    saveFee: useTracked({
      scope: 'dialog',
      mutationFn: (fee: FeeScheme | null) => api<ClubView>('PUT', clubPath(clubId, '/fee'), { body: { fee } }),
      action: () => "save the club's fee",
      progress: () => "Saving the club's fee…",
      done: (view) => (view.club.feeSummary ? `Club fee saved: ${view.club.feeSummary}` : 'Club fee removed'),
      onSuccess: setClub,
    }),
    deleteClub: useTracked({
      scope: 'page',
      mutationFn: () => api<void>('DELETE', clubPath(clubId)),
      action: () => 'delete the club',
      progress: () => 'Deleting the club…',
      done: () => 'Club deleted',
      onSuccess: () => {
        client.removeQueries({ queryKey: queryKeys.club(clubId) })
        void client.invalidateQueries({ queryKey: queryKeys.clubs, exact: true })
        void client.invalidateQueries({ queryKey: queryKeys.clubPages })
      },
    }),
    addMember: useTracked({
      scope: 'dialog',
      mutationFn: (member: ClubMemberInput) => api<ClubView>('POST', clubPath(clubId, '/members'), { body: member }),
      action: (m) => `add ${m.name.trim() || 'the member'}`,
      progress: (m) => `Adding ${m.name.trim() || 'the member'}…`,
      done: (_v, m) => `${m.name.trim()} joined the club`,
      onSuccess: setClub,
    }),
    updateMember: useTracked({
      scope: 'dialog',
      mutationFn: ({ id, member }: { id: string; member: ClubMemberInput }) => api<ClubView>('PUT', clubPath(clubId, `/members/${id}`), { body: member }),
      action: ({ member }) => `save ${member.name.trim() || 'the member'}`,
      progress: ({ member }) => `Saving ${member.name.trim() || 'the member'}…`,
      done: (_v, { member }) => `${member.name.trim()} saved`,
      onSuccess: setClub,
    }),
    sendInvite: useTracked({
      scope: 'dialog',
      mutationFn: ({ memberId, email }: { memberId: string; name: string; email: string }) =>
        api<ClubView>('POST', clubPath(clubId, `/members/${memberId}/invite`), { body: { email } }),
      action: ({ name }) => `invite ${name}`,
      progress: ({ name }) => `Sending ${name}'s invite…`,
      done: (_v, { name, email }) => `Invite sent to ${email} for ${name}`,
      onSuccess: setClub,
    }),
    cancelInvite: useTracked({
      scope: 'page',
      mutationFn: ({ memberId }: { memberId: string; name: string }) => api<ClubView>('DELETE', clubPath(clubId, `/members/${memberId}/invite`)),
      action: ({ name }) => `cancel ${name}'s invite`,
      progress: ({ name }) => `Cancelling ${name}'s invite…`,
      done: (_v, { name }) => `${name}'s invite cancelled`,
      onSuccess: setClub,
    }),
    removeMember: useTracked({
      scope: 'page',
      mutationFn: ({ id }: { id: string; name: string }) => api<ClubView>('DELETE', clubPath(clubId, `/members/${id}`)),
      action: ({ name }) => `remove ${name}`,
      progress: ({ name }) => `Removing ${name}…`,
      done: (_v, { name }) => `${name} left the club`,
      onSuccess: setClub,
    }),
    createPlan: useTracked({
      scope: 'dialog',
      mutationFn: (plan: PlannedSessionInput) => api<ClubView>('POST', clubPath(clubId, '/plans'), { body: plan }),
      action: () => 'save the planned session',
      progress: (p) => `Planning ${p.title.trim() || 'the session'}…`,
      done: (_v, p) => `${p.title.trim()} planned: ${planSummary(p)}`,
      onSuccess: setClub,
    }),
    updatePlan: useTracked({
      scope: 'dialog',
      mutationFn: ({ id, plan }: { id: string; plan: PlannedSessionInput }) => api<ClubView>('PUT', clubPath(clubId, `/plans/${id}`), { body: plan }),
      action: () => 'save the planned session',
      progress: ({ plan }) => `Saving ${plan.title.trim() || 'the session'}…`,
      done: (_v, { plan }) => `${plan.title.trim()} saved: ${planSummary(plan)}`,
      onSuccess: setClub,
    }),
    deletePlan: useTracked({
      scope: 'page',
      mutationFn: (plan: PlannedSessionView) => api<ClubView>('DELETE', clubPath(clubId, `/plans/${plan.id}`)),
      action: (p) => `delete ${p.title}`,
      progress: (p) => `Deleting ${p.title}…`,
      done: (_v, p) => `${p.title} deleted`,
      onSuccess: setClub,
    }),
    uploadPlanCover: useTracked({
      scope: 'page',
      mutationFn: ({ plan, file }: { plan: PlannedSessionView; file: File }) =>
        api<ClubView>('PUT', clubPath(clubId, `/plans/${plan.id}/cover`), { form: imageForm(file) }),
      action: ({ plan }) => `upload a cover photo for ${plan.title}`,
      progress: ({ plan }) => `Uploading a cover photo for ${plan.title}…`,
      done: (_v, { plan }) => `${plan.title} has a new cover photo`,
      onSuccess: setClub,
    }),
    removePlanCover: useTracked({
      scope: 'page',
      mutationFn: (plan: PlannedSessionView) => api<ClubView>('DELETE', clubPath(clubId, `/plans/${plan.id}/cover`)),
      action: (p) => `remove the cover photo from ${p.title}`,
      progress: (p) => `Removing the cover photo from ${p.title}…`,
      done: (_v, p) => `Cover photo removed from ${p.title}`,
      onSuccess: setClub,
    }),
    // Club badges. Saving a badge and setting its icon are separate requests, so the
    // dialog can retry just the icon if that part fails (see ClubBadgeDialog).
    saveBadge: useTracked({
      scope: 'dialog',
      mutationFn: ({ badgeId, badge }: { badgeId: string | null; badge: ClubBadgeInput }) =>
        badgeId ? api<ClubView>('PUT', clubPath(clubId, `/badges/${badgeId}`), { body: badge }) : api<ClubView>('POST', clubPath(clubId, '/badges'), { body: badge }),
      action: ({ badge }) => `save the ${badge.name.trim() || 'new'} badge`,
      progress: ({ badge }) => `Saving the ${badge.name.trim() || 'new'} badge…`,
      done: (_v, { badge }) => `${badge.name.trim()} badge saved`,
      onSuccess: setClub,
    }),
    setBadgeIcon: useTracked({
      scope: 'dialog',
      mutationFn: ({ badgeId, icon }: { badgeId: string; name: string; icon: BadgeIconChoice }) =>
        icon.kind === 'upload'
          ? api<ClubView>('PUT', clubPath(clubId, `/badges/${badgeId}/icon`), { form: imageForm(icon.file) })
          : icon.kind === 'gif'
            ? api<ClubView>('POST', clubPath(clubId, `/badges/${badgeId}/icon/gif`), { body: { gifId: icon.gif.id } })
            : api<ClubView>('DELETE', clubPath(clubId, `/badges/${badgeId}/icon`)),
      action: ({ name, icon }) => (icon.kind === 'remove' ? `remove the ${name} badge icon` : `set the ${name} badge icon`),
      progress: ({ icon }) => (icon.kind === 'gif' ? 'Fetching the GIF…' : icon.kind === 'upload' ? 'Uploading the icon…' : 'Removing the icon…'),
      done: (_v, { name, icon }) => (icon.kind === 'remove' ? `${name} icon removed` : `${name} icon saved`),
      onSuccess: setClub,
    }),
    deleteBadge: useTracked({
      scope: 'page',
      mutationFn: ({ badgeId }: { badgeId: string; name: string }) => api<ClubView>('DELETE', clubPath(clubId, `/badges/${badgeId}`)),
      action: ({ name }) => `delete the ${name} badge`,
      progress: ({ name }) => `Deleting the ${name} badge…`,
      done: (_v, { name }) => `${name} badge deleted`,
      onSuccess: setClub,
    }),
    startPlan: useTracked({
      scope: 'page',
      mutationFn: (plan: PlannedSessionView) => api<SessionView>('POST', clubPath(clubId, `/plans/${plan.id}/start`)),
      action: (p) => `start ${p.title}`,
      progress: (p) => `Starting ${p.title}…`,
      done: (s, p) => `${p.title} started: ${s.courts.length} courts, ${s.players.length} players`,
      onSuccess: async (session) => {
        client.setQueryData(queryKeys.session(session.id), session)
        void client.invalidateQueries({ queryKey: queryKeys.club(clubId) })
        // The board lists it as running before opening it.
        await client.invalidateQueries({ queryKey: queryKeys.activeSessions })
        onSessionStarted?.(session)
      },
    }),
  }

  return { ...actions, failure, clearFailure: () => setFailure(null) }
}

/**
 * The club's sessions past the first page the club view brings: older ones,
 * a page at a time, from where that page ended.
 */
export function useOlderClubSessions(clubId: string, startBefore: string | null) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.clubSessions(clubId), startBefore],
    queryFn: ({ signal, pageParam }) => api<ClubSessionsResponse>('GET', clubPath(clubId, `/sessions?${new URLSearchParams({ before: pageParam! })}`), { signal }),
    initialPageParam: startBefore,
    getNextPageParam: (last) => last.nextBefore,
    enabled: false,
  })
}
