import type { ClubView, EndedSessionView, SessionView } from '@matchpoynt/shared'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useLocation, useMatch, useSearchParams } from 'react-router'
import { clubTabs } from '@/config/club'
import { sports } from '@/config/sports'
import type { Crumb } from '@/interfaces/Crumb'
import type { ClubTab } from '@/types/club'
import { queryKeys } from '@/utils/api/queryClient'
import { clubPageHref } from '@/utils/hooks/useSelectedClub'

const tabLabels: Record<ClubTab, string> = { sessions: 'Sessions', members: 'Members', badges: 'Badges', info: 'Club info' }

/** A query's state as the page loaded it, without ever fetching it here. */
const useCached = <T,>(queryKey: readonly unknown[]) => useQuery<T>({ queryKey, queryFn: skipToken })

/**
 * The trail to the page on screen, from what the page has already loaded:
 * "Session board / Past sessions", "Clubs / Westside Smashers / Members".
 * A crumb's label is `null` while its name is still loading, and generic when it can't be loaded.
 */
export function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const sessionMatch = useMatch('/app/:sessionId')
  const clubMatch = useMatch('/clubs/:clubId')
  const sessionId = sessionMatch?.params.sessionId ?? ''
  const clubId = clubMatch?.params.clubId ?? ''
  const runningQuery = useCached<SessionView>(queryKeys.session(sessionId))
  const endedQuery = useCached<EndedSessionView>(queryKeys.endedSession(sessionId))
  const clubQuery = useCached<ClubView>(queryKeys.club(clubId))
  const running = runningQuery.data
  const ended = endedQuery.data
  const club = clubQuery.data

  const board = { label: 'Session board', href: '/app' }
  const past = { label: 'Past sessions', href: '/app/past' }
  if (pathname === '/app') return [{ label: board.label }]
  if (pathname === '/app/past') return [board, { label: past.label }]
  if (sessionMatch) {
    const session = running ?? ended
    // A session that couldn't be loaded (deleted, or someone else's) is just "Session", not a name forever loading.
    const label = session ? (session.title ?? `${sports[session.sportId].name} session`) : runningQuery.isError || endedQuery.isError ? 'Session' : null
    return [ended && !running ? past : board, { label }]
  }
  if (pathname === '/clubs') return [{ label: 'Clubs' }]
  if (clubMatch) {
    const tab = clubTabs.find((t) => t === params.get('tab')) ?? clubTabs[0]
    return [{ label: 'Clubs', href: '/clubs' }, { label: club?.club.name ?? (clubQuery.isError ? 'Club' : null), href: clubPageHref(clubId) }, { label: tabLabels[tab] }]
  }
  if (pathname === '/rankings') return [{ label: 'Rankings' }]
  return []
}
