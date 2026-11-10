import { useState, type CSSProperties } from 'react'
import { Outlet } from 'react-router'
import ConnectionBanner from '@/components/feedback/ConnectionBanner'
import Logo from '@/components/brand/Logo'
import AppBreadcrumbs from '@/components/layout/app/AppBreadcrumbs'
import AppSidebar from '@/components/layout/app/AppSidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { sidebar } from '@/config/sidebar'
import { useClubTheme } from '@/utils/hooks/useClubTheme'
import { recall, remember } from '@/utils/platform/remember'

/**
 * Queue Master shell, shared by the desktop app and the web session board.
 * Exactly the screen's height: pages scroll inside <main>, or (the session
 * page) split it into their own scrolling columns. Two-tone: the sidebar's
 * colour frames the page (breadcrumbs sit on it), a light rounded panel below. The sidebar collapses to
 * an icon rail (its button, its edge, or Ctrl/⌘ B), and this browser
 * remembers which; on small screens it opens as a sheet from the header.
 * Colours follow the active club (useClubTheme).
 */
export default function AppLayout() {
  const [open, setOpen] = useState(() => recall('sidebar') !== 'collapsed')
  // The club's own colours, when one is on screen or picked (set in its Appearance card).
  useClubTheme()

  return (
    <SidebarProvider
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        remember('sidebar', next ? 'expanded' : 'collapsed')
      }}
      className="h-svh min-h-0 bg-sidebar"
      style={{ '--sidebar-width': sidebar.width, '--sidebar-width-icon': sidebar.widthIcon } as CSSProperties}
    >
      <AppSidebar />
      {/* Transparent over the sidebar-coloured frame: the header and breadcrumbs sit on the frame, the page is the light panel below. */}
      <SidebarInset id="main" className="app-shell-frame bg-transparent md:peer-data-[variant=inset]:shadow-none">
        <header className="app-shell-mobile-header">
          <SidebarTrigger aria-label="Open navigation" title="Open navigation" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
          <Logo href="/app" className="text-sidebar-accent-foreground" />
        </header>
        <AppBreadcrumbs />
        <div className="app-shell-page">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="shrink-0 px-6 pt-6 empty:hidden">
              <ConnectionBanner />
            </div>
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
