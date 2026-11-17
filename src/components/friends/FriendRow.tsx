import type { FriendView } from '@matchpoynt/shared'
import type { ReactNode } from 'react'
import PersonRow from '@/components/common/PersonRow'

/** One person in a friends list: their photo, name and @username, then the row's buttons. */
export default function FriendRow({ friend, aside, children }: { friend: FriendView; aside?: string; children: ReactNode }) {
  const { person } = friend
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border p-2">
      <PersonRow name={person.displayName ?? person.username ?? 'Someone'} username={person.username} email={null} avatarUrl={person.avatarUrl} avatarPosition={person.avatarPosition} aside={aside} href={person.username ? `/u/${person.username}` : undefined} />
      <span className="flex gap-1">{children}</span>
    </li>
  )
}
