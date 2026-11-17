import type { PlayerLiveFriend } from '@matchpoynt/shared'
import { UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const statusLabel: Record<PlayerLiveFriend['status'], string> = { playing: 'On court', waiting: 'Waiting', checking_in: 'Not checked in' }

/** The viewer's friends on tonight's roster, and where each of them is. */
export default function PlayerFriendsHereCard({ friends }: { friends: PlayerLiveFriend[] }) {
  return (
    <Card data-play-reveal aria-labelledby="play-friends-title">
      <CardHeader>
        <CardTitle className="font-display">
          <h2 id="play-friends-title" className="flex items-center gap-2">
            <UsersRound className="size-5" aria-hidden />
            Friends here
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2" aria-label="Your friends in this session">
          {friends.map((f) => (
            <li key={f.name} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium">{f.name}</span>
              <Badge variant={f.status === 'playing' ? 'default' : 'secondary'}>{statusLabel[f.status]}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
