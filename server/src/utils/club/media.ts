import { clubBadgeIcons, clubImages, type ClubImageKind } from '@matchpoynt/shared'
import { features } from '@/config/features'
import { invalid } from '@/utils/http/errors'

// Club and session photos in the `club-media` Storage bucket. Object names are
// `<owner id>/<club id>/<kind>-<random uuid>.<ext>`: the owner folder is what
// Storage RLS checks, and the random part makes each upload a new, unguessable
// name, so the API can serve it with a long cache.

export const mediaBucket = 'club-media'

type ImageType = (typeof clubBadgeIcons.types)[number]
type PhotoType = (typeof clubImages.types)[number]

const extensions: Record<ImageType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const pathPattern = new RegExp(`^${uuid}/${uuid}/(avatar|cover|plan|badge)-${uuid}\\.(jpg|png|webp|gif)$`)

/** What an image file really is, from its first bytes; the declared type and name are not trusted. */
export function sniffImage(bytes: Uint8Array): ImageType | null {
  const at = (i: number, ...values: number[]) => values.every((v, j) => bytes[i + j] === v)
  if (at(0, 0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp'
  // GIF87a / GIF89a
  if (at(0, 0x47, 0x49, 0x46, 0x38) && (at(4, 0x37, 0x61) || at(4, 0x39, 0x61))) return 'image/gif'
  return null
}

/** Checks an uploaded photo (club profile or cover, session cover) and says what it is. */
export function checkImage(bytes: Uint8Array): PhotoType {
  if (bytes.byteLength === 0) throw invalid('Choose a photo to upload.', { image: 'No file' })
  if (bytes.byteLength > clubImages.maxBytes) {
    throw invalid(`Photos can be up to ${clubImages.maxBytes / 1024 / 1024} MB. Pick a smaller one.`, { image: 'Too large' })
  }
  const type = sniffImage(bytes)
  if (!type || type === 'image/gif') throw invalid('Photos must be JPEG, PNG or WebP images.', { image: 'Unsupported format' })
  return type
}

/** Checks a badge icon: an animated GIF, or a JPEG, PNG or WebP image. */
export function checkBadgeIcon(bytes: Uint8Array): ImageType {
  if (bytes.byteLength === 0) throw invalid('Choose an image or GIF for the badge.', { icon: 'No file' })
  if (bytes.byteLength > clubBadgeIcons.maxBytes) {
    throw invalid(`Badge icons can be up to ${clubBadgeIcons.maxBytes / 1024 / 1024} MB. Pick a smaller one.`, { icon: 'Too large' })
  }
  const type = sniffImage(bytes)
  if (!type) throw invalid('Badge icons must be GIF, JPEG, PNG or WebP images.', { icon: 'Unsupported format' })
  return type
}

/**
 * A new object name for a club photo (`avatar`, `cover`), a planned
 * session's cover (`plan`) or a club badge's icon (`badge`). Photos are stored
 * as WebP (`toWebp`); older ones may still be JPEG or PNG, which the media
 * route keeps serving. Badge icons that are GIFs stay GIFs, so they keep moving.
 */
export function mediaPath(ownerId: string, clubId: string, kind: ClubImageKind | 'plan' | 'badge', id: string, type: ImageType = 'image/webp'): string {
  return `${ownerId}/${clubId}/${kind}-${id}.${extensions[type]}`
}

export const isMediaPath = (path: string) => pathPattern.test(path)

/** Folder of everything a club has uploaded, for clean-up when the club is deleted. */
export const clubFolder = (ownerId: string, clubId: string) => `${ownerId}/${clubId}`

/** Where the web app loads a photo; `null` without one, or while clubs are switched off. */
export function mediaUrl(path: string | null): string | null {
  return path && features().web.clubs ? `/api/media/${path}` : null
}
