import type { DirectoryClubView } from '@matchpoynt/shared'
import { useSyncExternalStore } from 'react'
import { useAppMode } from '@/utils/hooks/useAppMode'
import { useMyClubs } from '@/utils/hooks/useDirectory'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { forget, recall, remember } from '@/utils/platform/remember'

const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Remembers the club a player picked (or none), and tells every hook reading it. */
export function choosePlayerClub(clubId: string | null): void {
  if (clubId) remember('playerClub', clubId)
  else forget('playerClub')
  listeners.forEach((l) => l())
}

/**
 * The club a player picked on the club picker, from the clubs they're a
 * member of: the app wears its colours and its photo stands in for the logo.
 * `null` in host mode, before picking, or once they've left that club.
 */
export function usePlayerClub(): { club: DirectoryClubView | null; clubs: ReturnType<typeof useMyClubs> } {
  const { web } = useFeatures()
  const { mode } = useAppMode()
  const on = mode === 'player' && web.clubs && web.signIn && web.clubDirectory
  const clubs = useMyClubs(on)
  const id = useSyncExternalStore(subscribe, () => recall('playerClub'), () => null)
  const club = on && id ? (clubs.data?.find((c) => c.id === id) ?? null) : null
  return { club, clubs }
}
