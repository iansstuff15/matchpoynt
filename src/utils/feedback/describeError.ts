import type { ErrorReport } from '@/interfaces/ErrorReport'
import { ApiRequestError } from '@/utils/api/errors'

const hints: Partial<Record<ApiRequestError['code'], string>> = {
  network: 'Check your internet connection. If you run Matchpoynt yourself, make sure the API is running (pnpm dev).',
  unauthorized: 'Sign in again, then retry.',
  forbidden: 'Make sure you are signed in with the account that owns this session.',
  not_found: 'It may have been removed. Reload the page to see the latest.',
  conflict: 'The latest version has been loaded. Check it, then try again.',
  unavailable: 'This is a server-side problem. Try again in a moment; if it keeps happening, share the reference below.',
  server_error: 'Try again. If it keeps happening, share the reference below.',
}

/** Shortens long ids in paths so references stay readable. */
const shortPath = (path: string) => path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, (id) => `${id.slice(0, 8)}…`)

/**
 * Explains a failed action precisely: what was being done, what the API said,
 * which fields were wrong, and a reference that matches the API's log line.
 * `action` completes the sentence "Couldn't …", e.g. "start the match on Court 2".
 */
export function describeError(error: unknown, action: string): ErrorReport {
  const title = `Couldn't ${action}`
  if (!(error instanceof ApiRequestError)) {
    return { title, message: error instanceof Error ? error.message : 'An unexpected error occurred in the app.', hint: 'Reload the page and try again.', fields: [], reference: null }
  }

  const reference = [
    error.status ? `HTTP ${error.status}` : 'No response',
    error.code,
    `${error.method} ${shortPath(error.path)}`,
    error.requestId ? `ref ${error.requestId}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    title,
    message: error.message,
    // On the sign-in endpoints "sign in again" is what the user is already doing.
    hint: error.code === 'invalid' || (error.code === 'unauthorized' && error.path.startsWith('/api/auth/')) ? null : (hints[error.code] ?? null),
    fields: Object.entries(error.fields).map(([field, message]) => ({ field, message })),
    reference,
  }
}
