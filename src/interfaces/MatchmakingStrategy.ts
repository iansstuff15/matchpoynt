import type { MatchmakingStrategyId } from '@matchpoynt/shared'
import type { LucideIcon } from 'lucide-react'

export interface MatchmakingStrategy {
  id: MatchmakingStrategyId
  label: string
  description: string
  icon: LucideIcon
}
