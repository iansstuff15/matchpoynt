import { ArrowLeftRight, KeyRound, LogOut, Sparkles, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useAppMode } from '@/utils/hooks/useAppMode'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { useWhatsNew } from '@/utils/hooks/useWhatsNew'

interface AccountMenuItemsProps {
  name: string
  email: string | null
  signingOut: boolean
  onSignOut: () => void
}

/** The account menu's contents (the sidebar's and the phone header's): who's signed in, their profile, a password, what's new and signing out. */
export default function AccountMenuItems({ name, email, signingOut, onSignOut }: AccountMenuItemsProps) {
  const { web } = useFeatures()
  const whatsNew = useWhatsNew()
  const { mode, both } = useAppMode()
  return (
    <>
      <DropdownMenuLabel className="grid font-normal">
        <span className="truncate font-medium">{name}</span>
        {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link to="/profile" title="Your profile: games, badges, clubs and details">
          <UserRound aria-hidden />
          Your profile
        </Link>
      </DropdownMenuItem>
      {web.signInEmail && (
        <DropdownMenuItem asChild>
          <Link to="/account/password" title="Set or change the password for your account">
            <KeyRound aria-hidden />
            Set a password
          </Link>
        </DropdownMenuItem>
      )}
      {/* "Both" accounts switch between playing and running their clubs. */}
      {both && (
        <DropdownMenuItem asChild>
          <Link to="/start" title="Choose again: play with a club, or run your sessions and clubs">
            <ArrowLeftRight aria-hidden />
            {mode === 'player' ? 'Switch to club owner' : 'Switch to player'}
          </Link>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onSelect={() => whatsNew.open()}>
        <Sparkles aria-hidden />
        What's new
      </DropdownMenuItem>
      <DropdownMenuItem disabled={signingOut} onSelect={onSignOut}>
        <LogOut aria-hidden />
        Sign out
      </DropdownMenuItem>
    </>
  )
}
