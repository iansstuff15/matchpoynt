import type { SessionView } from '@matchpoynt/shared'
import { ChevronDown, UserPlus } from 'lucide-react'
import { useState } from 'react'
import AddCourtButton from '@/components/session/AddCourtButton'
import AddPlayerForm from '@/components/session/AddPlayerForm'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { Sport } from '@/interfaces/Sport'
import { recall, remember } from '@/utils/platform/remember'
import type { useSessionActions } from '@/utils/hooks/useSession'

interface BoardToolsProps {
  session: SessionView
  sport: Sport
  actions: ReturnType<typeof useSessionActions>
}

/**
 * Above the courts: adding a player and adding a court, on one row. It
 * collapses to its title bar to give the courts the room; this browser
 * remembers whether it was open.
 */
export default function BoardTools({ session, sport, actions }: BoardToolsProps) {
  const [open, setOpen] = useState(() => recall('boardTools') !== 'closed')
  const { addPlayer, addCourt } = actions

  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        remember('boardTools', next ? 'open' : 'closed')
      }}
      className="board-tools"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="board-tools-title" className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="size-4 text-muted-foreground" aria-hidden />
          Add players and courts
        </h2>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" aria-label={open ? 'Hide adding players and courts' : 'Show adding players and courts'}>
            <ChevronDown className="transition-transform duration-[var(--gp-duration-fast)] in-data-[state=open]:rotate-180" aria-hidden />
            {open ? 'Hide' : 'Show'}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="board-tools-content" aria-labelledby="board-tools-title">
        <AddPlayerForm compact sport={sport} sessionId={session.id} onAdd={(name, tierId, checkedIn) => addPlayer.mutate({ name, tierId, checkedIn })} />
        <AddCourtButton pending={addCourt.isPending} blockedReason={session.addCourtBlockedReason} onAdd={() => addCourt.mutate()} />
      </CollapsibleContent>
    </Collapsible>
  )
}
