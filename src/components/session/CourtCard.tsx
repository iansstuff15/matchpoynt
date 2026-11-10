import type { CourtView } from '@matchpoynt/shared'
import { CircleX, Flag, LoaderCircle, Play, RotateCcw, Trash2, Trophy } from 'lucide-react'
import { Fragment } from 'react'
import CourtSideDrop from '@/components/session/dnd/CourtSideDrop'
import MatchCountdown from '@/components/session/MatchCountdown'
import MatchTimer from '@/components/session/MatchTimer'
import CourtTournamentSwitch from '@/components/tournament/CourtTournamentSwitch'
import { Badge } from '@/components/ui/badge'
import ConfirmButton from '@/components/common/ConfirmButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { board } from '@/config/board'
import { cn } from '@/utils/cn'
import { useNow } from '@/utils/hooks/useNow'

interface CourtCardProps {
  court: CourtView
  perSide: number
  automatic: boolean
  starting: boolean
  /** Device clock correction from the API (see utils/time/clockOffset). */
  clockOffsetMs: number
  /** Show the tournament switch (FEATURE_WEB_TOURNAMENTS). */
  tournamentsOn: boolean
  switchingTournament: boolean
  onTournamentChange: (on: boolean) => void
  onStart: () => void
  onFinish: () => void
  /** Replays the match on court from 0:00, after a confirm. */
  onRestart: () => void
  restarting: boolean
  /** Cancels the match on court (no result, players back to the queue), after a confirm. */
  onCancel: () => void
  cancelling: boolean
  /** Removes the court (open courts only), after a confirm. */
  onRemove: () => void
  removing: boolean
  onUnassign: (playerId: string) => void
}

/** A court as a card: who's playing on each side, or who's been placed for the next match. Open courts take dragged players. */
export default function CourtCard({
  court,
  perSide,
  automatic,
  starting,
  clockOffsetMs,
  tournamentsOn,
  switchingTournament,
  onTournamentChange,
  onStart,
  onFinish,
  onRestart,
  restarting,
  onCancel,
  cancelling,
  onRemove,
  removing,
  onUnassign,
}: CourtCardProps) {
  const playing = court.status === 'playing'
  // One clock per playing court; open courts don't tick.
  const now = useNow(playing, board.timerTickMs, clockOffsetMs)
  const placed = court.lineup[0].length + court.lineup[1].length
  const tournament = court.tournament
  const due = court.tournamentMatch
  const startLabel = tournament
    ? `Start ${due?.label ?? 'tournament match'}`
    : !automatic || court.openSlots === 0
      ? 'Start match'
      : placed > 0
        ? `Start · fill ${court.openSlots} from queue`
        : 'Start next match'

  return (
    <Card className={cn('court-card gap-4', playing && 'border-primary/40')}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <CardTitle className="font-display">{court.label}</CardTitle>
          {tournamentsOn && (
            <CourtTournamentSwitch courtLabel={court.label} on={tournament} disabled={playing || switchingTournament} onChange={onTournamentChange} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {playing && court.startedAt && <MatchTimer startedAt={court.startedAt} now={now} />}
          <Badge variant={playing ? 'default' : 'outline'}>
            {playing && <span className="size-2 animate-court-pulse rounded-full bg-highlight" aria-hidden />}
            {playing ? 'Playing' : 'Open'}
          </Badge>
          {!playing && (
            <ConfirmButton
              iconOnly
              variant="ghost"
              label={`Remove ${court.label}`}
              icon={Trash2}
              title={`Remove ${court.label}?`}
              description="The court leaves this session. Players placed on it go back to the queue; past results keep its name."
              confirmLabel="Remove court"
              blockedReason={court.removeBlockedReason}
              pending={removing}
              onConfirm={onRemove}
            />
          )}
        </div>
      </CardHeader>
      {/* Takes the card's spare height and centres the matchup in it; the footer stays at the bottom. */}
      <CardContent className="court-body">
        {tournament && (
          <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Trophy className="size-3.5" aria-hidden />
            {due ? due.label : 'Tournament court'}
          </p>
        )}
        <div className="court-matchup">
          {([0, 1] as const).map((side) => (
            <Fragment key={side}>
              {side === 1 && (
                <span className="court-vs" aria-hidden>
                  vs
                </span>
              )}
              {playing || tournament ? (
                <div className="court-side">
                  <p className="court-side-label">Side {side + 1}</p>
                  <ul className="player-name-list gap-1.5" aria-label={`${court.label}, side ${side + 1}`}>
                    {playing ? (
                      court.sides[side].map((p) => (
                        <li key={p.id} className="court-player" title={p.name}>
                          {p.name}
                        </li>
                      ))
                    ) : (
                      // An open tournament court previews the match the bracket sends it next.
                      <li className="court-player" title={due?.sides[side]}>
                        {due?.sides[side] ?? '—'}
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <CourtSideDrop
                  courtId={court.id}
                  courtLabel={court.label}
                  side={side}
                  players={court.lineup[side]}
                  perSide={perSide}
                  onRemove={onUnassign}
                />
              )}
            </Fragment>
          ))}
        </div>
      </CardContent>
      <CardFooter className="grid gap-2">
        {playing ? (
          <>
            <div className="court-footer-slot court-timer">
              {court.startedAt && court.endsAt && (
                <MatchCountdown courtLabel={court.label} startedAt={court.startedAt} endsAt={court.endsAt} now={now} />
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onFinish}>
                <Flag />
                Finish match
              </Button>
              <ConfirmButton
                iconOnly
                variant="outline"
                label={`Restart the match on ${court.label}`}
                icon={RotateCcw}
                title={`Restart the match on ${court.label}?`}
                description="Same players on the same sides. The clock starts again from 0:00, the score goes back to 0–0, and nothing is recorded."
                confirmLabel="Restart match"
                pending={restarting}
                onConfirm={onRestart}
              />
              <ConfirmButton
                iconOnly
                variant="outline"
                label={`Cancel the match on ${court.label}`}
                icon={CircleX}
                title={`Cancel the match on ${court.label}?`}
                description="No result is recorded. The players go back to the queue where they were, and the court opens."
                confirmLabel="Cancel match"
                cancelLabel="Keep playing"
                pending={cancelling}
                onConfirm={onCancel}
              />
            </div>
          </>
        ) : (
          <>
            <Button className="w-full" onClick={onStart} disabled={!court.canStart || starting}>
              {starting ? <LoaderCircle className="animate-spin" /> : <Play />}
              {startLabel}
            </Button>
            <p className="court-footer-slot court-reason" title={court.startBlockedReason ?? undefined}>
              {court.startBlockedReason}
            </p>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
