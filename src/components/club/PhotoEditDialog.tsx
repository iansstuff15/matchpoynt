import { clubImages, type PhotoPosition } from '@matchpoynt/shared'
import ImageUploadField from '@/components/club/ImageUploadField'
import PhotoAligner from '@/components/club/PhotoAligner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

interface PhotoEditDialogProps {
  open: boolean
  label: string
  description: string
  url: string | null
  position: PhotoPosition
  shape: 'cover' | 'avatar'
  uploading: boolean
  removing: boolean
  aligning: boolean
  alignError: unknown
  onOpenChange: (open: boolean) => void
  onUpload: (file: File) => void
  onRemove: () => void
  onAlign: (position: PhotoPosition) => void
}

/**
 * Aligns, changes or removes a club photo. Opens from the viewer's Edit
 * button, the Club info tab, or straight away when there's no photo yet.
 */
export default function PhotoEditDialog({ open, label, description, aligning, alignError, onOpenChange, onAlign, ...field }: PhotoEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">{field.url ? `Change ${label.toLowerCase()}` : `Add a ${label.toLowerCase()}`}</DialogTitle>
          <DialogDescription>{field.url ? 'Drag and zoom to frame it, or upload another.' : `JPEG, PNG or WebP, up to ${clubImages.maxBytes / 1024 / 1024} MB.`}</DialogDescription>
        </DialogHeader>
        {field.url && (
          <>
            {/* Keyed by the photo, so a new upload starts from its own (centred) position. */}
            <PhotoAligner key={field.url} url={field.url} label={label} shape={field.shape} position={field.position} pending={aligning} error={alignError} onSave={onAlign} />
            <Separator />
          </>
        )}
        <ImageUploadField label={label} description={description} {...field} hidePreview />
      </DialogContent>
    </Dialog>
  )
}
