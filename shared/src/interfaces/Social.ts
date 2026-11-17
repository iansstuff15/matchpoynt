import type { SocialPlatform } from '../types/social.ts'

/** One link on a club's or a person's profile. */
export interface SocialLink {
  platform: SocialPlatform
  /** A full https:// address, tidied by the API. */
  url: string
}

/** Body of saving a club's or a person's links (the whole list, in order). */
export interface SocialLinksInput {
  links: SocialLink[]
}

/** Whether a handle or username is free (`GET /api/clubs/handle-check`, `GET /api/auth/username-check`). */
export interface NameCheckResponse {
  /** As it would be saved: lower case, without the "@". */
  value: string
  available: boolean
  /** Why it can't be used, in the user's words; `null` when it can. */
  reason: string | null
}
