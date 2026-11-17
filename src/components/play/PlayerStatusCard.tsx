import type { ClubBadgeView, PlayerLiveMe } from '@matchpoynt/shared'
import PlayerBadges from '@/components/play/PlayerBadges'
import { Coffee, Hourglass, ListOrdered, LoaderCircle, MapPinCheck, Undo2, Medal, Swords, Target, Trophy, Wallet } from 'lucide-react'
import PlayerNextMatch from '@/components/play/PlayerNextMatch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { board } from '@/config/board'
import { playerStatusLabels } from '@/config/play'
import { cn } from '@/utils/cn'
import { formatElapsed } from '@/utils/time/formatElapsed'

interface PlayerStatusCardProps {
  me: PlayerLiveMe
  /** The club's own badges they hold. */
  clubBadges: ClubBadgeView[]
  /** The page's clock, already set to the API's time. */
  now: number
  /** Checks them in from the app; shown while they can (`me.canCheckIn`). */
  onCheckIn?: () => void
  checkingIn?: boolean
  /** Starts (`true`) or ends their break; the button follows `me.breakSince` and `me.breakBlockedReason`. */
  onSetBreak?: (onBreak: boolean) => void
  settingBreak?: boolean
}

/**
 * Where the viewer stands: the API's one-line status, checking in from the app
 * while they can, their next match and when it should start, their wait so
 * far, their place in the queue and on the leaderboard, their record and points,
 * and the fee so far. Every figure is the API's.
 */
export default function PlayerStatusCard({ me, clubBadges, now, onCheckIn, checkingIn = false, onSetBreak, settingBreak = false }: PlayerStatusCardProps) {
  const waited = me.waitingSince ? Math.max(0, now - Date.parse(me.waitingSince)) : null
  const long = waited !== null && waited >= board.longWaitMs
  return (
    <Card data-play-reveal aria-labelledby="play-status-title" className="border-primary/40">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle id="play-status-title" role="heading" aria-level={2} className="font-display text-xl">
            {/* Rises in again whenever their status changes. */}
            <span key={me.headline} className="inline-block animate-fade-up">
              {me.headline}
            </span>
          </CardTitle>
          <Badge variant={me.status === 'playing' || me.status === 'up_next' ? 'default' : 'secondary'}>{playerStatusLabels[me.status]}</Badge>
        </div>
        <CardDescription>Playing as {me.name}. This page refreshes on its own.</CardDescription>
        <PlayerBadges me={me} clubBadges={clubBadges} className="pt-1" />
      </CardHeader>
      <CardContent className="grid gap-4">
        {me.canCheckIn && onCheckIn && (
          <Button size="lg" className="justify-self-start" onClick={onCheckIn} disabled={checkingIn}>
            {checkingIn ? <LoaderCircle className="animate-spin" /> : <MapPinCheck />}
            I'm here: check me in
          </Button>
        )}
        {onSetBreak && me.breakSince && (
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => onSetBreak(false)} disabled={settingBreak}>
              {settingBreak ? <LoaderCircle className="animate-spin" /> : <Undo2 />}
              I'm back: put me in the queue
            </Button>
            <span className="text-sm text-muted-foreground">On a break for {formatElapsed(Math.max(0, now - Date.parse(me.breakSince)))}</span>
          </div>
        )}
        {onSetBreak && !me.breakSince && me.status !== 'checking_in' && (
          <div className="grid justify-items-start gap-1">
            <Button variant="outline" onClick={() => onSetBreak(true)} disabled={settingBreak || me.breakBlockedReason !== null} title={me.breakBlockedReason ?? undefined}>
              {settingBreak ? <LoaderCircle className="animate-spin" /> : <Coffee />}
              Take a break
            </Button>
            <p className="text-xs text-muted-foreground">{me.breakBlockedReason ?? "You'll sit out the queue until you're back."}</p>
          </div>
        )}
        {me.nextMatch && <PlayerNextMatch next={me.nextMatch} startsAt={me.estimatedStartAt} now={now} />}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="play-stat">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Hourglass className="size-3.5" aria-hidden />
              Waiting
            </dt>
            <dd className={cn('play-stat-value', long && 'text-warning-foreground')} title={long ? "You've waited a long time for a game" : undefined}>
              {waited === null ? '—' : formatElapsed(waited)}
            </dd>
          </div>
          <div className="play-stat">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ListOrdered className="size-3.5" aria-hidden />
              In the queue
            </dt>
            <dd className="play-stat-value">
              {me.queuePosition === null ? (
                '—'
              ) : (
                <>
                  #<span data-count={me.queuePosition}>{me.queuePosition}</span>
                </>
              )}
            </dd>
          </div>
          <div className="play-stat">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Swords className="size-3.5" aria-hidden />
              Matches ahead
            </dt>
            <dd className="play-stat-value">{me.matchesAhead === null ? '—' : <span data-count={me.matchesAhead}>{me.matchesAhead}</span>}</dd>
          </div>
          <div className="play-stat">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Trophy className="size-3.5" aria-hidden />
              Played · W–L
            </dt>
            <dd className="play-stat-value">
              <span data-count={me.gamesPlayed}>{me.gamesPlayed}</span> · <span data-count={me.wins}>{me.wins}</span>–<span data-count={me.losses}>{me.losses}</span>
            </dd>
          </div>
          <div className="play-stat">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Medal className="size-3.5" aria-hidden />
              Leaderboard
            </dt>
            <dd className="play-stat-value">
              {me.rank === null ? (
                '—'
              ) : (
                <>
                  #<span data-count={me.rank}>{me.rank}</span>
                  <span className="text-base font-medium text-muted-foreground"> of {me.ranked}</span>
                </>
              )}
            </dd>
          </div>
          <div className="play-stat">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Target className="size-3.5" aria-hidden />
              Points for–against
            </dt>
            <dd className="play-stat-value">
              <span data-count={me.pointsFor}>{me.pointsFor}</span>–<span data-count={me.pointsAgainst}>{me.pointsAgainst}</span>
            </dd>
          </div>
          {me.fee && (
            <div className="play-stat col-span-2" title={me.fee.breakdown}>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet className="size-3.5" aria-hidden />
                Fee so far
              </dt>
              <dd className="play-stat-value">{me.fee.text}</dd>
              <dd className="text-xs text-muted-foreground">{me.fee.breakdown}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}
