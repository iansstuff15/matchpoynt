import { Link, useLocation, useSearchParams } from 'react-router'
import Logo from '@/components/brand/Logo'
import AccountMenu from '@/components/layout/app/AccountMenu'
import AppSwitchers from '@/components/layout/app/AppSwitchers'
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
import { clubTabs } from '@/config/club'
import { appNavigation } from '@/config/navigation'
import type { AppNavItem } from '@/interfaces/NavItem'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { clubPageHref, useSelectedClub } from '@/utils/hooks/useSelectedClub'

/**
 * Side navigation for the Queue Master app shell: brand, account, the
 * session and club switchers, then the board and the selected club's pages.
 * Collapses to an icon rail where every item keeps a tooltip.
 */
export default function AppSidebar() {
  const { web } = useFeatures()
  const { club } = useSelectedClub()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const { isMobile, setOpenMobile, state } = useSidebar()

  // Club links open the club picked in the switcher; with none picked, only "All clubs" (the picker) shows.
  const link = (item: AppNavItem) => {
    // A page under another link's address (/app/past under /app) highlights only its own link.
    const ownLink = appNavigation.some((g) => g.items.some((i) => i.href === pathname && i !== item))
    if (!item.clubTab || !club) return { href: item.href, active: pathname === item.href || (!item.end && !ownLink && pathname.startsWith(`${item.href}/`)) }
    const tab = clubTabs.find((t) => t === params.get('tab')) ?? clubTabs[0]
    return { href: clubPageHref(club.id, item.clubTab), active: pathname === `/clubs/${club.id}` && tab === item.clubTab }
  }
  const groups = appNavigation
    .filter((group) => !group.feature || web[group.feature])
    .map((group) => ({ ...group, items: group.items.filter((item) => (!item.clubTab || club) && (!item.feature || web[item.feature])) }))

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="app-sidebar-brand">
          <Logo href="/app" className="text-sidebar-accent-foreground group-data-[collapsible=icon]:[&>span]:hidden" />
          <SidebarToggle />
        </div>
        <AccountMenu />
      </SidebarHeader>
      <SidebarContent>
        <AppSwitchers />
        <nav aria-label="App">
          {groups.map(({ label, icon: GroupIcon, items, namedByClub }) => (
            <SidebarGroup key={label}>
              <SidebarGroupLabel>
                <GroupIcon aria-hidden />
                <span className="ml-1.5 truncate">{namedByClub && club ? club.name : label}</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
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
        <div className="px-2 pb-1 group-data-[collapsible=icon]:hidden">
          <AppVersion />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
