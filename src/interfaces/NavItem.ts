import type { Features } from '@matchpoynt/shared'
import type { LucideIcon } from 'lucide-react'
import type { ClubPage } from '@/types/club'

export interface NavItem {
  label: string
  /** Shorter label for a bottom tab on phones, when `label` is too long to fit. */
  tabLabel?: string
  href: string
  /** Where its bottom tab opens, when that's more than `href` (e.g. a tab of the page); `href` still decides when it's the page on screen. */
  tabHref?: string
  icon: LucideIcon
  /** Accessible, search-friendly description of the destination. */
  description: string
  /** Hidden when this web feature (or any of these) is switched off. */
  feature?: keyof Features['web'] | (keyof Features['web'])[]
  /** Club management: hidden from player-only accounts (`useCanManageClubs`). */
  clubManager?: boolean
  /** The session board and its history: hidden from player-only accounts (`useCanRunSessions`). */
  sessionRunner?: boolean
}

/** An app sidebar link. With `clubPage` it opens that page of the club picked in the sidebar (`href` when none is). */
export interface AppNavItem extends NavItem {
  clubPage?: ClubPage
  /** Highlighted only on `href` itself, not on the pages under it. */
  end?: boolean
  /** The phone tab bar's primary action, raised in its centre (`AppTabBar`). */
  cta?: boolean
}

/** A labelled section of the app sidebar. */
export interface AppNavGroup {
  label: string
  icon: LucideIcon
  items: AppNavItem[]
  /** Labelled with the selected club's name once one is picked. */
  namedByClub?: boolean
  /** The switcher shown at the top of the group: the running sessions (yours) or the clubs. */
  switcher?: 'session' | 'club'
  /** Hidden when this web feature is switched off. */
  feature?: keyof Features['web']
  /** Club management: hidden from player-only accounts (`useCanManageClubs`). */
  clubManager?: boolean
}
