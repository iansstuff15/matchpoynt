import { clubBadgeIcons } from '@matchpoynt/shared'
import { ImageUp, Search, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import ClubBadgeIcon from '@/components/club/badges/ClubBadgeIcon'
import GifSearch from '@/components/club/badges/GifSearch'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BadgeIconChoice } from '@/utils/hooks/useClubs'
import { useFeatures } from '@/utils/hooks/useFeatures'

interface BadgeIconPickerProps {
  name: string
  /** The badge's saved icon, if any. */
  currentUrl: string | null
  choice: BadgeIconChoice | null
  onChoice: (choice: BadgeIconChoice | null) => void
}

/** A file picked for upload, shown as a data URL (img-src allows data:, not blob:). */
function useFilePreview(file: File | null) {
  const [read, setRead] = useState<{ file: File; url: string } | null>(null)
  useEffect(() => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' && setRead({ file, url: reader.result })
    reader.readAsDataURL(file)
    return () => reader.abort()
  }, [file])
  // Only the file still picked counts, so an earlier one never flashes.
  return read && read.file === file ? read.url : null
}

/** Picks the badge's icon: a GIF from search (when on) or an uploaded GIF or image. Sent once the badge is saved. */
export default function BadgeIconPicker({ name, currentUrl, choice, onChoice }: BadgeIconPickerProps) {
  const { web } = useFeatures()
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const file = choice?.kind === 'upload' ? choice.file : null
  const filePreview = useFilePreview(file)
  const preview = choice?.kind === 'gif' ? choice.gif.previewUrl : choice?.kind === 'upload' ? filePreview : choice?.kind === 'remove' ? null : currentUrl

  const upload = (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">An animated GIF, or a JPEG, PNG or WebP image, up to {clubBadgeIcons.maxBytes / 1024 / 1024} MB. GIFs keep moving.</p>
      {/* The real file input is hidden; the button opens it. The label names it for screen readers. */}
      <label htmlFor={inputId} className="sr-only">
        Badge icon file
      </label>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept={clubBadgeIcons.types.join(',')}
        className="sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0]
          if (picked) onChoice({ kind: 'upload', file: picked })
          e.target.value = ''
        }}
      />
      <Button type="button" variant="outline" className="w-fit" onClick={() => input.current?.click()}>
        <ImageUp />
        Upload a GIF or image
      </Button>
    </div>
  )

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-sm font-medium">Icon</legend>
      <div className="flex items-center gap-3">
        <ClubBadgeIcon url={preview} name={name || 'New'} className="size-16" />
        <p className="text-sm text-muted-foreground">
          {choice?.kind === 'gif'
            ? `GIF: ${choice.gif.title}`
            : choice?.kind === 'upload'
              ? `File: ${choice.file.name}`
              : choice?.kind === 'remove'
                ? 'The icon will be removed.'
                : currentUrl
                  ? 'Current icon.'
                  : 'No icon yet: the badge shows an award ribbon.'}
        </p>
        {(currentUrl || choice) && (
          <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => onChoice(currentUrl && choice?.kind !== 'remove' ? { kind: 'remove' } : null)}>
            <Trash2 />
            {choice && choice.kind !== 'remove' ? 'Clear' : choice?.kind === 'remove' ? 'Keep icon' : 'Remove icon'}
          </Button>
        )}
      </div>

      {web.gifSearch ? (
        <Tabs defaultValue="search">
          <TabsList>
            <TabsTrigger value="search">
              <Search aria-hidden />
              Search GIFs
            </TabsTrigger>
            <TabsTrigger value="upload">
              <ImageUp aria-hidden />
              Upload
            </TabsTrigger>
          </TabsList>
          <TabsContent value="search" className="mt-3">
            <GifSearch selected={choice?.kind === 'gif' ? choice.gif : null} onSelect={(gif) => onChoice({ kind: 'gif', gif })} />
          </TabsContent>
          <TabsContent value="upload" className="mt-3">
            {upload}
          </TabsContent>
        </Tabs>
      ) : (
        // GIF search is off: uploading is the only way, so no tabs.
        upload
      )}
    </fieldset>
  )
}
