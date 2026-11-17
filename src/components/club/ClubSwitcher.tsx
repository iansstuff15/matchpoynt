import type { ClubSummary } from '@matchpoynt/shared'
import { Check, ChevronsUpDown, Compass, LayoutGrid, Pencil, Plus } from 'lucide-react'
import { Link } from 'react-router'
import ClubAvatar from '@/components/club/ClubAvatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenuButton } from '@/components/ui/sidebar'

interface ClubSwitcherProps {
  clubs: ClubSummary[]
  /** The club on screen, or the one opened last. */
  currentId: string | null
  /** Offer the full-screen club picker, to find clubs to join (while the directory is on). */
  findClubs?: boolean
}

/**
 * Switches clubs like switching profiles: the current club's round avatar
 * (all that shows in the sidebar's icon rail), then every club's avatar and
 * name, "Add club", "Edit clubs", the picker and, with the directory on,
 * "Find clubs" (the full-screen club picker).
 */
export default function ClubSwitcher({ clubs, currentId, findClubs = false }: ClubSwitcherProps) {
  const current = clubs.find((c) => c.id === currentId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          variant="nav"
          size="lg"
          className="group-data-[collapsible=icon]:border-0"
          tooltip={current?.name ?? 'Choose a club'}
          aria-label="Switch club"
        >
          {current ? (
            <ClubAvatar name={current.name} url={current.avatarUrl} position={current.avatarPosition} className="size-10" />
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-dashed border-sidebar-border">
              <LayoutGrid className="size-4" aria-hidden />
            </span>
          )}
          <span className="sidebar-label">
            <span className="sidebar-caption">Club</span>
            <span className="truncate font-medium text-sidebar-accent-foreground">{current?.name ?? 'Choose a club'}</span>
          </span>
          <ChevronsUpDown className="ml-auto opacity-60" aria-hidden />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-64">
        <DropdownMenuLabel>Clubs</DropdownMenuLabel>
        <DropdownMenuGroup>
          {clubs.map((club) => (
            <DropdownMenuItem key={club.id} asChild>
              <Link to={`/clubs/${club.id}`} aria-current={club.id === currentId ? 'page' : undefined}>
                <ClubAvatar name={club.name} url={club.avatarUrl} position={club.avatarPosition} className="size-7" />
                <span className="min-w-0 flex-1 truncate">{club.name}</span>
                {club.id === currentId && <Check aria-label="Open now" />}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {clubs.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem asChild>
          <Link to="/clubs?new=1">
            <Plus aria-hidden />
            Add club
          </Link>
        </DropdownMenuItem>
        {clubs.length > 0 && (
          <DropdownMenuItem asChild>
            <Link to="/clubs?edit=1">
              <Pencil aria-hidden />
              Edit clubs
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/clubs">
            <LayoutGrid aria-hidden />
            All clubs
          </Link>
        </DropdownMenuItem>
        {findClubs && (
          <DropdownMenuItem asChild>
            <Link to="/choose-club">
              <Compass aria-hidden />
              Find clubs
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
