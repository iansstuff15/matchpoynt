import type { CourtSide, PlayerRef } from '@matchpoynt/shared'
import { useDroppable } from '@dnd-kit/core'
import { X } from 'lucide-react'
import DraggablePlayer from '@/components/session/dnd/DraggablePlayer'
import PlayerChip from '@/components/session/dnd/PlayerChip'
import { Button } from '@/components/ui/button'
import type { BoardDropTarget } from '@/interfaces/BoardDrag'
import { cn } from '@/utils/cn'

interface CourtSideDropProps {
  courtId: string
  courtLabel: string
  side: CourtSide
  players: PlayerRef[]
  perSide: number
  onRemove: (playerId: string) => void
}

/** One side of an open court's card: shows who's placed there and takes dropped players. */
export default function CourtSideDrop({ courtId, courtLabel, side, players, perSide, onRemove }: CourtSideDropProps) {
  const full = players.length >= perSide
  const target: BoardDropTarget = { kind: 'side', courtId, courtLabel, side, full }
  const { setNodeRef, isOver, active } = useDroppable({ id: `side:${courtId}:${side}`, data: target })
  const dragging = Boolean(active)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'court-side transition-colors',
        dragging && !full && 'border-dashed border-primary/60',
        isOver && !full && 'border-primary bg-primary/10',
        isOver && full && 'border-destructive bg-destructive/10',
      )}
    >
      <p className="court-side-label">Side {side + 1}</p>
      <ul aria-label={`${courtLabel}, side ${side + 1}: ${players.length} of ${perSide} placed`} className="player-name-list gap-1.5">
        {players.map((p) => (
          <li key={p.id}>
            <DraggablePlayer player={{ playerId: p.id, name: p.name, from: { courtId, side } }}>
              <PlayerChip
                name={p.name}
                className="court-row py-0"
                trailing={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto text-muted-foreground"
                    // Keep the click from starting a drag.
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onClick={() => onRemove(p.id)}
                    aria-label={`Move ${p.name} back to the queue`}
                  >
                    <X />
                  </Button>
                }
              />
            </DraggablePlayer>
          </li>
        ))}
        {Array.from({ length: Math.max(0, perSide - players.length) }, (_, i) => (
          <li key={`slot-${i}`} className="court-slot">
            Drop a player
          </li>
        ))}
      </ul>
    </div>
  )
}
