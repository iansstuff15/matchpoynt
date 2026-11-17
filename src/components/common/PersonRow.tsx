import type { PhotoPosition } from '@matchpoynt/shared'
import { Link } from 'react-router'
import ClubAvatar from '@/components/club/ClubAvatar'

interface PersonRowProps {
  name: string
  username: string | null
  email: string | null
  avatarUrl: string | null
  avatarPosition?: PhotoPosition
  /** Shown on the right, e.g. a tier and club. */
  aside?: string
  /** Makes the name a link, e.g. to their profile. */
  href?: string
}

/** One person in a suggestion list: their photo, name, @username and email. */
export default function PersonRow({ name, username, email, avatarUrl, avatarPosition, aside, href }: PersonRowProps) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <ClubAvatar name={name} url={avatarUrl} position={avatarPosition} className="size-8 text-xs" />
      <span className="grid min-w-0 flex-1">
        {href ? (
          <Link to={href} className="truncate font-medium hover:underline" aria-label={`View ${username ? `@${username}` : name}'s profile`}>
            {name}
          </Link>
        ) : (
          <span className="truncate font-medium">{name}</span>
        )}
        {(username || email) && <span className="truncate text-xs text-muted-foreground">{[username && `@${username}`, email].filter(Boolean).join(' · ')}</span>}
      </span>
      {aside && <span className="shrink-0 truncate text-xs text-muted-foreground">{aside}</span>}
    </span>
  )
}
