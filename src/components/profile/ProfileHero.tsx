import type { ProfilePageView } from '@matchpoynt/shared'
import { CalendarDays, Settings } from 'lucide-react'
import { useState } from 'react'
import ClubAvatar from '@/components/club/ClubAvatar'
import PhotoEditDialog from '@/components/club/PhotoEditDialog'
import PhotoViewerDialog from '@/components/club/PhotoViewerDialog'
import { Button } from '@/components/ui/button'
import type { useProfileActions } from '@/utils/hooks/useProfile'

interface ProfileHeroProps {
  page: ProfilePageView
  actions: ReturnType<typeof useProfileActions>
  onSettings: () => void
}

const photo = { label: 'Profile photo', description: 'A square photo of you, shown with your name.' }

/**
 * The top of the profile page: the photo (clicked to view it, with zoom and
 * Edit, or to add one), name, @username, and the settings button.
 */
export default function ProfileHero({ page, actions, onSettings }: ProfileHeroProps) {
  const [viewing, setViewing] = useState(false)
  const [editing, setEditing] = useState(false)
  const { profile } = page
  const name = profile.displayName ?? page.email ?? 'You'
  const { uploadPhoto, removePhoto, alignPhoto } = actions

  return (
    <header className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        className="profile-avatar club-photo-button relative overflow-hidden p-0"
        data-empty={page.avatarUrl ? undefined : ''}
        onClick={() => (page.avatarUrl ? setViewing(true) : setEditing(true))}
        aria-label={page.avatarUrl ? 'View your profile photo' : 'Add a profile photo'}
      >
        <ClubAvatar name={name} url={page.avatarUrl} position={page.avatarPosition} className="size-full text-2xl" />
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        <h1 id="profile-title" className="truncate font-display text-2xl font-bold sm:text-3xl" title={name}>
          {name}
        </h1>
        {profile.username && <p className="text-sm font-medium text-muted-foreground">@{profile.username}</p>}
        {page.memberSince && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden />
            On Matchpoynt since {new Date(page.memberSince).toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>
      <Button variant="outline" onClick={onSettings} aria-label="Profile settings">
        <Settings />
        Settings
      </Button>

      {viewing && page.avatarUrl && (
        <PhotoViewerDialog
          open
          url={page.avatarUrl}
          alt={`${name}'s profile photo`}
          title={photo.label}
          onOpenChange={setViewing}
          onEdit={() => {
            setViewing(false)
            setEditing(true)
          }}
        />
      )}
      {editing && (
        <PhotoEditDialog
          open
          label={photo.label}
          description={photo.description}
          url={page.avatarUrl}
          position={page.avatarPosition}
          shape="avatar"
          uploading={uploadPhoto.isPending}
          removing={removePhoto.isPending}
          aligning={alignPhoto.isPending}
          alignError={alignPhoto.error}
          onOpenChange={setEditing}
          onUpload={(file) => uploadPhoto.mutate(file)}
          onRemove={() => removePhoto.mutate(undefined, { onSuccess: () => setEditing(false) })}
          onAlign={(position) => alignPhoto.mutate(position, { onSuccess: () => setEditing(false) })}
        />
      )}
    </header>
  )
}
