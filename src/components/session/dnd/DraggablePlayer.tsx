import { useDraggable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import type { DraggedPlayer } from '@/interfaces/BoardDrag'
import { cn } from '@/utils/cn'

interface DraggablePlayerProps {
  player: DraggedPlayer
  disabled?: boolean
  children: ReactNode
  className?: string
}

/** Makes its children draggable as this player (mouse, touch or keyboard: Space to pick up, arrows to move). */
export default function DraggablePlayer({ player, disabled, children, className }: DraggablePlayerProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${player.from === 'queue' ? 'queue' : `${player.from.courtId}:${player.from.side}`}:${player.playerId}`,
    data: player,
    disabled,
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-roledescription="draggable player"
      aria-label={`${player.name}. Drag onto a court side to place them.`}
      className={cn('cursor-grab touch-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing', isDragging && 'opacity-40', className)}
    >
      {children}
    </div>
  )
}
