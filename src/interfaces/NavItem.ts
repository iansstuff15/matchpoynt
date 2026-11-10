import type { Features } from '@matchpoynt/shared'
import type { LucideIcon } from 'lucide-react'
import type { ClubTab } from '@/types/club'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Accessible, search-friendly description of the destination. */
  description: string
  /** Hidden when this web feature is switched off. */
  feature?: keyof Features['web']
}

/** An app sidebar link. With `clubTab` it opens that tab of the club picked in the sidebar (`href` when none is). */
export interface AppNavItem extends NavItem {
  clubTab?: ClubTab
  /** Highlighted only on `href` itself, not on the pages under it. */
  end?: boolean
}

/** A labelled section of the app sidebar. */
export interface AppNavGroup {
  label: string
  icon: LucideIcon
  items: AppNavItem[]
  /** Labelled with the selected club's name once one is picked. */
  namedByClub?: boolean
  /** Hidden when this web feature is switched off. */
  feature?: keyof Features['web']
}
