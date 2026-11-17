import type { DirectoryClubView } from '@matchpoynt/shared'
import { Users } from 'lucide-react'
import { Link } from 'react-router'
import ClubAvatar from '@/components/club/ClubAvatar'
import PositionedPhoto from '@/components/club/PositionedPhoto'
import JoinClubButton from '@/components/directory/JoinClubButton'
import { Card, CardTitle } from '@/components/ui/card'
import type { useJoining } from '@/utils/hooks/useDirectory'

interface DirectoryClubCardProps {
  club: DirectoryClubView
  joining: ReturnType<typeof useJoining>
}

/**
 * A club in the directory: a rectangle without any border or frame, filled
 * edge to edge by its cover (or a plain stage), with a soft blur along its top and bottom (each half its
 * height), with its photo, name, @handle, size and the Join button over the
 * bottom one. It keeps Matchpoynt's colours,
 * not the club's. The rest of the card opens its page.
 */
export default function DirectoryClubCard({ club, joining }: DirectoryClubCardProps) {
  const titleId = `directory-club-${club.id}`
  return (
    <Card className="directory-card gap-0 rounded-[2rem] border-0 bg-transparent p-0" aria-labelledby={titleId}>
      <div className="directory-card-stage">
        {club.coverUrl && <PositionedPhoto url={club.coverUrl} position={club.coverPosition} className="directory-card-cover" />}
        <div className="directory-card-blur-top" aria-hidden />
        <div className="directory-card-blur" aria-hidden />
        <div className="directory-card-meta">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <ClubAvatar name={club.name} url={club.avatarUrl} position={club.avatarPosition} className="directory-card-avatar size-10 text-sm sm:size-14 sm:text-lg" />
            <div className="grid min-w-0">
              <CardTitle id={titleId} className="truncate font-display text-xl leading-tight font-bold tracking-tight sm:text-2xl">
                {/* The link covers the card (`after:absolute`), so the whole card opens the club; the button sits above it. */}
                <Link to={`/c/${club.handle}`} className="outline-none after:absolute after:inset-0" aria-label={`${club.name}: open the club's page`}>
                  {club.name}
                </Link>
              </CardTitle>
              <p className="flex min-w-0 items-center gap-2 text-sm text-scrim-foreground/80">
                <span className="truncate">@{club.handle}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex shrink-0 items-center gap-1">
                  <Users className="size-3.5" aria-hidden />
                  {club.members} {club.members === 1 ? 'member' : 'members'}
                </span>
              </p>
            </div>
          </div>
          <div className="directory-card-action">
            <JoinClubButton club={club} joining={joining} size="lg" className="w-full rounded-full max-sm:h-9 max-sm:w-auto max-sm:px-4" />
          </div>
        </div>
      </div>
    </Card>
  )
}
