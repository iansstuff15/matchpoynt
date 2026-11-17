import { useSyncExternalStore } from 'react'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMe } from '@/utils/hooks/useMe'
import { recall, remember } from '@/utils/platform/remember'

/**
 * How the app is being used: as a **player** (a club picked to play with,
 * Playing now, your record) or as a **host** (the session board and the club
 * manager). Player-only accounts are players and Queue Masters hosts; "both"
 * accounts choose on the start page each time they sign in, remembered in this
 * browser. Only what's shown changes: what anyone may do is the API's call.
 */
export type AppMode = 'player' | 'host'

const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const stored = (): AppMode | null => {
  const value = recall('mode')
  return value === 'player' || value === 'host' ? value : null
}

/** Remembers how a "both" account is using the app, and tells every hook reading it. */
export function chooseAppMode(mode: AppMode): void {
  remember('mode', mode)
  listeners.forEach((l) => l())
}

export function useAppMode(): { mode: AppMode; both: boolean } {
  const { web } = useFeatures()
  const me = useMe()
  const chosen = useSyncExternalStore(subscribe, stored, () => null)
  // Guests (sign-in off) run their own board and clubs.
  if (!web.signIn) return { mode: 'host', both: false }
  const role = me.data?.user?.role
  if (role === 'player') return { mode: 'player', both: false }
  if (role === 'both') return { mode: chosen ?? 'host', both: true }
  return { mode: 'host', both: false }
}
