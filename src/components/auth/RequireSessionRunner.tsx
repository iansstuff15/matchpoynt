import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAppHome, useCanRunSessions } from '@/utils/hooks/useCanRunSessions'

/**
 * The session board's pages (`/app` and under it) are for accounts that run
 * sessions. Player-only accounts are sent to their own home in the app
 * (Playing now, or Find clubs). The API refuses them the same data.
 */
export default function RequireSessionRunner({ children }: { children: ReactNode }) {
  const canRunSessions = useCanRunSessions()
  const home = useAppHome()
  if (!canRunSessions) return <Navigate to={home} replace />
  return children
}
