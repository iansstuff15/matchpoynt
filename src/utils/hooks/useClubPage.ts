import type { ClubView } from '@matchpoynt/shared'
import { useOutletContext } from 'react-router'
import type { ClubSettingsGroup } from '@/types/club'
import type { useClubActions } from '@/utils/hooks/useClubs'

/** What a club's layout hands each of its pages: the loaded club, its actions, and a way to open its settings. */
export interface ClubPageContext {
  view: ClubView
  actions: ReturnType<typeof useClubActions>
  openSettings: (group?: ClubSettingsGroup) => void
}

/** The club the page is under (`/clubs/<id>/…`), loaded by `ClubLayout`. */
export const useClubPage = () => useOutletContext<ClubPageContext>()
