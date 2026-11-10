import type { ClubTheme, EndedSessionView, SessionView } from '@matchpoynt/shared'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useMatch } from 'react-router'
import { queryKeys } from '@/utils/api/queryClient'
import { useSelectedClub } from '@/utils/hooks/useSelectedClub'

/** Which theme tokens each club colour sets (the names `config/theme.ts` generates). */
const tokens: Record<Exclude<keyof ClubTheme, 'colors'>, string[]> = {
  accent: ['primary', 'ring', 'sidebar-primary', 'sidebar-ring'],
  accentForeground: ['primary-foreground', 'sidebar-primary-foreground'],
  sidebar: ['sidebar'],
  sidebarForeground: ['sidebar-foreground'],
  sidebarAccent: ['sidebar-accent'],
  sidebarAccentForeground: ['sidebar-accent-foreground'],
  sidebarBorder: ['sidebar-border'],
}

/** A query's data if it's already loaded, without ever fetching it. */
const useCached = <T,>(queryKey: readonly unknown[]) => useQuery<T>({ queryKey, queryFn: skipToken }).data

/**
 * The club whose colours the app shows: a session's own club on its page
 * (running or finished), the club on screen in the club manager, otherwise
 * the club picked in the sidebar. `null` for Matchpoynt's own colours.
 */
export function useActiveClubTheme(): ClubTheme | null {
  const sessionMatch = useMatch('/app/:sessionId')
  const clubMatch = useMatch('/clubs/:clubId')
  const sessionId = sessionMatch?.params.sessionId ?? ''
  const running = useCached<SessionView>(queryKeys.session(sessionId))
  const ended = useCached<EndedSessionView>(queryKeys.endedSession(sessionId))
  const { clubs, club: selected } = useSelectedClub()
  const sessionClub = sessionMatch ? (running?.clubId ?? ended?.clubId ?? null) : null
  const clubId = sessionClub ?? clubMatch?.params.clubId ?? selected?.id ?? null
  return clubs.data?.find((c) => c.id === clubId)?.theme ?? null
}

/**
 * Applies the active club's colours to the app while it's open, by setting
 * the theme's CSS variables on the page root (so dialogs and menus, which
 * render outside the shell, match). The API already picked readable text
 * colours; this only sets them, and puts Matchpoynt's back on the way out.
 */
export function useClubTheme() {
  const theme = useActiveClubTheme()
  useEffect(() => {
    if (!theme) return
    const root = document.documentElement.style
    const set: string[] = []
    for (const [key, names] of Object.entries(tokens) as [keyof typeof tokens, string[]][]) {
      const value = theme[key]
      if (!value) continue
      for (const name of names) {
        root.setProperty(`--${name}`, value)
        set.push(name)
      }
    }
    return () => set.forEach((name) => root.removeProperty(`--${name}`))
  }, [theme])
}
