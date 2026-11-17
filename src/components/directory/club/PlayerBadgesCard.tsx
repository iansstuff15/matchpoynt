import type { ClubBadgeView } from '@matchpoynt/shared'
import { Award } from 'lucide-react'
import ClubBadgeIcon from '@/components/club/badges/ClubBadgeIcon'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** Badges anyone can earn in the club's sessions, with what each takes. */
export default function PlayerBadgesCard({ badges }: { badges: ClubBadgeView[] }) {
  return (
    <Card aria-labelledby="player-badges-title">
      <CardHeader>
        <CardTitle id="player-badges-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <Award className="size-5" aria-hidden />
          Badges to earn
        </CardTitle>
        <CardDescription>Won on the club's leaderboards.</CardDescription>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">This club has no badges yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" aria-label="Club badges">
            {badges.map((b) => (
              <li key={b.id} className="flex items-start gap-3">
                <ClubBadgeIcon url={b.iconUrl} name={b.name} className="size-10 shrink-0" />
                <span className="grid min-w-0">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.summary}</span>
                  {b.description && <span className="text-xs text-muted-foreground">{b.description}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
