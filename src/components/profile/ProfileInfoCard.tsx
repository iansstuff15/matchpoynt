import type { ProfilePageView } from '@matchpoynt/shared'
import { Settings, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import SocialLinksList from '@/components/social/SocialLinksList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { accountRoleOptions } from '@/config/signUp'
import { sports } from '@/config/sports'

const none = <span className="text-muted-foreground">Not set</span>

/** Everything on the profile, read only: names, @username, contact, role, sports and links. Editing is in the settings. */
export default function ProfileInfoCard({ page, onEdit }: { page: ProfilePageView; onEdit: () => void }) {
  const { profile } = page
  const rows: { term: string; value: ReactNode }[] = [
    { term: 'Name', value: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || none },
    { term: 'Username', value: profile.username ? `@${profile.username}` : none },
    { term: 'Email', value: page.email ?? none },
    { term: 'Phone', value: profile.phone ?? none },
    { term: 'City', value: profile.city ?? none },
    { term: 'Uses Matchpoynt', value: accountRoleOptions.find((r) => r.id === profile.role)?.label ?? none },
    {
      term: 'Sports',
      value: profile.sports.length ? (
        <span className="flex flex-wrap gap-1">
          {profile.sports.map((s) => {
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
    { term: 'Social links', value: <SocialLinksList links={page.socialLinks} label="Your links" /> },
  ]
  return (
    <Card aria-labelledby="profile-info-title">
      <CardHeader>
        <CardTitle id="profile-info-title" className="flex items-center gap-2 font-display">
          <UserRound className="size-5" aria-hidden />
          About you
        </CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Settings />
            Edit settings
          </Button>
        </CardAction>
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
