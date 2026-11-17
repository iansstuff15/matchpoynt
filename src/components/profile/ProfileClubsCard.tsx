import type { ProfileClubView } from '@matchpoynt/shared'
import { Building2 } from 'lucide-react'
import ClubAvatar from '@/components/club/ClubAvatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** The clubs they've joined (by accepting an invite), with the name they have on each roster. */
export default function ProfileClubsCard({ clubs }: { clubs: ProfileClubView[] }) {
  return (
    <Card aria-labelledby="profile-clubs-title">
      <CardHeader>
        <CardTitle id="profile-clubs-title" className="flex items-center gap-2 font-display">
          <Building2 className="size-5" aria-hidden />
          Clubs
        </CardTitle>
        <CardDescription>Clubs you've joined from an invite. Your games are found by your name on each roster.</CardDescription>
      </CardHeader>
      <CardContent>
        {clubs.length ? (
          <ul className="grid gap-2" aria-label="Your clubs">
            {clubs.map((club) => (
              <li key={club.id} className="flex items-center gap-3">
                <ClubAvatar name={club.name} url={club.avatarUrl} position={club.avatarPosition} className="size-10" />
                <span className="grid min-w-0">
                  <span className="truncate text-sm font-medium">
                    {club.name}
                    {club.handle && <span className="font-normal text-muted-foreground"> @{club.handle}</span>}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">On the roster as {club.memberName}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">You haven't joined a club yet. A club can invite you by email.</p>
        )}
      </CardContent>
    </Card>
  )
}
