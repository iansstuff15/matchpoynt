import type { DirectoryClubView } from '@matchpoynt/shared'
import { Check, ChevronsUpDown, Compass, LayoutGrid } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import ClubAvatar from '@/components/club/ClubAvatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { choosePlayerClub } from '@/utils/hooks/usePlayerClub'

interface PlayerClubSwitcherProps {
  clubs: DirectoryClubView[]
  /** The club the player is playing with. */
  current: DirectoryClubView | null
}

/**
 * A player's club switcher (the top of the sidebar's **You** group): the club
 * they're playing with, then every club they're in to switch to (the app takes
 * on its colours and opens Playing now), and "All clubs" for the full-screen
 * picker, where they can find more.
 */
export default function PlayerClubSwitcher({ clubs, current }: PlayerClubSwitcherProps) {
  const { web } = useFeatures()
  const navigate = useNavigate()
  const pick = (club: DirectoryClubView) => {
    choosePlayerClub(club.id)
    navigate(web.playerView ? '/play' : club.handle ? `/c/${club.handle}` : '/profile')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton variant="nav" size="lg" className="group-data-[collapsible=icon]:border-0" tooltip={current?.name ?? 'Choose a club'} aria-label="Switch club">
          {current ? (
            <ClubAvatar name={current.name} url={current.avatarUrl} position={current.avatarPosition} className="size-10" />
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-dashed border-sidebar-border">
              <LayoutGrid className="size-4" aria-hidden />
            </span>
          )}
          <span className="sidebar-label">
            <span className="sidebar-caption">Playing with</span>
            <span className="truncate font-medium text-sidebar-accent-foreground">{current?.name ?? 'Choose a club'}</span>
          </span>
          <ChevronsUpDown className="ml-auto opacity-60" aria-hidden />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-64">
        <DropdownMenuLabel>Your clubs</DropdownMenuLabel>
        <DropdownMenuGroup>
          {clubs.map((club) => (
            <DropdownMenuItem key={club.id} onSelect={() => pick(club)} aria-current={club.id === current?.id ? 'true' : undefined}>
              <ClubAvatar name={club.name} url={club.avatarUrl} position={club.avatarPosition} className="size-7" />
              <span className="min-w-0 flex-1 truncate">{club.name}</span>
              {club.id === current?.id && <Check aria-label="Playing with now" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {clubs.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem asChild>
          <Link to="/choose-club">
            <Compass aria-hidden />
            All clubs and find more
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
