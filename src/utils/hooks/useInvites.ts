import type { AcceptInviteInput, AcceptInviteResponse, InviteView } from '@matchpoynt/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { notifyDone } from '@/utils/feedback/notify'

/** A club invite, as the person who opened its link sees it. */
export function useInvite(token: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.invite(token),
    queryFn: ({ signal }) => api<InviteView>('GET', `/invites/${encodeURIComponent(token)}`, { signal }),
    enabled,
  })
}

/** Accepts an invite; a new account sends its profile and password with it. */
export function useAcceptInvite(token: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: AcceptInviteInput) => api<AcceptInviteResponse>('POST', `/invites/${encodeURIComponent(token)}/accept`, { body: input }),
    onSuccess: (res) => {
      notifyDone(`You joined ${res.clubName}`, { description: 'Your account is linked to the club.' })
      // The profile may have just been completed: the guards read `me`.
      void client.invalidateQueries({ queryKey: queryKeys.me })
      void client.invalidateQueries({ queryKey: queryKeys.invite(token) })
    },
  })
}
