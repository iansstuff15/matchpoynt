import type { ActiveSessionSummary } from '@matchpoynt/shared'
import { Check, ChevronsUpDown, History, LayoutGrid, Plus, Radio } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
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
import { sports } from '@/config/sports'

interface SessionSwitcherProps {
  sessions: ActiveSessionSummary[]
  /** The session on screen, if it's one of them. */
  currentId: string | null
  onNew: () => void
  /** `sidebar` is a sidebar menu button naming the current session (just its icon in the rail). */
  variant?: 'inline' | 'sidebar'
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** Switches between running sessions, and starts another. Used on the board's header and in the sidebar. */
export default function SessionSwitcher({ sessions, currentId, onNew, variant = 'inline' }: SessionSwitcherProps) {
  const current = sessions.find((s) => s.id === currentId)
  const sidebar = variant === 'sidebar'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {sidebar ? (
          <SidebarMenuButton
            variant="nav"
            size="lg"
            className="group-data-[collapsible=icon]:border-0"
            tooltip={current?.label ?? 'Sessions'}
            aria-label="Switch session"
          >
            <span className="sidebar-tile">
              <LayoutGrid className="size-5" aria-hidden />
            </span>
            <span className="sidebar-label">
              <span className="sidebar-caption">Session</span>
              <span className="truncate font-medium text-sidebar-accent-foreground">{current?.label ?? `${sessions.length} running`}</span>
            </span>
            <ChevronsUpDown className="ml-auto opacity-60" aria-hidden />
          </SidebarMenuButton>
        ) : (
          <Button variant="outline" size="sm" aria-label="Switch session">
            <LayoutGrid aria-hidden />
            {sessions.length} running
            <ChevronsUpDown className="opacity-60" aria-hidden />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={sidebar ? 'right' : 'bottom'} align="start" className="w-72">
        <DropdownMenuLabel>Running sessions</DropdownMenuLabel>
        <DropdownMenuGroup>
          {sessions.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">No sessions running.</p>}
          {sessions.map((s) => {
            const Icon = sports[s.sportId].icon
            return (
              <DropdownMenuItem key={s.id} asChild>
                <Link to={`/app/${s.id}`} aria-current={s.id === currentId ? 'page' : undefined}>
                  <Icon aria-hidden />
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate font-medium">{s.label}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {s.playing > 0 && <Radio className="size-3" aria-hidden />}
                      {s.playing}/{s.courts} courts playing · {s.players} players · since {clock(s.startedAt)}
                    </span>
                  </span>
                  {s.id === currentId && <Check aria-label="Open now" />}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onNew}>
          <Plus aria-hidden />
          New session
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/app">
            <History aria-hidden />
            All sessions
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
