import type { FriendView } from '@matchpoynt/shared'
import { Check, Inbox, X } from 'lucide-react'
import FriendRow from '@/components/friends/FriendRow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { useFriendActions } from '@/utils/hooks/useFriends'
import { formatWhen } from '@/utils/time/formatWhen'

interface FriendRequestsCardProps {
  incoming: FriendView[]
  outgoing: FriendView[]
  actions: ReturnType<typeof useFriendActions>
}

const nameOf = (f: FriendView) => (f.person.username ? `@${f.person.username}` : (f.person.displayName ?? 'them'))

/** Friend requests waiting for your answer, then the ones you sent (which you can cancel). */
export default function FriendRequestsCard({ incoming, outgoing, actions }: FriendRequestsCardProps) {
  const { answer, remove } = actions
  return (
    <Card aria-labelledby="friend-requests-title">
      <CardHeader>
        <CardTitle id="friend-requests-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <Inbox className="size-5" aria-hidden />
          Requests
        </CardTitle>
        <CardDescription>{incoming.length ? `${incoming.length} waiting for your answer.` : 'Nothing waiting for your answer.'}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {incoming.length > 0 && (
          <ul className="grid gap-2" aria-label="Requests to answer">
            {incoming.map((f) => (
              <FriendRow key={f.id} friend={f} aside={formatWhen(f.since)}>
                <Button size="sm" disabled={answer.isPending} onClick={() => answer.mutate({ id: f.id, name: nameOf(f), accept: true })} aria-label={`Accept ${nameOf(f)}`}>
                  <Check />
                  Accept
                </Button>
                <Button size="sm" variant="ghost" disabled={answer.isPending} onClick={() => answer.mutate({ id: f.id, name: nameOf(f), accept: false })} aria-label={`Decline ${nameOf(f)}`}>
                  <X />
                  Decline
                </Button>
              </FriendRow>
            ))}
          </ul>
        )}
        {outgoing.length > 0 && (
          <section aria-labelledby="friend-sent-title" className="grid gap-2">
            <h3 id="friend-sent-title" className="text-sm font-medium text-muted-foreground">
              Sent
            </h3>
            <ul className="grid gap-2" aria-label="Requests you sent">
              {outgoing.map((f) => (
                <FriendRow key={f.id} friend={f} aside={formatWhen(f.since)}>
                  <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate({ id: f.id, name: nameOf(f), pending: true })} aria-label={`Cancel your request to ${nameOf(f)}`}>
                    <X />
                    Cancel
                  </Button>
                </FriendRow>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  )
}
