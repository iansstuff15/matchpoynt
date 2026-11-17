import type { PersonProfileView } from '@matchpoynt/shared'
import { Building2 } from 'lucide-react'
import { Link } from 'react-router'
import ClubAvatar from '@/components/club/ClubAvatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** The clubs someone is a member of, each opening the club's page for players (while the directory is on). */
export default function PersonClubsCard({ person, linked }: { person: PersonProfileView; linked: boolean }) {
  return (
    <Card aria-labelledby="person-clubs-title">
      <CardHeader>
        <CardTitle id="person-clubs-title" className="flex items-center gap-2 font-display">
          <Building2 className="size-5" aria-hidden />
          Clubs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {person.clubs.length ? (
          <ul className="grid gap-2" aria-label={`@${person.username}'s clubs`}>
            {person.clubs.map((club) => {
              const body = (
                <>
                  <ClubAvatar name={club.name} url={club.avatarUrl} position={club.avatarPosition} className="size-10" />
                  <span className="grid min-w-0">
                    <span className="truncate text-sm font-medium">{club.name}</span>
                    <span className="truncate text-xs text-muted-foreground">@{club.handle}</span>
                  </span>
                </>
              )
              return (
                <li key={club.id}>
                  {linked ? (
                    <Link to={`/c/${club.handle}`} className="flex items-center gap-3 rounded-lg p-1 hover:bg-muted" aria-label={`Open ${club.name}`}>
                      {body}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-3 p-1">{body}</span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Not a member of any club yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
