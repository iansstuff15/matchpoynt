import type { ClubBadgeView, LeaderboardClub, LeaderboardEntry } from '@matchpoynt/shared'
import { Crown, Flame, Trophy } from 'lucide-react'
import HotStreakTag from '@/components/leaderboard/HotStreakTag'
import ClubBadgeChip from '@/components/leaderboard/ClubBadgeChip'
import LeaderboardBadgeChip from '@/components/leaderboard/LeaderboardBadgeChip'
import MovementTag from '@/components/leaderboard/MovementTag'
import PlayerShareButton from '@/components/leaderboard/share/PlayerShareButton'
import PlayerAvatar from '@/components/leaderboard/PlayerAvatar'
import { Badge } from '@/components/ui/badge'
import { hotStreakBadge, podiumBadgeLimit, podiumBars, podiumMedals } from '@/config/leaderboard'
import type { Sport } from '@/interfaces/Sport'
import { cn } from '@/utils/cn'

interface PodiumSpotProps {
  sport: Sport
  place: 1 | 2 | 3
  entry: LeaderboardEntry | undefined
  /** The public leaderboard's address, for share images; `null` when not published. */
  shareUrl: string | null
  /** The club's own badges, to show the ones this player earned. */
  clubBadges: ClubBadgeView[]
  /** The viewer's own entry: only it gets a Share button. */
  viewerPlayerId: string | null
  /** The club that runs the session, for the share images. */
  club: LeaderboardClub | null
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))

/** One podium place: the player's card standing on a bar whose height shows the place. */
export default function PodiumSpot({ sport, place, entry, shareUrl, clubBadges, viewerPlayerId, club }: PodiumSpotProps) {
  const hot = Boolean(entry?.badges.includes(hotStreakBadge))
  const chips = entry?.badges.filter((b) => b !== hotStreakBadge) ?? []
  const own = clubBadges.filter((b) => entry?.clubBadges.includes(b.id))
  const extra = chips.length + own.length - podiumBadgeLimit
  const medal = podiumMedals[place]
  return (
    <li className="flex min-w-0 flex-col justify-end" aria-label={entry ? `Place ${place}: ${entry.name}` : `Place ${place}: no one yet`}>
      {entry ? (
        <article data-podium-card data-flip-id={entry.playerId} className="grid min-w-0 gap-2 rounded-2xl border bg-card p-2.5 shadow-sm sm:gap-3 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-1">
            <span className="relative">
              <Crown
                className={cn('absolute -top-4 left-1/2 size-5 -translate-x-1/2 -rotate-6 drop-shadow-sm sm:-top-5 sm:size-6', medal.crown)}
                aria-label={`${medal.label} crown`}
              />
              <PlayerAvatar name={entry.name} place={place} size="lg" />
            </span>
            <span className="flex items-center gap-1">
              <p className="flex items-center gap-1 font-display text-lg font-bold tabular-nums sm:text-2xl" aria-label={`${entry.wins} wins`}>
                <Trophy className="size-4 text-primary sm:size-5" aria-hidden />
                <span data-count={entry.wins}>{entry.wins}</span>
              </p>
              {entry.playerId === viewerPlayerId && <PlayerShareButton entry={entry} sport={sport} shareUrl={shareUrl} clubBadges={own} club={club} />}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold sm:text-lg">
              <span className="truncate" title={entry.name}>
                {entry.name}
              </span>
              <MovementTag movement={entry.movement} />
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground sm:text-sm">
              <span>
                {entry.wins}–{entry.losses} · {signed(entry.pointsFor - entry.pointsAgainst)}
                <span className="hidden sm:inline"> {sport.terminology.scoreUnit}s</span>
              </span>
              {entry.streak > 0 && !hot && (
                <span className="hidden items-center gap-0.5 sm:inline-flex">
                  <Flame className="size-3.5 text-warning" aria-hidden />
                  {entry.streak} in a row
                </span>
              )}
            </p>
          </div>
          {hot && (
            <div>
              <HotStreakTag streak={entry.streak} />
            </div>
          )}
          {chips.length + own.length > 0 && (
            <div className="hidden flex-wrap gap-1.5 sm:flex">
              {/* The club's own badges first: the club set them up for its players. */}
              {own.slice(0, podiumBadgeLimit).map((b) => (
                <ClubBadgeChip key={b.id} badge={b} />
              ))}
              {chips.slice(0, Math.max(0, podiumBadgeLimit - own.length)).map((b) => (
                <LeaderboardBadgeChip key={b} id={b} />
              ))}
              {extra > 0 && <Badge variant="outline">+{extra}</Badge>}
            </div>
          )}
        </article>
      ) : (
        <div className="grid place-items-center rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No one yet</div>
      )}
      <div
        data-podium-bar
        aria-hidden
        className={cn(
          'mt-3 flex items-start justify-center rounded-t-2xl border-t-4 pt-3 font-display text-3xl font-bold text-court-foreground/80',
          medal.bar,
          place === 1 ? 'bg-court' : 'bg-court/70',
          podiumBars[place],
        )}
      >
        {place}
      </div>
    </li>
  )
}
