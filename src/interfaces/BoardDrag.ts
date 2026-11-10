import type { CourtSide } from '@matchpoynt/shared'

/** What is being dragged on the board. */
export interface DraggedPlayer {
  playerId: string
  name: string
  /** Where it was picked up: the queue, or a side of an open court. */
  from: { courtId: string; side: CourtSide } | 'queue'
}

/** Where it can be dropped. */
export type BoardDropTarget = { kind: 'side'; courtId: string; courtLabel: string; side: CourtSide; full: boolean } | { kind: 'queue' }
