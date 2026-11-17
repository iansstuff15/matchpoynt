import type { PlayerClubPageView } from '@matchpoynt/shared'
import { Users } from 'lucide-react'
import ClubAvatar from '@/components/club/ClubAvatar'
import PositionedPhoto from '@/components/club/PositionedPhoto'
import ErrorBanner from '@/components/feedback/ErrorBanner'
import JoinClubButton from '@/components/directory/JoinClubButton'
import SocialLinksList from '@/components/social/SocialLinksList'
import type { useJoining } from '@/utils/hooks/useDirectory'

/** The top of a club's page for players: cover, photo, name, @handle, description, size, links and the join action. */
export default function PlayerClubHero({ page, joining }: { page: PlayerClubPageView; joining: ReturnType<typeof useJoining> }) {
  const { club } = page
  const { joinClub } = joining
  return (
    <header className="overflow-hidden rounded-xl border bg-card text-card-foreground">
      <div className="relative h-36 bg-muted sm:h-48">
        {club.coverUrl && <PositionedPhoto url={club.coverUrl} position={club.coverPosition} alt="" className="absolute inset-0 size-full object-cover" />}
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end">
        <ClubAvatar name={club.name} url={club.avatarUrl} position={club.avatarPosition} className="-mt-16 size-24 border-4 border-card text-2xl sm:-mt-20" />
        <div className="grid min-w-0 gap-1">
          <h1 id="player-club-title" className="truncate font-display text-2xl font-bold sm:text-3xl">
            {club.name}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            <span>@{club.handle}</span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-4" aria-hidden />
              {club.members} {club.members === 1 ? 'member' : 'members'}
            </span>
            <span>{club.approval === 'auto' ? 'Open to join' : 'Join by request'}</span>
          </p>
        </div>
        <JoinClubButton club={club} joining={joining} size="lg" />
      </div>
      {(club.description || club.socialLinks.length > 0) && (
        <div className="grid gap-3 border-t px-5 py-4">
          {club.description && <p className="text-sm whitespace-pre-line">{club.description}</p>}
          {club.socialLinks.length > 0 && <SocialLinksList links={club.socialLinks} label={`${club.name} on social media`} />}
        </div>
      )}
      {Boolean(joinClub.error) && (
        <div className="px-5 pb-5">
          <ErrorBanner error={joinClub.error} action={`join ${club.name}`} onRetry={() => joinClub.variables && joinClub.mutate(joinClub.variables)} />
        </div>
      )}
    </header>
  )
}
