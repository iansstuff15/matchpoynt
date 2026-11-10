import type {
  CurrentUser,
  ForgotPasswordInput,
  MeResponse,
  PasswordSignInInput,
  ProfileInput,
  ProfileStatus,
  ResetPasswordInput,
  SignInResponse,
  SignUpInput,
  SignUpResponse,
} from '@matchpoynt/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clearExpiredSignIn } from '@/utils/api/authExpiry'
import { api } from '@/utils/api/client'
import { queryKeys } from '@/utils/api/queryClient'
import { notifyDone } from '@/utils/feedback/notify'
import { useFeatures } from '@/utils/hooks/useFeatures'

// Account actions. Everything is decided by the API: which fields are valid,
// whether a profile is complete, where a sign-in link lands.

export function usePasswordSignIn() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: PasswordSignInInput) => api<SignInResponse>('POST', '/auth/sign-in', { body: input }),
    onSuccess: (me) => {
      clearExpiredSignIn()
      client.setQueryData<MeResponse>(queryKeys.me, { user: me.user })
      notifyDone(me.user?.displayName ? `Welcome back, ${me.user.displayName}` : 'Signed in')
    },
  })
}

export function useSignUp() {
  return useMutation({
    mutationFn: (input: SignUpInput) => api<SignUpResponse>('POST', '/auth/sign-up', { body: input }),
    onSuccess: (res, input) =>
      notifyDone(res.confirmEmail ? 'Account created' : 'Account created and signed in', {
        description: res.confirmEmail ? `Confirm it from the email sent to ${input.email}.` : undefined,
      }),
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => api<void>('POST', '/auth/forgot-password', { body: input }),
    onSuccess: (_r, input) => notifyDone('Reset link sent', { description: `If ${input.email} has an account, the link is on its way.` }),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => api<void>('POST', '/auth/reset-password', { body: input }),
    onSuccess: () => notifyDone('Password changed', { description: 'Use it next time you sign in.' }),
  })
}

/** Sets or changes the password of the signed-in account (e.g. one that has only used email links). */
export function useSetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => api<void>('POST', '/auth/password', { body: input }),
    onSuccess: () => notifyDone('Password set', { description: 'You can now sign in with your email and this password.' }),
  })
}

/** The signed-in person's profile and what it is missing. */
export function useProfile(enabled = true) {
  const { web } = useFeatures()
  return useQuery({
    queryKey: ['profile'] as const,
    queryFn: ({ signal }) => api<ProfileStatus>('GET', '/profile', { signal }),
    enabled: enabled && web.signIn,
  })
}

export function useSaveProfile() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfileInput) => api<ProfileStatus>('PUT', '/profile', { body: input }),
    onSuccess: (status) => {
      client.setQueryData(['profile'], status)
      // Update the signed-in user in place: the profile guard reads it, and a
      // stale "incomplete" here would bounce between /app and /complete-profile.
      client.setQueryData<MeResponse>(queryKeys.me, (prev) =>
        prev?.user
          ? {
              user: {
                ...prev.user,
                profileComplete: status.complete,
                missing: status.missing,
                displayName: status.profile.displayName,
              } satisfies CurrentUser,
            }
          : prev,
      )
      notifyDone('Profile saved', { description: status.complete ? "You're all set." : undefined })
    },
  })
}
