import type { ClubImageKind, ClubSummary } from '@matchpoynt/shared'
import { CalendarDays, ImagePlus, Users } from 'lucide-react'
import { useState } from 'react'
import ClubAvatar from '@/components/club/ClubAvatar'
import PhotoEditDialog from '@/components/club/PhotoEditDialog'
import PhotoViewerDialog from '@/components/club/PhotoViewerDialog'
import PositionedPhoto from '@/components/club/PositionedPhoto'
import { clubPhotos } from '@/config/club'
import type { useClubActions } from '@/utils/hooks/useClubs'

interface ClubHeroProps {
  club: ClubSummary
  actions: ReturnType<typeof useClubActions>
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/**
 * The club manager's banner: cover photo, profile photo overlapping it, name,
 * description and counts. Clicking a photo opens it with zoom and Edit; with
 * no photo yet, it opens the upload dialog.
 */
export default function ClubHero({ club, actions }: ClubHeroProps) {
  const [viewing, setViewing] = useState<ClubImageKind | null>(null)
  const [editing, setEditing] = useState<ClubImageKind | null>(null)
  const { uploadImage, removeImage, alignImage } = actions
  const urlOf = (kind: ClubImageKind) => (kind === 'avatar' ? club.avatarUrl : club.coverUrl)
  const positionOf = (kind: ClubImageKind) => (kind === 'avatar' ? club.avatarPosition : club.coverPosition)
  const open = (kind: ClubImageKind) => (urlOf(kind) ? setViewing(kind) : setEditing(kind))
  const label = (kind: ClubImageKind) => `${club.name} ${clubPhotos[kind].label.toLowerCase()}`

  return (
    <header className="grid gap-3">
      <button
        type="button"
        className="club-hero-cover club-photo-button"
        data-empty={club.coverUrl ? undefined : ''}
        onClick={() => open('cover')}
        aria-label={club.coverUrl ? `View ${label('cover')}` : `Add a cover photo to ${club.name}`}
      >
        {club.coverUrl && <PositionedPhoto url={club.coverUrl} position={club.coverPosition} />}
        {!club.coverUrl && (
          <span className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <ImagePlus className="size-5" aria-hidden />
            Add a cover photo
          </span>
        )}
      </button>
      <div className="flex flex-wrap items-end gap-4 px-2 sm:px-4">
        <button
          type="button"
          className="club-hero-avatar club-photo-button overflow-hidden p-0"
          data-empty={club.avatarUrl ? undefined : ''}
          onClick={() => open('avatar')}
          aria-label={club.avatarUrl ? `View ${label('avatar')}` : `Add a profile photo to ${club.name}`}
        >
          <ClubAvatar name={club.name} url={club.avatarUrl} position={club.avatarPosition} className="size-full text-2xl" />
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <h1 id="club-title" className="truncate font-display text-2xl font-bold sm:text-3xl" title={club.name}>
            {club.name}
          </h1>
          <p className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="size-4" aria-hidden />
              {plural(club.members, 'member')}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-4" aria-hidden />
              {plural(club.plannedSessions, 'planned session')}
            </span>
          </p>
        </div>
      </div>
      {club.description && <p className="max-w-3xl px-2 text-sm whitespace-pre-line text-muted-foreground sm:px-4">{club.description}</p>}

      {viewing && urlOf(viewing) && (
        <PhotoViewerDialog
          open
          url={urlOf(viewing)!}
          alt={label(viewing)}
          title={clubPhotos[viewing].label}
          onOpenChange={(next) => !next && setViewing(null)}
          onEdit={() => {
            setEditing(viewing)
            setViewing(null)
          }}
        />
      )}
      {editing && (
        <PhotoEditDialog
          open
          label={clubPhotos[editing].label}
          description={clubPhotos[editing].description}
          url={urlOf(editing)}
          position={positionOf(editing)}
          shape={editing}
          aligning={alignImage.isPending}
          alignError={alignImage.error}
          onAlign={(position) => alignImage.mutate({ kind: editing, position })}
          uploading={uploadImage.isPending && uploadImage.variables?.kind === editing}
          removing={removeImage.isPending && removeImage.variables === editing}
          onOpenChange={(next) => !next && setEditing(null)}
          onUpload={(file) => uploadImage.mutate({ kind: editing, file })}
          onRemove={() => removeImage.mutate(editing, { onSuccess: () => setEditing(null) })}
        />
      )}
    </header>
  )
}
