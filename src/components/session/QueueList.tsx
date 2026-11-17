import type { PlayerView, UpNextView } from '@matchpoynt/shared'
import { useDroppable } from '@dnd-kit/core'
import { QrCode, Users } from 'lucide-react'
import AwaitingCheckInList from '@/components/session/checkin/AwaitingCheckInList'
import NextMatchGroup from '@/components/session/queue/NextMatchGroup'
import OnBreakList from '@/components/session/queue/OnBreakList'
import QueueRow from '@/components/session/queue/QueueRow'
import TournamentCompetitors from '@/components/session/queue/TournamentCompetitors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { BoardDropTarget } from '@/interfaces/BoardDrag'
import type { Sport } from '@/interfaces/Sport'
import { board } from '@/config/board'
import { cn } from '@/utils/cn'
import { useNow } from '@/utils/hooks/useNow'

interface QueueListProps {
  sport: Sport
  /** Checked-in players in call order, as the server returns it. Players placed on courts aren't in it. */
  queue: PlayerView[]
  /** With automatic queueing: the queue as the matches it will make. `null` while queueing is manual. */
  upNext: UpNextView | null
  /** Roster players not checked in yet; listed under the queue, not matched. */
  awaitingCheckIn: PlayerView[]
  /** Checked-in players taking a break; listed under the queue, not matched. */
  onBreak: PlayerView[]
  playersPerMatch: number
  onRemove: (playerId: string) => void
  onCheckIn: (playerId: string) => void
  /** Starts (`true`) or ends a player's break. */
  onSetBreak: (playerId: string, onBreak: boolean) => void
  /** Device clock correction from the API, so wait times follow its clock. */
  clockOffsetMs: number
  /** While a tournament runs: its competitors, whether they can change, and the update. `null` without one. */
  tournament: { competitors: PlayerView[]; blockedReason: string | null; pending: boolean; onUpdate: (playerIds: string[]) => void } | null
}

const queueTarget: BoardDropTarget = { kind: 'queue' }

/**
 * The board's queue panel. With automatic queueing it shows who plays next and
 * against whom; with manual queueing, the waiting players in call order. Then
 * anyone still to check in. Only the player list scrolls.
 */
export default function QueueList({ sport, queue, upNext, awaitingCheckIn, onBreak, playersPerMatch, onRemove, onCheckIn, onSetBreak, tournament, clockOffsetMs }: QueueListProps) {
  // One clock for every wait time in the panel, ticking only while someone is waiting.
  const now = useNow(queue.length > 0 || onBreak.length > 0, board.timerTickMs, clockOffsetMs)
  const tierLabel = (tierId: string) => sport.tiers.find((t) => t.id === tierId)?.label ?? tierId
  const { setNodeRef, isOver, active } = useDroppable({ id: 'queue', data: queueTarget })
  const fromCourt = Boolean(active && (active.data.current as { from?: unknown })?.from !== 'queue')
  const waiting = upNext ? upNext.waiting : queue
  // Waiting players after the lined-up matches keep counting from where those leave off.
  const firstWaiting = upNext ? upNext.matches.length * playersPerMatch : 0

  return (
    <Card ref={setNodeRef} className={cn('board-queue transition-colors', fromCourt && 'border-dashed border-primary', isOver && fromCourt && 'bg-primary/5')}>
      <CardHeader>
        <CardTitle className="font-display">Queue</CardTitle>
        <CardDescription>
          {queue.length} checked in and waiting
          {upNext
            ? ` · ${upNext.matches.length} ${upNext.matches.length === 1 ? 'match' : 'matches'} lined up`
            : ` · next match needs ${playersPerMatch} · drag players onto courts`}
        </CardDescription>
      </CardHeader>
      <CardContent className="board-queue-body">
        {tournament && <TournamentCompetitors {...tournament} waiting={queue} />}
        {queue.length === 0 && awaitingCheckIn.length === 0 && onBreak.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No one in the queue</EmptyTitle>
              <EmptyDescription>Add players to start filling courts.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="board-queue-scroll" aria-label="Players in the queue">
            {queue.length === 0 && onBreak.length === 0 && (
              <p className="flex items-center gap-2 py-3 pr-3 text-sm text-muted-foreground">
                <QrCode className="size-4 shrink-0" aria-hidden />
                No one has checked in yet. Open the check-in QR for players to scan.
              </p>
            )}
            {upNext && upNext.matches.length > 0 && (
              <ol aria-label="Matches lined up" className="grid gap-2 pt-1 pr-3 pb-2">
                {upNext.matches.map((match, i) => (
                  <NextMatchGroup key={match.sides.flat().map((p) => p.id).join()} match={match} index={i} now={now} onBreak={(id) => onSetBreak(id, true)} />
                ))}
              </ol>
            )}
            {waiting.length > 0 && (
              <section aria-labelledby="queue-waiting">
                {upNext && (
                  <h3 id="queue-waiting" className="queue-section-title">
                    Waiting for a full group · {waiting.length}
                  </h3>
                )}
                <ol aria-label={upNext ? undefined : 'Waiting players in call order'} className="divide-y pr-3">
                  {waiting.map((player, i) => (
                    <QueueRow key={player.id} player={player} position={firstWaiting + i + 1} tierLabel={tierLabel(player.tierId)} now={now} onRemove={onRemove} onBreak={(id) => onSetBreak(id, true)} />
                  ))}
                </ol>
              </section>
            )}
            {onBreak.length > 0 && <OnBreakList players={onBreak} now={now} onBack={(id) => onSetBreak(id, false)} />}
            {awaitingCheckIn.length > 0 && (
              <AwaitingCheckInList sport={sport} players={awaitingCheckIn} onCheckIn={onCheckIn} onRemove={onRemove} />
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
