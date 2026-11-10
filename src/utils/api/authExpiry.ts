import type { MeResponse } from '@matchpoynt/shared'
import type { QueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '@/utils/api/errors'

// When the API answers 401 to a signed-in request, the sign-in has expired.
// The `me` query is set to signed out, so RequireSignIn sends the person to
// sign in and back to the page they were on. Auth endpoints are left alone:
// a wrong password is also a 401.

let expired = false

export function handleExpiredSignIn(client: QueryClient, error: unknown, meKey: readonly unknown[]) {
  if (!(error instanceof ApiRequestError) || error.status !== 401 || error.path.startsWith('/api/auth/')) return
  const me = client.getQueryData<MeResponse>(meKey)
  if (me?.user) expired = true
  client.setQueryData<MeResponse>(meKey, { user: null })
}

/** Whether the person was signed out because their sign-in expired. Safe to read during render. */
export const signInExpired = () => expired

/** Called once they've signed in again. (Link and OAuth sign-ins reload the page, which resets it too.) */
export function clearExpiredSignIn() {
  expired = false
}
