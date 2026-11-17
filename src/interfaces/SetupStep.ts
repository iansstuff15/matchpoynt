import type { LucideIcon } from 'lucide-react'
import type { Features, SetupStepId } from '@matchpoynt/shared'

export interface SetupStep {
  id: SetupStepId
  label: string
  description: string
  icon: LucideIcon
  /** Left out while this web feature is switched off. */
  feature?: keyof Features['web']
}
