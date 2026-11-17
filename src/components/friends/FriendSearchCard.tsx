import type { FriendSearchResult } from '@matchpoynt/shared'
import { Check, Clock, Search, UserPlus } from 'lucide-react'
import { useId, useState } from 'react'
import PersonRow from '@/components/common/PersonRow'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { useFriendActions } from '@/utils/hooks/useFriends'
import { useFriendSearch } from '@/utils/hooks/useFriends'

interface FriendSearchCardProps {
  actions: ReturnType<typeof useFriendActions>
}

const label = (p: FriendSearchResult) => (p.username ? `@${p.username}` : (p.displayName ?? 'them'))

/** Find people on Matchpoynt (players, members and club owners) by name, email or @username, and add them. */
export default function FriendSearchCard({ actions }: FriendSearchCardProps) {
  const [query, setQuery] = useState('')
  const people = useFriendSearch(query)
  const searchId = useId()
  const { add, answer } = actions
  const searching = query.trim().length >= 2

  const action = (p: FriendSearchResult) => {
    switch (p.status) {
      case 'friends':
        return (
          <Badge variant="secondary" className="gap-1">
            <Check aria-hidden />
            Friends
          </Badge>
        )
      case 'outgoing':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock aria-hidden />
            Asked
          </Badge>
        )
      case 'incoming':
        return (
          <Button size="sm" disabled={answer.isPending} onClick={() => p.friendshipId && answer.mutate({ id: p.friendshipId, name: label(p), accept: true })} aria-label={`Accept ${label(p)}'s friend request`}>
            <Check />
            Accept
          </Button>
        )
      default:
        return (
          <Button size="sm" disabled={add.isPending && add.variables?.userId === p.userId} onClick={() => add.mutate({ userId: p.userId, name: label(p) })} aria-label={`Add ${label(p)} as a friend`}>
            <UserPlus />
            Add friend
          </Button>
        )
    }
  }

  return (
    <Card aria-labelledby="friend-search-title">
      <CardHeader>
        <CardTitle id="friend-search-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <UserPlus className="size-5" aria-hidden />
          Add friends
        </CardTitle>
        <CardDescription>Players, club members and club owners: find them by name, email or @username.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid max-w-md gap-1.5">
          <Label htmlFor={searchId}>Search people</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id={searchId} type="search" className="pl-9" placeholder="Name, email or @username" value={query} autoComplete="off" onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        {searching &&
          (people.isPending ? (
            <ul className="grid gap-2" aria-busy="true" aria-label="Searching">
              {Array.from({ length: 2 }, (_, i) => (
                <li key={i} className="flex items-center gap-2.5 rounded-lg border p-2">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </li>
              ))}
            </ul>
          ) : people.data && people.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody matches that.</p>
          ) : (
            <ul className="grid gap-2" aria-label="People found">
              {(people.data ?? []).map((p) => (
                <li key={p.userId} className="flex items-center gap-3 rounded-lg border p-2">
                  <PersonRow name={p.displayName ?? p.username ?? 'Someone'} username={p.username} email={null} avatarUrl={p.avatarUrl} avatarPosition={p.avatarPosition} href={p.username ? `/u/${p.username}` : undefined} />
                  {action(p)}
                </li>
              ))}
            </ul>
          ))}
      </CardContent>
    </Card>
  )
}
