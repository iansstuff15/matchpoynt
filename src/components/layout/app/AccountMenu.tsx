import { ChevronsUpDown } from 'lucide-react'
import { useNavigate } from 'react-router'
import AccountMenuItems from '@/components/layout/app/AccountMenuItems'
import ClubAvatar from '@/components/club/ClubAvatar'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { notifyDone } from '@/utils/feedback/notify'
import { useAppConfig, useFeatures } from '@/utils/hooks/useFeatures'
import { useMe, useSignOut } from '@/utils/hooks/useMe'

/**
 * The signed-in account at the top of the app sidebar: photo, name and
 * @username, opening a menu to their profile, setting a password or signing out. In the icon rail
 * only the avatar shows.
 */
export default function AccountMenu() {
  const { data, isLoading } = useMe()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const { web } = useFeatures()
  const config = useAppConfig()
  const { isMobile, setOpen } = useSidebar()

  // Without the API we don't know the account mode; with sign-in off, GuestNote speaks for the account.
  if (config.isError || !web.signIn) return null
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2" aria-busy="true" aria-label="Loading account">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="grid flex-1 gap-1.5 group-data-[collapsible=icon]:hidden">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
    )
  }
  if (!data?.user) return null

  const { email, displayName, username, avatarUrl } = data.user
  const name = displayName ?? email ?? 'Your account'

  return (
    <div className="grid gap-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                variant="nav"
                size="lg"
                className="group-data-[collapsible=icon]:border-0"
                tooltip={name}
                aria-label={`Account: ${name}`}
              >
                <ClubAvatar name={name} url={avatarUrl} className="size-10" />
                <span className="sidebar-label">
                  <span className="truncate font-semibold text-sidebar-accent-foreground">{name}</span>
                  {(username || (email && displayName)) && <span className="sidebar-caption">{username ? `@${username}` : email}</span>}
                </span>
                <ChevronsUpDown className="ml-auto opacity-60" aria-hidden />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={isMobile ? 'bottom' : 'right'} align="start" className="w-64">
              <AccountMenuItems
                name={name}
                email={email}
                signingOut={signOut.isPending}
                onSignOut={() =>
                  signOut.mutate(undefined, {
                    onSuccess: () => {
                      notifyDone('Signed out')
                      navigate('/sign-in')
                    },
                    // The rail has no room for the banner, so open the sidebar to show it.
                    onError: () => setOpen(true),
                  })
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      {signOut.isError && (
        <div className="group-data-[collapsible=icon]:hidden">
          <ErrorBanner error={signOut.error} action="sign out" onRetry={() => signOut.mutate()} />
        </div>
      )}
    </div>
  )
}
