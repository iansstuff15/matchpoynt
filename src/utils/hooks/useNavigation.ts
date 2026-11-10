import type { NavItem } from '@/interfaces/NavItem'
import { useFeatures } from '@/utils/hooks/useFeatures'

/** Navigation without items whose feature is switched off. */
export function useNavigation(items: NavItem[]): NavItem[] {
  const { web } = useFeatures()
  return items.filter((item) => !item.feature || web[item.feature])
}
