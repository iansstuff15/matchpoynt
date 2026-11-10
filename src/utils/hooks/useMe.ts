import type { MeResponse } from '@matchpoynt/shared'
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

export function useEmailSignIn() {
  return useMutation({
    mutationFn: (input: { email: string; next?: string }) => api<void>('POST', '/auth/email', { body: input }),
  })
}
