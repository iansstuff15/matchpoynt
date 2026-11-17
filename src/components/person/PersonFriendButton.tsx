import type { PersonProfileView } from '@matchpoynt/shared'
import { Check, Clock, UserMinus, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFriendActions } from '@/utils/hooks/useFriends'

interface PersonFriendButtonProps {
  person: PersonProfileView
  actions: ReturnType<typeof useFriendActions>
}

/** Where the viewer stands with someone, as buttons: add, cancel the request, accept or decline theirs, or remove them. */
export default function PersonFriendButton({ person, actions }: PersonFriendButtonProps) {
  const { friend } = person
  if (!friend) return null
  const name = `@${person.username}`
  const { add, answer, remove } = actions
  const busy = add.isPending || answer.isPending || remove.isPending
  const id = friend.friendshipId
  switch (friend.status) {
    case 'friends':
      return (
        <Button variant="outline" disabled={busy || !id} onClick={() => id && remove.mutate({ id, name, pending: false })} aria-label={`Remove ${name} from your friends`}>
          <UserMinus />
          Remove friend
        </Button>
      )
    case 'outgoing':
      return (
        <Button variant="outline" disabled={busy || !id} onClick={() => id && remove.mutate({ id, name, pending: true })} aria-label={`Cancel your friend request to ${name}`}>
          <Clock />
          Cancel request
        </Button>
      )
    case 'incoming':
      return (
        <span className="flex gap-2">
          <Button disabled={busy || !id} onClick={() => id && answer.mutate({ id, name, accept: true })} aria-label={`Accept ${name}'s friend request`}>
            <Check />
            Accept
          </Button>
          <Button variant="outline" disabled={busy || !id} onClick={() => id && answer.mutate({ id, name, accept: false })} aria-label={`Decline ${name}'s friend request`}>
            <X />
            Decline
          </Button>
        </span>
      )
    default:
      return (
        <Button disabled={busy} onClick={() => add.mutate({ userId: person.userId, name })} aria-label={`Add ${name} as a friend`}>
          <UserPlus />
          Add friend
        </Button>
      )
  }
}
