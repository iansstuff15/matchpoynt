import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useCanManageClubs } from '@/utils/hooks/useCanManageClubs'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMe } from '@/utils/hooks/useMe'

/**
 * The club manager's pages are for accounts that run clubs. Player-only
 * accounts are sent to Find clubs (or the board while the directory is off).
 * The API refuses them the same pages; this just doesn't show them.
 */
export default function RequireClubManager({ children }: { children: ReactNode }) {
  const { web } = useFeatures()
  const me = useMe()
  const canManageClubs = useCanManageClubs()
  // Wait for `me` so a manager reloading a club page isn't sent away while it loads.
  if (web.signIn && me.isPending) return children
  if (!canManageClubs) return <Navigate to={web.signIn && web.clubDirectory ? '/choose-club' : '/app'} replace />
  return children
}
