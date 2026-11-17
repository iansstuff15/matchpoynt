import { friendLimits, type FriendPerson, type FriendSearchResult, type FriendsView, type FriendStatus, type FriendView, type PersonCard } from '@matchpoynt/shared'

/** One of the caller's friendships, as `my_friends` returns it: the other person and which way it stands. */
export interface FriendshipRecord {
  id: string
  status: 'pending' | 'accepted'
  /** The other person asked the caller. */
  incoming: boolean
  since: string
  person: FriendPerson
}

/** Where someone stands with the caller. */
export function friendStatus(record: FriendshipRecord | undefined): FriendStatus {
  if (!record) return 'none'
  if (record.status === 'accepted') return 'friends'
  return record.incoming ? 'incoming' : 'outgoing'
}

/**
 * Why the caller can't ask `userId` to be friends, or `null` when they can.
 * A request the other person already sent isn't a reason: asking back
 * accepts it (see `requestAction`).
 */
export function friendRequestBlockedReason(callerId: string, userId: string, records: FriendshipRecord[]): string | null {
  if (userId === callerId) return "You can't add yourself as a friend."
  const existing = records.find((r) => r.person.userId === userId)
  const name = existing?.person.username ? `@${existing.person.username}` : 'them'
  if (existing?.status === 'accepted') return `You're already friends with ${name}.`
  if (existing && !existing.incoming) return `You've already asked ${name}. They haven't answered yet.`
  if (existing?.incoming) return null
  if (records.filter((r) => r.status === 'accepted').length >= friendLimits.maxFriends) return `You can have up to ${friendLimits.maxFriends} friends. Remove someone first.`
  if (records.filter((r) => r.status === 'pending' && !r.incoming).length >= friendLimits.maxOutgoing) {
    return `You have ${friendLimits.maxOutgoing} requests waiting for an answer. Wait for some, or cancel a few, before asking more people.`
  }
  return null
}

/** What asking `userId` does: accept the request they already sent, or send a new one. */
export function requestAction(userId: string, records: FriendshipRecord[]): { accept: string } | 'request' {
  const incoming = records.find((r) => r.person.userId === userId && r.status === 'pending' && r.incoming)
  return incoming ? { accept: incoming.id } : 'request'
}

/** Why the caller can't answer friendship `id` (it isn't a request sent to them), or `null`. */
export function answerBlockedReason(id: string, records: FriendshipRecord[]): string | null {
  const record = records.find((r) => r.id === id)
  if (!record || record.status !== 'pending' || !record.incoming) return 'That friend request is no longer open. It may have been cancelled or answered on another device.'
  return null
}

const byName = (a: FriendView, b: FriendView) => (a.person.username ?? a.person.displayName ?? '').localeCompare(b.person.username ?? b.person.displayName ?? '')
const newestFirst = (a: FriendView, b: FriendView) => b.since.localeCompare(a.since)

/** The Friends page: friends by name, requests to answer and requests sent, newest first. */
export function friendsView(records: FriendshipRecord[]): FriendsView {
  const view = (r: FriendshipRecord): FriendView => ({ id: r.id, person: r.person, since: r.since })
  return {
    friends: records.filter((r) => r.status === 'accepted').map(view).sort(byName),
    incoming: records.filter((r) => r.status === 'pending' && r.incoming).map(view).sort(newestFirst),
    outgoing: records.filter((r) => r.status === 'pending' && !r.incoming).map(view).sort(newestFirst),
  }
}

/** People from the search, each with where they stand with the caller. */
export function withFriendStatus(people: PersonCard[], records: FriendshipRecord[]): FriendSearchResult[] {
  return people.map((p) => {
    const record = records.find((r) => r.person.userId === p.userId)
    return {
      userId: p.userId,
      username: p.username,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      avatarPosition: p.avatarPosition,
      status: friendStatus(record),
      friendshipId: record?.id ?? null,
    }
  })
}
