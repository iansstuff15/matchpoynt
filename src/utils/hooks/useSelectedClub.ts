import type { ClubSummary } from '@matchpoynt/shared'
import { useMatch } from 'react-router'
import { clubTabs } from '@/config/club'
import type { ClubTab } from '@/types/club'
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
  const clubMatch = useMatch('/clubs/:clubId')
  const clubs = useClubs(signedIn && web.clubs)
  const currentId = clubMatch?.params.clubId ?? recall('club')
  const club: ClubSummary | null = clubs.data?.find((c) => c.id === currentId) ?? null
  return { signedIn, clubs, currentId, club }
}

/** Link to one tab of a club's manager page. */
export function clubPageHref(clubId: string, tab: ClubTab = clubTabs[0]): string {
  return tab === clubTabs[0] ? `/clubs/${clubId}` : `/clubs/${clubId}?tab=${tab}`
}
