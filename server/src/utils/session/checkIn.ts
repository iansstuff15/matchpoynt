import { env } from '@/config/env'

/** Page a player's phone opens from the check-in QR. The slug is a 128-bit token (see newPublicSlug). */
export function checkInUrl(slug: string | null): string | null {
  return slug ? `${env().APP_URL}/check-in/${slug}` : null
}
