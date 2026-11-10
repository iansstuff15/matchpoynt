import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMe } from '@/utils/hooks/useMe'

/**
 * Sends signed-in people with an unfinished profile to the profile form first.
 * The API enforces the same rule; this just gets them there without an error.
 */
export default function RequireCompleteProfile({ children }: { children: ReactNode }) {
  const { web } = useFeatures()
  const me = useMe()
  if (web.signIn && me.data?.user && !me.data.user.profileComplete) return <Navigate to="/complete-profile" replace />
  return children
}
