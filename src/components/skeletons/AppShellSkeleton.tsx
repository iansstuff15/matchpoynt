import type { CSSProperties, ReactNode } from 'react'
import SessionBoardSkeleton from '@/components/session/SessionBoardSkeleton'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { sidebar } from '@/config/sidebar'
import { recall } from '@/utils/platform/remember'

/** The app shell (two-tone: sidebar, expanded or as the rail, around the page) before feature toggles load. The page defaults to the session board. */
export default function AppShellSkeleton({ children }: { children?: ReactNode }) {
  return (
    <SidebarProvider
      open={recall('sidebar') !== 'collapsed'}
      className="h-svh min-h-0 bg-sidebar"
      style={{ '--sidebar-width': sidebar.width, '--sidebar-width-icon': sidebar.widthIcon } as CSSProperties}
      aria-busy="true"
      aria-label="Loading Matchpoynt"
    >
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <div className="app-sidebar-brand">
            <div className="flex items-center gap-2">
              <Skeleton className="size-7" />
              <Skeleton className="h-5 w-24 group-data-[collapsible=icon]:hidden" />
            </div>
            <Skeleton className="size-8" />
          </div>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-1.5 group-data-[collapsible=icon]:hidden">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <Skeleton className="mx-2 mb-2 h-3 w-20 group-data-[collapsible=icon]:hidden" />
            <SidebarMenu>
              {[0, 1, 2].map((i) => (
                <SidebarMenuItem key={i}>
                  <Skeleton className="h-10 w-full rounded-lg group-data-[collapsible=icon]:size-10" />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Skeleton className="mx-2 mb-1 h-3 w-32 group-data-[collapsible=icon]:hidden" />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="app-shell-frame bg-transparent md:peer-data-[variant=inset]:shadow-none">
        <div className="app-breadcrumbs">
          <Skeleton className="h-7 w-56 bg-sidebar-accent" />
        </div>
        <div className="app-shell-page">
          <div className="flex-1 space-y-6 p-6">
            <Skeleton className="h-8 w-44" />
            {children ?? <SessionBoardSkeleton />}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
