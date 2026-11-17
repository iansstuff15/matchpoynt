import { positionOf } from '@/utils/club/appearance'
import { checkImage, profileMediaPath } from '@/utils/club/media'
import { toWebp } from '@/utils/image/webp'
import { loadProfileExtras, updateProfileExtras } from '@/queries/profiles'
import { uploadMedia } from '@/queries/clubs'
import type { Db } from '@/utils/supabase/client'

/** Google serves account photos from these hosts only; nothing else is fetched. */
const photoHosts = ['googleusercontent.com']

const allowed = (url: URL) => url.protocol === 'https:' && photoHosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))

/**
 * Gives someone without a profile photo their Google account's photo: the API
 * downloads it (only from Google's photo host), checks it, stores it as WebP
 * in their own folder, and sets it as their photo. Never replaces a photo
 * they have; `false` when nothing was set.
 */
export async function adoptProviderPhoto(db: Db, userId: string, photoUrl: string | null): Promise<boolean> {
  if (!photoUrl) return false
  let url: URL
  try {
    url = new URL(photoUrl)
  } catch {
    return false
  }
  if (!allowed(url)) return false
  if ((await loadProfileExtras(db, userId)).avatarPath) return false
  // Google's photo URLs end with a size; ask for one big enough for the profile page.
  url.pathname = url.pathname.replace(/=s\d+(-c)?$/, '=s512-c')
  const response = await fetch(url, { redirect: 'error' })
  if (!response.ok) return false
  const bytes = new Uint8Array(await response.arrayBuffer())
  const path = profileMediaPath(userId, crypto.randomUUID())
  await uploadMedia(db, path, await toWebp(bytes, checkImage(bytes)), 'image/webp')
  await updateProfileExtras(db, userId, { avatar_path: path, avatar_position: positionOf(null) })
  return true
}
