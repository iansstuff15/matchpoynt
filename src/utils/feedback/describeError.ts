import type { ErrorReport } from '@/interfaces/ErrorReport'
import { ApiRequestError } from '@/utils/api/errors'

/** Short, plain causes for failures the API didn't explain. */
const plain = {
  network: "Couldn't reach Matchpoynt. Check your connection and try again.",
  server: 'Matchpoynt had a problem on its side. Try again in a moment.',
  app: 'The page ran into a problem. Reload it and try again.',
}

/**
 * Explains a failed action simply: what was being done, and the API's own
 * message for why (it is written for the user). Status codes, request ids
 * and field lists stay out of the banner; the API logs them under the
 * request id. `action` completes "Couldn't …", e.g. "start the match on Court 2".
 */
export function describeError(error: unknown, action: string): ErrorReport {
  const title = `Couldn't ${action}`
  if (!(error instanceof ApiRequestError)) return { title, message: plain.app }
  if (error.code === 'network') return { title, message: plain.network }
  // Server-side trouble (a missing migration, the database down) is for whoever runs the API, not the person using the app.
  if (error.code === 'server_error' || error.code === 'unavailable') return { title, message: plain.server }
  return { title, message: error.message || plain.server }
}
