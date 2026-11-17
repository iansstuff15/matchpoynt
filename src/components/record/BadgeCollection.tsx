import type { ProfileRecordView } from '@matchpoynt/shared'
import { Award } from 'lucide-react'
import ClubBadgeIcon from '@/components/club/badges/ClubBadgeIcon'
import CollectedBadge from '@/components/record/CollectedBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { leaderboardBadges } from '@/config/leaderboard'
import { cn } from '@/utils/cn'

/** Every badge they've earned: the leaderboard's own across all clubs, then each club's badges under its name. */
export default function BadgeCollection({ record }: { record: ProfileRecordView }) {
  const { clubBadges, leaderboardBadges: board } = record.collection
  const clubs = [...new Map(clubBadges.map((b) => [b.clubId, b.clubName])).entries()]
  const total = clubBadges.reduce((n, b) => n + b.times, 0) + board.reduce((n, b) => n + b.times, 0)

  return (
    <Card aria-labelledby="record-badges-title">
      <CardHeader>
        <CardTitle className="font-display">
          <h2 id="record-badges-title" className="flex items-center gap-2">
            <Award className="size-5" aria-hidden />
            Badge collection
          </h2>
        </CardTitle>
        <CardDescription>
          {total === 0 ? 'Earned on your clubs’ leaderboards.' : `${total} earned across ${clubBadges.length + board.length} different badges, on your clubs’ leaderboards.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {total === 0 && <p className="text-sm text-muted-foreground">No badges yet. Play in your clubs' sessions to start your collection.</p>}
        {board.length > 0 && (
          <section aria-labelledby="collection-board-title" className="grid gap-3">
            <h3 id="collection-board-title" className="text-sm font-semibold">
              Leaderboard badges
            </h3>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {board.map((b) => {
                const { label, icon: Icon, tone } = leaderboardBadges[b.id]
                return (
                  <CollectedBadge
                    key={b.id}
                    icon={
                      <span className={cn('grid size-10 shrink-0 place-items-center rounded-full border', tone)}>
                        <Icon className="size-6" aria-hidden />
                      </span>
                    }
                    name={label}
                    detail="Matchpoynt leaderboard badge"
                    times={b.times}
                    sportIds={b.sportIds}
                    earnedIn={b.earnedIn}
                    lastEarnedAt={b.lastEarnedAt}
                  />
                )
              })}
            </ul>
          </section>
        )}
        {clubs.map(([clubId, clubName]) => (
          <section key={clubId} aria-label={`${clubName} badges`} className="grid gap-3">
            <h3 className="text-sm font-semibold">{clubName}</h3>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {clubBadges
                .filter((b) => b.clubId === clubId)
                .map((b) => (
                  <CollectedBadge
                    key={b.badge.id}
                    icon={<ClubBadgeIcon url={b.badge.iconUrl} name={b.badge.name} className="size-10" />}
                    name={b.badge.name}
                    detail={b.badge.summary || clubName}
                    times={b.times}
                    sportIds={b.sportIds}
                    earnedIn={b.earnedIn}
                    lastEarnedAt={b.lastEarnedAt}
                    career={b.badge.scope === 'career'}
                  />
                ))}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}
