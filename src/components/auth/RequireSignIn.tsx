import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { signInExpired } from '@/utils/api/authExpiry'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMe } from '@/utils/hooks/useMe'

/**
 * Website app pages need a signed-in user while sign-in is on. Signed-out
 * visitors, including anyone whose sign-in just expired, go to the sign-in
 * page and come back here afterwards (the API checks the return page).
 * With sign-in off, the board runs in guest mode instead.
 */
export default function RequireSignIn({ children }: { children: ReactNode }) {
  const { web } = useFeatures()
  const me = useMe()
  const location = useLocation()
  if (web.signIn && me.isSuccess && !me.data.user) {
    const params = new URLSearchParams({ next: location.pathname })
    if (signInExpired()) params.set('reason', 'expired')
    return <Navigate to={`/sign-in?${params}`} replace />
  }
  return children
}
