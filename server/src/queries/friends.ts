import { positionOf } from '@/utils/club/appearance'
import { profileMediaUrl } from '@/utils/club/media'
import type { FriendshipRecord } from '@/utils/friends/rules'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

// Friendships. The caller sees their own rows through RLS; the other person's
// card (username, name and photo only) comes from `my_friends` (0035), and
// accepting goes through `accept_friend_request`, as there is no update policy.

interface FriendRow {
  id: string
  status: string
  incoming: boolean
  since: string
  user_id: string
  username: string | null
  display_name: string | null
  avatar_path: string | null
  avatar_position: unknown
}

/** Every friendship and request the caller is part of. */
export async function loadFriendships(db: Db): Promise<FriendshipRecord[]> {
  const { data, error } = await db.rpc('my_friends')
  dbFail(error)
  return ((data as unknown as FriendRow[] | null) ?? []).map((r) => ({
    id: r.id,
    status: r.status === 'accepted' ? 'accepted' : 'pending',
    incoming: r.incoming,
    since: r.since,
    person: {
      userId: r.user_id,
      username: r.username,
      displayName: r.username ?? r.display_name,
      avatarUrl: profileMediaUrl(r.avatar_path),
      avatarPosition: positionOf(r.avatar_position),
    },
  }))
}

/** Asks `userId` to be friends (RLS: the caller is the requester, and it starts pending). */
export async function sendFriendRequest(db: Db, userId: string): Promise<void> {
  const { error } = await db.from('friendships').insert({ id: crypto.randomUUID(), addressee_id: userId })
  dbFail(error)
}

export async function acceptFriendRequest(db: Db, id: string): Promise<void> {
  const { error } = await db.rpc('accept_friend_request', { p_id: id })
  dbFail(error)
}

/** Declines a request, cancels one, or removes a friend (RLS: either person); `false` when it's already gone. */
export async function deleteFriendship(db: Db, id: string): Promise<boolean> {
  const { data, error } = await db.from('friendships').delete().eq('id', id).select('id')
  dbFail(error)
  return Boolean(data?.length)
}
