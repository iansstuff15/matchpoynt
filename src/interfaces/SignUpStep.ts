import type { SignUpStepId } from '@matchpoynt/shared'
import type { LucideIcon } from 'lucide-react'

export interface SignUpStep {
  id: SignUpStepId
  label: string
  description: string
  icon: LucideIcon
}
