import type { SportRules } from '@matchpoynt/shared'
import type { LucideIcon } from 'lucide-react'

/** Sport rules from the shared package plus what the web app needs to show them. */
export interface Sport extends SportRules {
  icon: LucideIcon
}
