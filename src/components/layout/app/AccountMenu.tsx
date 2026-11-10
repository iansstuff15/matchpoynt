import { ChevronsUpDown, KeyRound, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import ClubAvatar from '@/components/club/ClubAvatar'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { notifyDone } from '@/utils/feedback/notify'
import { useAppConfig, useFeatures } from '@/utils/hooks/useFeatures'
import { useMe, useSignOut } from '@/utils/hooks/useMe'

/**
 * The signed-in account at the top of the app sidebar: avatar, name and
 * email, opening a menu to set a password or sign out. In the icon rail
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

  const { email, displayName } = data.user
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
                <ClubAvatar name={name} url={null} className="size-10" />
                <span className="sidebar-label">
                  <span className="truncate font-semibold text-sidebar-accent-foreground">{name}</span>
                  {email && displayName && <span className="sidebar-caption">{email}</span>}
                </span>
                <ChevronsUpDown className="ml-auto opacity-60" aria-hidden />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={isMobile ? 'bottom' : 'right'} align="start" className="w-64">
              <DropdownMenuLabel className="grid font-normal">
                <span className="truncate font-medium">{name}</span>
                {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {web.signInEmail && (
                <DropdownMenuItem asChild>
                  <Link to="/account/password" title="Set or change the password for your account">
                    <KeyRound aria-hidden />
                    Set a password
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                disabled={signOut.isPending}
                onSelect={() =>
                  signOut.mutate(undefined, {
                    onSuccess: () => {
                      notifyDone('Signed out')
                      navigate('/sign-in')
                    },
                    // The rail has no room for the banner, so open the sidebar to show it.
                    onError: () => setOpen(true),
                  })
                }
              >
                <LogOut aria-hidden />
                Sign out
              </DropdownMenuItem>
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
