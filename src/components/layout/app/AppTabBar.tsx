import { Link, useLocation } from 'react-router'
import { useSidebar } from '@/components/ui/sidebar'
import { appTabs } from '@/config/navigation'
import type { AppNavItem } from '@/interfaces/NavItem'
import { cn } from '@/utils/cn'
import { useNavigation } from '@/utils/hooks/useNavigation'
import { usePlayerSessions } from '@/utils/hooks/usePlayerLive'
import { clubPageHref, useSelectedClub } from '@/utils/hooks/useSelectedClub'

/**
 * Phones: the app shell's main pages as tabs along the bottom of the screen,
 * with Playing now in the centre as the primary action (`cta`).
 * The full sidebar (switchers, the club's pages) opens from the menu button at
 * the top left of the header (`AppMobileHeader`). The tab whose address is the longest match of the page's is
 * the one highlighted, so a club page doesn't light Clubs' neighbours.
 */
export default function AppTabBar() {
  const tabs = useNavigation(appTabs)
  const { club } = useSelectedClub()
  const { pathname } = useLocation()
  const { openMobile } = useSidebar()

  const matches = (href: string, end?: boolean) => pathname === href || (!end && pathname.startsWith(`${href}/`))
  const current = tabs.filter((tab) => matches(tab.href, tab.end)).sort((a, b) => b.href.length - a.href.length)[0]

  const link = (tab: AppNavItem) => {
    const active = tab === current && !openMobile
    const Icon = tab.icon
    // Clubs opens the club picked in the sidebar, like its Club section does.
    const href = tab.href === '/clubs' && club ? clubPageHref(club.id) : (tab.tabHref ?? tab.href)
    return (
      <Link
        key={tab.href}
        to={href}
        title={tab.description}
        aria-current={active ? 'page' : undefined}
        className={cn(tab.cta ? 'tab-bar-cta' : 'tab-bar-item', tab.cta && playing && 'tab-bar-cta-live', active && (tab.cta ? 'tab-bar-cta-active' : 'tab-bar-item-active'))}
      >
        <Icon aria-hidden />
        <span>{tab.cta && waiting ? 'Waiting' : (tab.tabLabel ?? tab.label)}</span>
        {tab.cta && playing && <span className="sr-only"> (you're on court now)</span>}
        {tab.cta && waiting && <span className="sr-only"> for your next game</span>}
      </Link>
    )
  }

  // The primary action sits in the centre as a pill, with the other tabs either side of it.
  const cta = tabs.find((t) => t.cta)
  // Lit in the accent and pulsing while you're on court in one of your clubs' sessions; dim, and saying "Waiting", while you wait for a game in one.
  const statuses = usePlayerSessions(Boolean(cta)).data?.map((s) => s.status) ?? []
  const playing = statuses.includes('playing')
  const waiting = !playing && statuses.some((s) => s !== 'not_in_session')
  if (!cta) {
    return (
      <nav aria-label="Tabs" className="app-tab-bar">
        {tabs.map(link)}
      </nav>
    )
  }
  const at = tabs.indexOf(cta)
  return (
    <nav aria-label="Tabs" className="app-tab-bar app-tab-bar-with-cta">
      <div className="app-tab-bar-side">{tabs.slice(0, at).map(link)}</div>
      {link(cta)}
      <div className="app-tab-bar-side">{tabs.slice(at + 1).map(link)}</div>
    </nav>
  )
}
