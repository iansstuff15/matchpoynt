import type { ProfileRecordView } from '@matchpoynt/shared'
import { ArrowUpRight, CalendarDays, History } from 'lucide-react'
import { Link } from 'react-router'
import ClubBadgeChip from '@/components/leaderboard/ClubBadgeChip'
import LeaderboardBadgeChip from '@/components/leaderboard/LeaderboardBadgeChip'
import PlayerShareButton from '@/components/leaderboard/share/PlayerShareButton'
import SportTag from '@/components/record/SportTag'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { sports } from '@/config/sports'
import { useFeatures } from '@/utils/hooks/useFeatures'
import { formatWhen } from '@/utils/time/formatWhen'

/** Their session history, newest first: where, their place, W–L, the badges they earned there; each opens its page (leaderboard, badges, payment and feedback), its games, or shares its result images. */
export default function RecordSessionsCard({ record, onGames }: { record: ProfileRecordView; onGames: (sessionId: string) => void }) {
  const { web } = useFeatures()
  // Each session's page (its final leaderboard, your badges, payment and the feedback form) is the players' session view.
  const sessionPages = web.clubs && web.clubDirectory && web.playerView
  return (
    <Card aria-labelledby="record-sessions-title">
      <CardHeader>
        <CardTitle className="font-display">
          <h2 id="record-sessions-title" className="flex items-center gap-2">
            <CalendarDays className="size-5" aria-hidden />
            Sessions
          </h2>
        </CardTitle>
        <CardDescription>Every club session you played in, with your place on its final leaderboard.</CardDescription>
      </CardHeader>
      <CardContent>
        {record.sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
        ) : (
          <ul className="grid gap-2" aria-label="Your sessions">
            {record.sessions.map((s) => (
              <li key={s.sessionId} className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <span className="grid min-w-0 gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{s.sessionLabel}</span>
                    <SportTag sportId={s.sportId} />
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {s.clubName} · {formatWhen(s.endedAt)} · {s.rank ? `#${s.rank} of ${s.ranked}` : 'Not ranked'} · {s.wins}–{s.losses}
                  </span>
                  {(s.clubBadges.length > 0 || s.leaderboardBadges.length > 0) && (
                    <span className="flex flex-wrap gap-1.5" aria-label={`Badges earned in ${s.sessionLabel}`}>
                      {s.clubBadges.map((b) => (
                        <ClubBadgeChip key={b.id} badge={b} />
                      ))}
                      {s.leaderboardBadges.map((id) => (
                        <LeaderboardBadgeChip key={id} id={id} />
                      ))}
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap gap-2">
                  {sessionPages && (
                    <Button asChild size="sm">
                      <Link to={`/play/${s.sessionId}`} aria-label={`Open ${s.sessionLabel}: leaderboard, badges, payment and feedback`}>
                        <ArrowUpRight />
                        Open
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => onGames(s.sessionId)} aria-label={`Games in ${s.sessionLabel}`}>
                    <History />
                    {s.played} {s.played === 1 ? 'game' : 'games'}
                  </Button>
                  {s.entry && (
                    <PlayerShareButton
                      labelled
                      ariaLabel={`Share your results from ${s.sessionLabel}`}
                      entry={s.entry}
                      sport={sports[s.sportId]}
                      shareUrl={null}
                      clubBadges={s.clubBadges}
                      club={s.club}
                    />
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
