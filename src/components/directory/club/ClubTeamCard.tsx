import { clubMemberRoles, type ClubMemberRole, type ClubTeamMember } from '@matchpoynt/shared'
import { ShieldCheck } from 'lucide-react'
import ClubAvatar from '@/components/club/ClubAvatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ClubTeamCardProps {
  team: ClubTeamMember[]
  /** The viewer's own role, once they're a member. */
  myRole: ClubMemberRole | null
}

/** The club's team: its captains, coaches, Queue Masters and managers, as the owner named them. */
export default function ClubTeamCard({ team, myRole }: ClubTeamCardProps) {
  return (
    <Card aria-labelledby="player-team-title">
      <CardHeader>
        <CardTitle id="player-team-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <ShieldCheck className="size-5" aria-hidden />
          Club team
        </CardTitle>
        <CardDescription>
          {myRole && myRole !== 'member' ? `You're one of them: ${clubMemberRoles[myRole].label}. ` : ''}
          The people who help run the club.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2" aria-label="Club team">
          {team.map((m, i) => (
            <li key={`${m.name}-${i}`} className="flex items-center gap-3">
              <ClubAvatar name={m.name} url={m.avatarUrl} className="size-9 text-xs" />
              <span className="grid min-w-0 flex-1">
                <span className="truncate font-medium">{m.name}</span>
                {m.username && <span className="truncate text-xs text-muted-foreground">@{m.username}</span>}
              </span>
              <Badge variant="secondary" title={clubMemberRoles[m.role].description}>
                {clubMemberRoles[m.role].label}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
