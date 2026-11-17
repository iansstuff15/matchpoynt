import type { ClubTheme, PhotoPosition } from '@matchpoynt/shared'
import ClubAvatar from '@/components/club/ClubAvatar'
import LogoMark from '@/components/brand/LogoMark'
import { Skeleton } from '@/components/ui/skeleton'
import { clubThemeStyle } from '@/utils/theme/clubThemeStyle'

/** What's already known about the club being opened (from lists loaded before), to show while the rest loads. */
export interface ClubPreview {
  name: string
  handle: string | null
  avatarUrl: string | null
  avatarPosition?: PhotoPosition
  theme: ClubTheme | null
}

/**
 * Shown while a club opens (its pages, or its page for players): the club's
 * photo and name when they're already known, in its colours, with the logo's
 * arches bobbing in turn. Without a preview, their places are skeletons.
 */
export default function ClubLoadingScreen({ preview }: { preview: ClubPreview | null }) {
  return (
    <div className="club-loading" style={clubThemeStyle(preview?.theme ?? null)} role="status" aria-busy="true" aria-label={preview ? `Opening ${preview.name}` : 'Opening the club'}>
      {preview ? (
        <ClubAvatar name={preview.name} url={preview.avatarUrl} position={preview.avatarPosition} className="size-24 text-3xl ring-4 ring-primary/40" />
      ) : (
        <Skeleton className="size-24 rounded-full" />
      )}
      <div className="grid justify-items-center gap-1">
        {preview ? <p className="font-display text-2xl font-bold">{preview.name}</p> : <Skeleton className="h-8 w-48" />}
        {preview?.handle && <p className="text-sm text-muted-foreground">@{preview.handle}</p>}
      </div>
      <LogoMark className="club-loading-logo" />
      <p className="text-sm text-muted-foreground">Opening the club…</p>
    </div>
  )
}
