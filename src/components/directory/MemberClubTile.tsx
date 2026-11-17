import type { DirectoryClubView } from '@matchpoynt/shared'
import PositionedPhoto from '@/components/club/PositionedPhoto'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

/**
 * A club the player is in, on the club picker: a rectangle showing the club's
 * logo (its profile photo, framed as set) on a plain stage, or its initials,
 * its name under it. Picking it plays with that club.
 */
export default function MemberClubTile({ club, onPick }: { club: DirectoryClubView; onPick: () => void }) {
  return (
    <button type="button" data-picker-tile className="member-club-tile" onClick={onPick} aria-label={`Play with ${club.name}`}>
      <span className="member-club-tile-media">
        {club.avatarUrl ? (
          <PositionedPhoto url={club.avatarUrl} position={club.avatarPosition} alt={`${club.name} logo`} />
        ) : (
          <span className="font-display text-4xl font-bold text-deep-foreground" aria-hidden>
            {initials(club.name)}
          </span>
        )}
      </span>
      <span className="club-tile-name" title={club.name}>
        {club.name}
      </span>
    </button>
  )
}
