import { useAppMode } from '@/utils/hooks/useAppMode'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { usePlayerClub } from '@/utils/hooks/usePlayerClub'
import { useMe } from '@/utils/hooks/useMe'

/**
 * Whether the session board (and its history and invoices) is for this
 * person, as the API decides it (`canRunSessions` on `me`): player-only
 * accounts follow sessions from Playing now instead. Guests (sign-in off) run
 * the board. While `me` loads it counts as yes, so a Queue Master's board
 * isn't sent away; the API refuses players either way.
 */
export function useCanRunSessions(): boolean {
  const { web } = useFeatures()
  const me = useMe()
  const { mode } = useAppMode()
  if (!web.signIn) return true
  // A "both" account playing this time sees the player's app.
  return (me.data?.user?.canRunSessions ?? true) && mode === 'host'
}

/**
 * Where "home" is in the app for this person: the session board for those who
 * run sessions; for players, the club picker until they've picked a club, then
 * Playing now; without the directory, their profile.
 */
export function useAppHome(): string {
  const { web } = useFeatures()
  const runs = useCanRunSessions()
  const { club } = usePlayerClub()
  if (runs) return '/app'
  if (web.clubs && web.clubDirectory && (!club || !web.playerView)) return '/choose-club'
  if (web.clubs && web.clubDirectory && web.playerView) return '/play'
  return '/profile'
}
