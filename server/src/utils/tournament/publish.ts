import { env } from '@/config/env'

/** The public tournament page for a published slug (`/t/<slug>`). Slugs come from `newPublicSlug`. */
export function tournamentUrl(slug: string | null): string | null {
  return slug ? `${env().APP_URL}/t/${slug}` : null
}
