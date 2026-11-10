import type { ClubImageKind, ClubSummary } from '@matchpoynt/shared'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import ClubAppearanceCard from '@/components/club/ClubAppearanceCard'
import ClubInfoForm from '@/components/club/ClubInfoForm'
import ImageUploadField from '@/components/club/ImageUploadField'
import PhotoEditDialog from '@/components/club/PhotoEditDialog'
import ConfirmButton from '@/components/common/ConfirmButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { clubPhotos } from '@/config/club'
import type { useClubActions } from '@/utils/hooks/useClubs'

interface ClubInfoPanelProps {
  club: ClubSummary
  actions: ReturnType<typeof useClubActions>
}

/** Club info tab: name and description, the profile and cover photos (upload, align, remove), the club's colours, and deleting the club. */
export default function ClubInfoPanel({ club, actions }: ClubInfoPanelProps) {
  const { saveInfo, uploadImage, removeImage, alignImage, deleteClub } = actions
  const [aligning, setAligning] = useState<ClubImageKind | null>(null)
  const busy = (kind: 'avatar' | 'cover') => ({
    uploading: uploadImage.isPending && uploadImage.variables?.kind === kind,
    removing: removeImage.isPending && removeImage.variables === kind,
  })

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">About the club</CardTitle>
          <CardDescription>Shown on the club page and its cards.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClubInfoForm
            // Start over from the saved values whenever they change.
            key={`${club.name}\u0000${club.description ?? ''}`}
            initial={{ name: club.name, description: club.description }}
            pending={saveInfo.isPending}
            error={saveInfo.error}
            action="save the club info"
            submitLabel="Save club info"
            onSubmit={(info) => saveInfo.mutate(info)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Photos</CardTitle>
          <CardDescription>JPEG, PNG or WebP, up to 5 MB.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <ImageUploadField
            label={clubPhotos.avatar.label}
            description={clubPhotos.avatar.description}
            url={club.avatarUrl}
            position={club.avatarPosition}
            shape="avatar"
            {...busy('avatar')}
            onUpload={(file) => uploadImage.mutate({ kind: 'avatar', file })}
            onRemove={() => removeImage.mutate('avatar')}
            onAlign={() => {
              alignImage.reset()
              setAligning('avatar')
            }}
          />
          <ImageUploadField
            label={clubPhotos.cover.label}
            description={clubPhotos.cover.description}
            url={club.coverUrl}
            position={club.coverPosition}
            shape="cover"
            {...busy('cover')}
            onUpload={(file) => uploadImage.mutate({ kind: 'cover', file })}
            onRemove={() => removeImage.mutate('cover')}
            onAlign={() => {
              alignImage.reset()
              setAligning('cover')
            }}
          />
        </CardContent>
      </Card>

      <ClubAppearanceCard club={club} actions={actions} />

      {aligning && (
        <PhotoEditDialog
          open
          label={clubPhotos[aligning].label}
          description={clubPhotos[aligning].description}
          url={aligning === 'avatar' ? club.avatarUrl : club.coverUrl}
          position={aligning === 'avatar' ? club.avatarPosition : club.coverPosition}
          shape={aligning}
          {...busy(aligning)}
          aligning={alignImage.isPending}
          alignError={alignImage.error}
          onOpenChange={(next) => !next && setAligning(null)}
          onUpload={(file) => uploadImage.mutate({ kind: aligning, file })}
          onRemove={() => removeImage.mutate(aligning, { onSuccess: () => setAligning(null) })}
          onAlign={(position) => alignImage.mutate({ kind: aligning, position }, { onSuccess: () => setAligning(null) })}
        />
      )}

      <Card className="border-destructive/40 xl:col-span-2">
        <CardHeader>
          <CardTitle className="font-display">Delete club</CardTitle>
          <CardDescription>
            Removes the club, its members, planned sessions and photos. Sessions it already ran keep their results and leaderboards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmButton
            label="Delete club"
            icon={Trash2}
            title={`Delete ${club.name}?`}
            description="Its members, planned sessions and photos are removed for good. Past sessions keep their results."
            confirmLabel="Delete club"
            cancelLabel="Keep club"
            pending={deleteClub.isPending}
            onConfirm={() => deleteClub.mutate()}
          />
        </CardContent>
      </Card>
    </div>
  )
}
