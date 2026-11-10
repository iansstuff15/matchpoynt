import { defaultSportId, sportRules, type SportId } from '@matchpoynt/shared'
import { CircleDot, Disc3, Feather, LandPlot, Target, Volleyball, type LucideIcon } from 'lucide-react'
import type { Sport } from '@/interfaces/Sport'

// Rules come from @matchpoynt/shared (the API validates against them). This file only adds icons.
const icons: Record<SportId, LucideIcon> = {
  badminton: Feather,
  pickleball: Target,
  tennis: CircleDot,
  padel: LandPlot,
  'table-tennis': Disc3,
  volleyball: Volleyball,
}

export const sports = Object.fromEntries(
  Object.values(sportRules).map((rules) => [rules.id, { ...rules, icon: icons[rules.id] }]),
) as Record<SportId, Sport>

export const sportList: Sport[] = Object.values(sports)

export { defaultSportId }
