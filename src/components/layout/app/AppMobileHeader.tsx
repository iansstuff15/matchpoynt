import { Menu } from 'lucide-react'
import { useNavigate } from 'react-router'
import Logo from '@/components/brand/Logo'
import ClubAvatar from '@/components/club/ClubAvatar'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import AccountMenuItems from '@/components/layout/app/AccountMenuItems'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useSidebar } from '@/components/ui/sidebar'
import { notifyDone } from '@/utils/feedback/notify'
import { useAppHome } from '@/utils/hooks/useCanRunSessions'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useMe, useSignOut } from '@/utils/hooks/useMe'

/**
 * The app shell's header on phones: the menu (the full sidebar as a sheet:
 * switchers and every page) on the left, the logo in the middle, and the
 * signed-in person's photo on the right, opening their account menu.
 */
export default function AppMobileHeader() {
  const { openMobile, setOpenMobile } = useSidebar()
  const { web } = useFeatures()
  const me = useMe()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const home = useAppHome()
  const user = web.signIn ? (me.data?.user ?? null) : null
  const name = user ? (user.displayName ?? user.email ?? 'Your account') : null

  return (
    <>
      <header className="app-shell-mobile-header">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="app-shell-mobile-menu"
          aria-label="Open the menu"
          title="Open the menu: switch sessions or clubs, and every page"
          aria-expanded={openMobile}
          aria-haspopup="dialog"
          onClick={() => setOpenMobile(true)}
        >
          <Menu />
        </Button>
        <Logo href={home} className="justify-self-center text-sidebar-accent-foreground" />
        <div className="justify-self-end">
          {user && name && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="app-shell-mobile-account" aria-label={`Account: ${name}`} title={user.username ? `@${user.username}` : name}>
                  <ClubAvatar name={name} url={user.avatarUrl} className="size-9" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end" className="w-64">
                <AccountMenuItems
                  name={name}
                  email={user.email}
                  signingOut={signOut.isPending}
                  onSignOut={() =>
                    signOut.mutate(undefined, {
                      onSuccess: () => {
                        notifyDone('Signed out')
                        navigate('/sign-in')
                      },
                    })
                  }
                />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
      {signOut.isError && (
        <div className="px-4 pb-3 md:hidden">
          <ErrorBanner error={signOut.error} action="sign out" onRetry={() => signOut.mutate()} />
        </div>
      )}
    </>
  )
}
