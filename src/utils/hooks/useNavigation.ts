import type { Features } from '@matchpoynt/shared'
import type { NavItem } from '@/interfaces/NavItem'
import { useCanManageClubs } from '@/utils/hooks/useCanManageClubs'
import { useCanRunSessions } from '@/utils/hooks/useCanRunSessions'
import { useFeatures } from '@/utils/hooks/useFeatures'

/** Whether every web feature a navigation item needs is on. */
export const navFeatureOn = (web: Features['web'], feature: NavItem['feature']) => !feature || [feature].flat().every((f) => web[f])

/** Navigation without items whose feature is switched off, or that manage clubs or run sessions for an account that can't. */
export function useNavigation<T extends NavItem>(items: T[]): T[] {
  const { web } = useFeatures()
  const canManageClubs = useCanManageClubs()
  const canRunSessions = useCanRunSessions()
  return items.filter((item) => navFeatureOn(web, item.feature) && (!item.clubManager || canManageClubs) && (!item.sessionRunner || canRunSessions))
}
