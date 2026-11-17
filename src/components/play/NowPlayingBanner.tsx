import type { ClubBadgeView, PlayerLiveCourt, PlayerLiveMe } from '@matchpoynt/shared'
import PlayerBadges from '@/components/play/PlayerBadges'
import { Fragment, useRef } from 'react'
import { nowPlayingEntrance } from '@/animations/playMotion'
import { useMotion } from '@/animations/useMotion'
import MatchTimer from '@/components/session/MatchTimer'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'

interface NowPlayingBannerProps {
  /** The court the viewer is playing on. */
  court: PlayerLiveCourt
  /** The viewer, for the badges they've earned in this session. */
  me: PlayerLiveMe
  /** The club's own badges they hold, drawn after the leaderboard's. */
  clubBadges: ClubBadgeView[]
  now: number
}

/**
 * Shown while the viewer is on court: "You are now playing", the court and
 * how long the match has run, then the two sides with "vs" between, laid out
 * like the session board's court cards: "Your side" and "Opponent side",
 * with the leaderboard badges they've earned in this session.
 */
export default function NowPlayingBanner({ court, me, clubBadges, now }: NowPlayingBannerProps) {
  // The sides slide in from either side and meet, "vs" landing between them.
  const ref = useRef<HTMLElement>(null)
  useMotion(ref, nowPlayingEntrance)
  // From the viewer's point of view: their side, and the side they're playing against.
  const sideLabel = (side: 0 | 1) => (court.mySide === null ? `Side ${side + 1}` : court.mySide === side ? 'Your side' : 'Opponent side')
  return (
    <section ref={ref} data-play-reveal aria-labelledby="play-now-title" className="play-now">
      <h2 id="play-now-title" data-np-title className="play-now-title">
        You are now playing
      </h2>
      <div data-np-rest className="flex flex-wrap items-center justify-center gap-2">
        <Badge className="text-sm">{court.label}</Badge>
        {court.startedAt && <MatchTimer startedAt={court.startedAt} now={now} />}
      </div>
      <PlayerBadges me={me} clubBadges={clubBadges} className="justify-center" rest />
      <div className="court-matchup play-now-matchup">
        {([0, 1] as const).map((side) => (
          <Fragment key={side}>
            {side === 1 && (
              <span data-np-vs className="court-vs" aria-hidden>
                vs
              </span>
            )}
            <div data-np-side={court.mySide === null ? undefined : court.mySide === side ? 'mine' : 'them'} className={cn('court-side', court.mySide === side && 'play-mine')}>
              <p className="court-side-label">{sideLabel(side)}</p>
              <ul className="player-name-list gap-1.5" aria-label={`${court.label}, ${sideLabel(side).toLowerCase()}`}>
                {court.sides[side].map((name, i) => (
                  <li key={`${name}-${i}`} className="court-player" title={name}>
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  )
}
