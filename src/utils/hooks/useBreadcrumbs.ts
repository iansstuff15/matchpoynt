import type { ClubView, PlayerClubPageView, PlayerSessionResponse, EndedSessionView, SessionView } from '@matchpoynt/shared'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useLocation, useMatch } from 'react-router'
import { clubPageLabels } from '@/config/club'
import { sports } from '@/config/sports'
import type { Crumb } from '@/interfaces/Crumb'
import type { ClubPage } from '@/types/club'
import { queryKeys } from '@/utils/api/queryClient'
import { clubPageHref } from '@/utils/hooks/useSelectedClub'


/** A query's state as the page loaded it, without ever fetching it here. */
const useCached = <T,>(queryKey: readonly unknown[]) => useQuery<T>({ queryKey, queryFn: skipToken })

/**
 * The trail to the page on screen, from what the page has already loaded:
 * "Session board / Tuesday night", "Clubs / Westside Smashers / Members".
 * A crumb's label is `null` while its name is still loading, and generic when it can't be loaded.
 */
export function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation()
  const sessionMatch = useMatch('/app/:sessionId')
  const clubMatch = useMatch('/clubs/:clubId/*')
  const playerMatch = useMatch('/c/:handle')
  const playMatch = useMatch('/play/:sessionId')
  const personMatch = useMatch('/u/:username')
  const playQuery = useCached<PlayerSessionResponse>(queryKeys.playSession(playMatch?.params.sessionId ?? ''))
  const playerQuery = useCached<PlayerClubPageView>(queryKeys.playerClub(playerMatch?.params.handle ?? ''))
  const sessionId = sessionMatch?.params.sessionId ?? ''
  const clubId = clubMatch?.params.clubId ?? ''
  const runningQuery = useCached<SessionView>(queryKeys.session(sessionId))
  const endedQuery = useCached<EndedSessionView>(queryKeys.endedSession(sessionId))
  const clubQuery = useCached<ClubView>(queryKeys.club(clubId))
  const running = runningQuery.data
  const ended = endedQuery.data
  const club = clubQuery.data

  const board = { label: 'Session board', href: '/app' }
  if (pathname === '/app') return [{ label: board.label }]
  if (sessionMatch) {
    const session = running ?? ended
    // A session that couldn't be loaded (deleted, or someone else's) is just "Session", not a name forever loading.
    const label = session ? (session.title ?? `${sports[session.sportId].name} session`) : runningQuery.isError || endedQuery.isError ? 'Session' : null
    return [board, { label }]
  }
  if (pathname === '/clubs') return [{ label: 'Clubs' }]
  if (clubMatch) {
    // An invoice's or an expense's own page sits under its list: "Clubs / <club> / Invoices / Invoice".
    const [section = 'dashboard', ...rest] = (clubMatch.params['*'] || 'dashboard').split('/')
    const page = section as ClubPage
    const name = club?.club.name ?? (clubQuery.isError ? 'Club' : null)
    if (rest.length && (page === 'invoices' || page === 'expenses')) {
      return [{ label: 'Clubs', href: '/clubs' }, { label: name, href: clubPageHref(clubId) }, { label: clubPageLabels[page], href: clubPageHref(clubId, page) }, { label: page === 'invoices' ? 'Invoice' : 'Expense' }]
    }
    // The dashboard is the club itself: "Clubs / Westside Smashers"; its pages add their name.
    if (page === 'dashboard') return [{ label: 'Clubs', href: '/clubs' }, { label: name }]
    return [{ label: 'Clubs', href: '/clubs' }, { label: name, href: clubPageHref(clubId) }, { label: clubPageLabels[page] ?? 'Page' }]
  }
  if (pathname === '/choose-club') return [{ label: 'Your clubs' }]
  if (playerMatch) return [{ label: 'Your clubs', href: '/choose-club' }, { label: playerQuery.data?.club.name ?? (playerQuery.isError ? 'Club' : null) }]
  if (pathname === '/rankings') return [{ label: 'Rankings' }]
  if (pathname === '/profile') return [{ label: 'Your profile' }]
  if (pathname === '/record') return [{ label: 'Your record' }]
  const recordPage = { '/record/games': 'Match history', '/record/sessions': 'Sessions', '/record/badges': 'Badges', '/record/rivals': 'Rivals' }[pathname]
  if (recordPage) return [{ label: 'Your record', href: '/record' }, { label: recordPage }]
  if (pathname === '/friends') return [{ label: 'Friends' }]
  // Someone's profile sits under Friends, where people are found.
  if (personMatch) return [{ label: 'Friends', href: '/friends' }, { label: `@${(personMatch.params.username ?? '').toLowerCase()}` }]
  if (pathname === '/play') return [{ label: 'Playing now' }]
  if (playMatch) return [{ label: 'Playing now', href: '/play' }, { label: playQuery.data?.title ?? (playQuery.isError ? 'Session' : null) }]
  return []
}
