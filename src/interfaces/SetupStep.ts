import type { LucideIcon } from 'lucide-react'
import type { SetupStepId } from '@matchpoynt/shared'

export interface SetupStep {
  id: SetupStepId
  label: string
  description: string
  icon: LucideIcon
}
