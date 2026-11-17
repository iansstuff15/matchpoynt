import type { AccountLookupResponse, MeResponse } from '@matchpoynt/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { useFeatures } from '@/utils/hooks/useFeatures'

/** The signed-in user, as the API reports it. Never asked while sign-in is switched off. */
export function useMe() {
  const signInOn = useFeatures().web.signIn
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => api<MeResponse>('GET', '/auth/me', { signal }),
    enabled: signInOn,
  })
}

export function useSignOut() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('POST', '/auth/signout'),
    onSuccess: () => client.clear(),
  })
}


/** Who an email belongs to (photo, name, @username), for the sign-in form's password step. `null` for an unknown email. */
export function useAccountLookup(email: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.accountLookup(email.trim().toLowerCase()),
    queryFn: async ({ signal }) => (await api<AccountLookupResponse>('POST', '/auth/lookup', { body: { email: email.trim() }, signal })).account,
    enabled: enabled && email.trim().length > 0,
    staleTime: 60_000,
    retry: false,
  })
}
