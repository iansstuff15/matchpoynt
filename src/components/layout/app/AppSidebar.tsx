import { Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import Logo from '@/components/brand/Logo'
import AccountMenu from '@/components/layout/app/AccountMenu'
import SidebarSwitcher from '@/components/layout/app/SidebarSwitcher'
import AppVersion from '@/components/layout/app/AppVersion'
import GuestNote from '@/components/layout/app/GuestNote'
import SidebarToggle from '@/components/layout/app/SidebarToggle'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { appNavigation } from '@/config/navigation'
import type { AppNavItem } from '@/interfaces/NavItem'
import { useCanManageClubs } from '@/utils/hooks/useCanManageClubs'
import { useAppHome, useCanRunSessions } from '@/utils/hooks/useCanRunSessions'
import { navFeatureOn } from '@/utils/hooks/useNavigation'
import { useWhatsNew } from '@/utils/hooks/useWhatsNew'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { clubPageHref, useSelectedClub } from '@/utils/hooks/useSelectedClub'

/**
 * Side navigation for the Queue Master app shell: brand and account, then
 * two groups, each under its own switcher: **You** (sessions, invoices,
 * finding clubs, profile) and **Club** (the selected club's pages).
 * Collapses to an icon rail where every item keeps a tooltip.
 */
export default function AppSidebar() {
  const { web } = useFeatures()
  const { club } = useSelectedClub()
  const canManageClubs = useCanManageClubs()
  const canRunSessions = useCanRunSessions()
  const home = useAppHome()
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile, state } = useSidebar()
  const whatsNew = useWhatsNew()

  // Club links open the club picked in the switcher; with none picked, only "All clubs" (the picker) shows.
  const link = (item: AppNavItem) => {
    // A page under another link's address (a club's page under /clubs) highlights only its own link.
    const ownLink = appNavigation.some((g) => g.items.some((i) => i.href === pathname && i !== item))
    if (!item.clubPage || !club) return { href: item.href, active: pathname === item.href || (!item.end && !ownLink && pathname.startsWith(`${item.href}/`)) }
    const href = clubPageHref(club.id, item.clubPage)
    // An invoice's or expense's own page keeps its list's link lit; the dashboard (the club's own address) only on itself.
    return { href, active: pathname === href || (item.clubPage !== 'dashboard' && pathname.startsWith(`${href}/`)) }
  }
  const groups = appNavigation
    .filter((group) => (!group.feature || web[group.feature]) && (!group.clubManager || canManageClubs))
    .map((group) => ({ ...group, items: group.items.filter((item) => (!item.clubPage || club) && navFeatureOn(web, item.feature) && (!item.clubManager || canManageClubs) && (!item.sessionRunner || canRunSessions)) }))

  return (
    <Sidebar variant="inset" collapsible="icon">
      {/* On phones the header has the logo and the account (AppMobileHeader), so the sheet goes straight to the pages. */}
      {!isMobile && (
        <SidebarHeader>
          <div className="app-sidebar-brand">
            <Logo href={home} className="text-sidebar-accent-foreground group-data-[collapsible=icon]:[&>svg]:h-5" />
            <SidebarToggle />
          </div>
          <AccountMenu />
        </SidebarHeader>
      )}
      <SidebarContent>
        <nav aria-label="App">
          {groups.map(({ label, icon: GroupIcon, items, namedByClub, switcher }) => (
            <SidebarGroup key={label} role="group" aria-label={namedByClub && club ? club.name : label}>
              <SidebarGroupLabel>
                <GroupIcon aria-hidden />
                <span className="ml-1.5 truncate">{namedByClub && club ? club.name : label}</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {switcher && <SidebarSwitcher kind={switcher} />}
                  {items.map((item) => {
                    const { href, active } = link(item)
                    const Icon = item.icon
                    return (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton asChild variant="nav" size="md" isActive={active} tooltip={item.label}>
                          <Link
                            to={href}
                            title={state === 'expanded' ? item.description : undefined}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => isMobile && setOpenMobile(false)}
                          >
                            <Icon aria-hidden />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <GuestNote />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton variant="nav" size="md" tooltip="What's new" onClick={() => whatsNew.open()}>
              <Sparkles aria-hidden />
              <span>What's new</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 pb-1 group-data-[collapsible=icon]:hidden">
          <AppVersion />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
