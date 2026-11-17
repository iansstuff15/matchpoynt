import type { SocialPlatform } from '../types/social.ts'

/** Link kinds the profile forms offer, and the sites each must be on (`website` takes any). */
export const socialPlatforms: Record<SocialPlatform, { label: string; hosts: string[] }> = {
  facebook: { label: 'Facebook', hosts: ['facebook.com', 'fb.com'] },
  instagram: { label: 'Instagram', hosts: ['instagram.com'] },
  x: { label: 'X (Twitter)', hosts: ['x.com', 'twitter.com'] },
  tiktok: { label: 'TikTok', hosts: ['tiktok.com'] },
  youtube: { label: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
  threads: { label: 'Threads', hosts: ['threads.net', 'threads.com'] },
  linkedin: { label: 'LinkedIn', hosts: ['linkedin.com'] },
  discord: { label: 'Discord', hosts: ['discord.gg', 'discord.com'] },
  strava: { label: 'Strava', hosts: ['strava.com'] },
  website: { label: 'Website', hosts: [] },
}

export const socialLimits = {
  maxLinks: 10,
  urlMaxLength: 300,
}

/**
 * Club handles (`@riverside`) and usernames: lower-case letters, digits,
 * dots and underscores, starting and ending with a letter or digit.
 */
export const handleRules = {
  minLength: 3,
  maxLength: 30,
  pattern: '^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$',
}
