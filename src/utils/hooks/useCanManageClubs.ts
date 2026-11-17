import { useAppMode } from '@/utils/hooks/useAppMode'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMe } from '@/utils/hooks/useMe'

/**
 * Whether the club manager (creating clubs, their pages, settings and money)
 * is for this person, as the API decides it (`canManageClubs` on `me`):
 * player-only accounts join clubs but don't run them. Guests (sign-in off)
 * run their own clubs. Unknown while `me` loads, so it counts as no.
 */
export function useCanManageClubs(): boolean {
  const { web } = useFeatures()
  const me = useMe()
  const { mode } = useAppMode()
  if (!web.clubs) return false
  if (!web.signIn) return true
  // A "both" account playing this time sees the player's app.
  return (me.data?.user?.canManageClubs ?? false) && mode === 'host'
}
