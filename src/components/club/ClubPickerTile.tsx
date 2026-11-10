import type { ClubSummary } from '@matchpoynt/shared'
import { Pencil } from 'lucide-react'
import { Link } from 'react-router'
import ClubAvatar from '@/components/club/ClubAvatar'

interface ClubPickerTileProps {
  club: ClubSummary
  /** Edit mode: a pencil over the avatar, and the tile opens the club's info. */
  editing: boolean
}

/** A club on the picker: a big round avatar with its name under it. */
export default function ClubPickerTile({ club, editing }: ClubPickerTileProps) {
  return (
    <Link
      to={editing ? `/clubs/${club.id}?tab=info` : `/clubs/${club.id}`}
      className="club-tile"
      aria-label={editing ? `Edit ${club.name}` : `Open ${club.name}: ${club.members} members, ${club.plannedSessions} planned sessions`}
    >
      <span className="club-tile-avatar">
        <ClubAvatar name={club.name} url={club.avatarUrl} position={club.avatarPosition} className="size-full text-3xl" />
        {editing && (
          <span className="club-tile-edit" aria-hidden>
            <Pencil className="size-8" />
          </span>
        )}
      </span>
      <span className="club-tile-name" title={club.name}>
        {club.name}
      </span>
    </Link>
  )
}
