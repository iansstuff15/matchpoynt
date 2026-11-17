import type { SocialPlatform } from '@matchpoynt/shared'
import { siDiscord, siFacebook, siInstagram, siStrava, siThreads, siTiktok, siX, siYoutube } from 'simple-icons'

/**
 * Each social platform's logo as one 24×24 SVG path, drawn in `currentColor`
 * so it reads on every club theme. Logos come from Simple Icons (CC0); it has
 * no LinkedIn logo (removed at LinkedIn's request), so that one is a plain
 * "in" mark drawn here. `website` uses lucide's globe instead.
 */
export const socialIconPaths: Record<Exclude<SocialPlatform, 'website'>, string> = {
  facebook: siFacebook.path,
  instagram: siInstagram.path,
  x: siX.path,
  tiktok: siTiktok.path,
  youtube: siYoutube.path,
  threads: siThreads.path,
  linkedin:
    'M4 1h16a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3Zm1.5 7.5V19h3.25V8.5Zm1.63-5.25a1.88 1.88 0 1 0 0 3.75 1.88 1.88 0 0 0 0-3.75ZM10.5 8.5V19h3.25v-5.4c0-1.5.6-2.6 2-2.6s1.75 1.15 1.75 2.6V19h3.25v-6.2c0-3-1.5-4.55-3.85-4.55-1.5 0-2.6.7-3.15 1.6V8.5Z',
  discord: siDiscord.path,
  strava: siStrava.path,
}
