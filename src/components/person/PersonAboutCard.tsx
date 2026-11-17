import type { PersonProfileView } from '@matchpoynt/shared'
import { UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import SocialLinksList from '@/components/social/SocialLinksList'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { accountRoleOptions } from '@/config/signUp'
import { sports } from '@/config/sports'

const none = <span className="text-muted-foreground">Not shared</span>

/** What someone shows on their profile: how they use Matchpoynt, their sports and tiers, and their links. */
export default function PersonAboutCard({ person }: { person: PersonProfileView }) {
  const rows: { term: string; value: ReactNode }[] = [
    { term: 'Uses Matchpoynt', value: accountRoleOptions.find((r) => r.id === person.role)?.label ?? none },
    {
      term: 'Sports',
      value: person.sports.length ? (
        <span className="flex flex-wrap gap-1">
          {person.sports.map((s) => {
            const sport = sports[s.sportId]
            const Icon = sport.icon
            return (
              <Badge key={s.sportId} variant="outline" className="gap-1">
                <Icon aria-hidden />
                {sport.name} · {sport.tiers.find((t) => t.id === s.tierId)?.label ?? s.tierId}
              </Badge>
            )
          })}
        </span>
      ) : (
        none
      ),
    },
    { term: 'Social links', value: person.socialLinks.length ? <SocialLinksList links={person.socialLinks} label={`@${person.username}'s links`} /> : none },
  ]
  return (
    <Card aria-labelledby="person-about-title">
      <CardHeader>
        <CardTitle id="person-about-title" className="flex items-center gap-2 font-display">
          <UserRound className="size-5" aria-hidden />
          About
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
          {rows.map((row) => (
            <div key={row.term} className="contents">
              <dt className="text-muted-foreground">{row.term}</dt>
              <dd className="min-w-0 break-words">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
