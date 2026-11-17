import { Medal } from 'lucide-react'
import ClubBadgeChip from '@/components/leaderboard/ClubBadgeChip'
import LeaderboardBadgeChip from '@/components/leaderboard/LeaderboardBadgeChip'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePlayerLeaderboard } from '@/utils/hooks/usePlayerLive'

/** The player's own result on the session's final leaderboard: place, record and the badges they earned (the club's own first). */
export default function PlayerResultCard({ sessionId }: { sessionId: string }) {
  const board = usePlayerLeaderboard(sessionId)
  const view = board.data
  const me = view?.entries.find((e) => e.playerId === view.viewerPlayerId)
  if (!view || !me) return null
  const clubBadges = view.clubBadges.filter((b) => me.clubBadges.includes(b.id))
  const earned = clubBadges.length + me.badges.length
  return (
    <Card data-play-reveal aria-labelledby="player-result-title">
      <CardHeader>
        <CardTitle className="font-display">
          <h2 id="player-result-title" className="flex items-center gap-2 text-lg">
            <Medal className="size-5" aria-hidden />
            Your result
          </h2>
        </CardTitle>
        <CardDescription className="tabular-nums">
          #{me.rank} of {view.entries.length} · {me.wins}–{me.losses} · {me.played} played
        </CardDescription>
      </CardHeader>
      <CardContent>
        {earned ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Badges you earned">
            {clubBadges.map((b) => (
              <li key={b.id}>
                <ClubBadgeChip badge={b} />
              </li>
            ))}
            {me.badges.map((id) => (
              <li key={id}>
                <LeaderboardBadgeChip id={id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No badges this time.</p>
        )}
      </CardContent>
    </Card>
  )
}
