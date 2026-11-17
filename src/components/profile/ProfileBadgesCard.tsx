import type { ProfilePageView } from '@matchpoynt/shared'
import { Award } from 'lucide-react'
import ClubBadgeIcon from '@/components/club/badges/ClubBadgeIcon'
import LeaderboardBadgeChip from '@/components/leaderboard/LeaderboardBadgeChip'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** The badges they've earned: their clubs' own badges and the leaderboard's, each with how many times. */
export default function ProfileBadgesCard({ page }: { page: ProfilePageView }) {
  const empty = page.clubBadges.length === 0 && page.leaderboardBadges.length === 0
  return (
    <Card aria-labelledby="profile-badges-title">
      <CardHeader>
        <CardTitle id="profile-badges-title" className="flex items-center gap-2 font-display">
          <Award className="size-5" aria-hidden />
          Badges
        </CardTitle>
        <CardDescription>Earned on your clubs' leaderboards.</CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <Link to="/record/badges">
              <Award />
              Your collection
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        {empty && <p className="text-sm text-muted-foreground">No badges yet. Play in your clubs' sessions to earn them.</p>}
        {page.clubBadges.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2" aria-label="Club badges">
            {page.clubBadges.map((b) => (
              <li key={`${b.clubId}:${b.badge.id}`} className="flex items-center gap-3 rounded-lg border p-2" title={b.badge.summary}>
                <ClubBadgeIcon url={b.badge.iconUrl} name={b.badge.name} className="size-10" />
                <span className="grid min-w-0">
                  <span className="truncate text-sm font-medium">
                    {b.badge.name}
                    {b.times > 1 && <span className="text-muted-foreground"> ×{b.times}</span>}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{b.clubName}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {page.leaderboardBadges.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Leaderboard badges">
            {page.leaderboardBadges.map((b) => (
              <li key={b.id} className="flex items-center gap-1">
                <LeaderboardBadgeChip id={b.id} />
                <span className="text-xs text-muted-foreground tabular-nums">×{b.times}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
