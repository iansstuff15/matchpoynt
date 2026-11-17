import type { FriendView } from '@matchpoynt/shared'
import { UserMinus, UsersRound } from 'lucide-react'
import ConfirmButton from '@/components/common/ConfirmButton'
import FriendRow from '@/components/friends/FriendRow'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { useFriendActions } from '@/utils/hooks/useFriends'

const nameOf = (f: FriendView) => (f.person.username ? `@${f.person.username}` : (f.person.displayName ?? 'them'))

/** Your friends, by name, each removable (confirmed first). */
export default function FriendListCard({ friends, actions }: { friends: FriendView[]; actions: ReturnType<typeof useFriendActions> }) {
  const { remove } = actions
  return (
    <Card aria-labelledby="friend-list-title">
      <CardHeader>
        <CardTitle id="friend-list-title" role="heading" aria-level={2} className="flex items-center gap-2 font-display">
          <UsersRound className="size-5" aria-hidden />
          Friends
        </CardTitle>
        <CardDescription>{friends.length ? `${friends.length} ${friends.length === 1 ? 'friend' : 'friends'}.` : 'No friends yet. Search for people to add them.'}</CardDescription>
      </CardHeader>
      {friends.length > 0 && (
        <CardContent>
          <ul className="grid gap-2" aria-label="Your friends">
            {friends.map((f) => (
              <FriendRow key={f.id} friend={f}>
                <ConfirmButton
                  variant="ghost"
                  icon={UserMinus}
                  label={`Remove ${nameOf(f)}`}
                  title={`Remove ${nameOf(f)} from your friends?`}
                  description="They won't be told. You can add them again later."
                  confirmLabel="Remove friend"
                  pending={remove.isPending && remove.variables?.id === f.id}
                  onConfirm={() => remove.mutate({ id: f.id, name: nameOf(f), pending: false })}
                />
              </FriendRow>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}
