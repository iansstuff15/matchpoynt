import { env } from '@/config/env'
import { features } from '@/config/features'

/**
 * Reads the environment and feature toggles once, so a missing variable or a
 * malformed FEATURE_* value fails at startup (or the function's cold start), not on first request.
 */
export function checkStartup(): void {
  const { GIPHY_API_KEY, RESEND_API_KEY } = env()
  const { web } = features()
  if (web.gifSearch && !GIPHY_API_KEY) {
    throw new Error('FEATURE_WEB_GIF_SEARCH is on but GIPHY_API_KEY is missing. Add the key (developers.giphy.com) or turn GIF search off. See .env.example.')
  }
  // Not fatal, so the app runs without mail locally; those emails fail with a plain message until it's set.
  if (web.signIn && !RESEND_API_KEY) {
    console.warn('Sign-in is on but RESEND_API_KEY is not set: password resets, email confirmations and club invites cannot be sent. See .env.example.')
  }
}
