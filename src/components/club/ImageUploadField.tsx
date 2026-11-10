import { clubImages, type PhotoPosition } from '@matchpoynt/shared'
import { ImageUp, LoaderCircle, Move, Trash2 } from 'lucide-react'
import { useId, useRef } from 'react'
import PositionedPhoto from '@/components/club/PositionedPhoto'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface ImageUploadFieldProps {
  label: string
  description: string
  url: string | null
  position: PhotoPosition
  shape: 'cover' | 'avatar'
  uploading: boolean
  removing: boolean
  onUpload: (file: File) => void
  onRemove: () => void
  /** Opens the photo editor to drag and zoom it; left out inside the editor itself. */
  onAlign?: () => void
  /** Leaves out the preview (the photo editor shows the photo in its aligner instead). */
  hidePreview?: boolean
}

/** Picks a photo and hands it to the API, which checks its size and real type. Shows the current photo. */
export default function ImageUploadField({ label, description, url, position, shape, uploading, removing, onUpload, onRemove, onAlign, hidePreview = false }: ImageUploadFieldProps) {
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const busy = uploading || removing

  return (
    <div className={cn('grid gap-3', shape === 'avatar' && 'sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-5')}>
      {!(hidePreview && url) && (
        <div role="img" aria-label={url ? `Current ${label.toLowerCase()}` : `No ${label.toLowerCase()} yet`} className={shape === 'cover' ? 'image-preview-cover' : 'image-preview-avatar'}>
          {url && <PositionedPhoto url={url} position={position} />}
        </div>
      )}
      <div className="grid gap-2">
        <div>
          <label htmlFor={inputId} className="text-sm font-medium">
            {label}
          </label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept={clubImages.types.join(',')}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(file)
            // Let the same file be picked again after a failed upload.
            e.target.value = ''
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            {uploading ? <LoaderCircle className="animate-spin" /> : <ImageUp />}
            {url ? 'Replace photo' : 'Upload photo'}
          </Button>
          {url && onAlign && (
            <Button type="button" variant="outline" disabled={busy} onClick={onAlign}>
              <Move />
              Align
            </Button>
          )}
          {url && (
            <Button type="button" variant="ghost" disabled={busy} onClick={onRemove}>
              {removing ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
