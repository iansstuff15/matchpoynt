import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type Announcements, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { useState, type ReactNode } from 'react'
import PlayerChip from '@/components/session/dnd/PlayerChip'
import { board } from '@/config/board'
import type { BoardDropTarget, DraggedPlayer } from '@/interfaces/BoardDrag'

interface BoardDndProps {
  children: ReactNode
  onAssign: (player: DraggedPlayer, courtId: string, side: 0 | 1) => void
  onUnassign: (player: DraggedPlayer) => void
}

const where = (t: BoardDropTarget | undefined) => (!t ? 'nowhere' : t.kind === 'queue' ? 'the queue' : `${t.courtLabel}, side ${t.side + 1}`)

/**
 * Drag and drop for the board: queue rows and placed players onto court
 * sides, or back to the queue. Works with mouse, touch (press and hold) and
 * keyboard, and announces each step to screen readers.
 */
export default function BoardDnd({ children, onAssign, onUnassign }: BoardDndProps) {
  const [dragging, setDragging] = useState<DraggedPlayer | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${(active.data.current as DraggedPlayer).name}.`,
    onDragOver: ({ active, over }) => `${(active.data.current as DraggedPlayer).name} is over ${where(over?.data.current as BoardDropTarget)}.`,
    onDragEnd: ({ active, over }) => `${(active.data.current as DraggedPlayer).name} dropped on ${where(over?.data.current as BoardDropTarget)}.`,
    onDragCancel: ({ active }) => `Stopped moving ${(active.data.current as DraggedPlayer).name}.`,
  }

  const start = ({ active }: DragStartEvent) => setDragging(active.data.current as DraggedPlayer)
  const end = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    const player = active.data.current as DraggedPlayer
    const target = over?.data.current as BoardDropTarget | undefined
    if (!target) return
    if (target.kind === 'queue') {
      if (player.from !== 'queue') onUnassign(player)
      return
    }
    const sameSpot = player.from !== 'queue' && player.from.courtId === target.courtId && player.from.side === target.side
    // A full side is still sent: the API says it's full, and the banner explains.
    if (!sameSpot) onAssign(player, target.courtId, target.side)
  }

  return (
    <DndContext
      sensors={sensors}
      autoScroll={{ threshold: { x: 0, y: board.dragAutoScrollEdge } }}
      onDragStart={start} onDragEnd={end} onDragCancel={() => setDragging(null)} accessibility={{ announcements }}>
      {children}
      <DragOverlay dropAnimation={null}>{dragging && <PlayerChip name={dragging.name} lifted />}</DragOverlay>
    </DndContext>
  )
}
