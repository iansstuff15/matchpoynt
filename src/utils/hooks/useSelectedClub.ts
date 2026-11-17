import type { ClubSummary } from '@matchpoynt/shared'
import { useMatch } from 'react-router'
import type { ClubPage } from '@/types/club'
import { useCanManageClubs } from '@/utils/hooks/useCanManageClubs'
import { useClubs } from '@/utils/hooks/useClubs'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMe } from '@/utils/hooks/useMe'
import { recall } from '@/utils/platform/remember'

/**
 * The club picked in the sidebar: the one on screen, else the one opened
 * last, if it's still one of the account's clubs. Only for whoever runs the
 * board (signed in, or a guest with sign-in off) while clubs are on.
 */
export function useSelectedClub() {
  const { web } = useFeatures()
  const me = useMe()
  const signedIn = web.signIn ? Boolean(me.data?.user) : true
  const clubMatch = useMatch('/clubs/:clubId/*')
  // Player-only accounts run no clubs, so nothing is asked for.
  const canManageClubs = useCanManageClubs()
  const clubs = useClubs(signedIn && canManageClubs)
  const currentId = clubMatch?.params.clubId ?? recall('club')
  const club: ClubSummary | null = clubs.data?.find((c) => c.id === currentId) ?? null
  return { signedIn, clubs, currentId, club }
}

/** Link to one of a club's pages; its dashboard by default. */
/** Where one of a club's invoices has its page: a manual invoice, or a session's invoices. */
export const invoiceHref = (clubId: string, group: { kind: 'manual' | 'session'; id: string }) => `/clubs/${clubId}/invoices/${group.kind}/${group.id}`

export function clubPageHref(clubId: string, page: ClubPage = 'dashboard'): string {
  return page === 'dashboard' ? `/clubs/${clubId}` : `/clubs/${clubId}/${page}`
}
