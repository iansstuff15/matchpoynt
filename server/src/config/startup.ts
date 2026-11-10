import { env } from '@/config/env'
import { features } from '@/config/features'

/**
 * Reads the environment and feature toggles once, so a missing variable or a
 * malformed FEATURE_* value fails at startup (or the function's cold start), not on first request.
 */
export function checkStartup(): void {
  const { GIPHY_API_KEY } = env()
  const { web } = features()
  if (web.gifSearch && !GIPHY_API_KEY) {
    throw new Error('FEATURE_WEB_GIF_SEARCH is on but GIPHY_API_KEY is missing. Add the key (developers.giphy.com) or turn GIF search off. See .env.example.')
  }
}
