import type { ApiErrorBody } from '@matchpoynt/shared'
import type { ApiRequestOptions, HttpMethod } from '@/interfaces/ApiRequest'
import { ApiRequestError } from '@/utils/api/errors'

// The only way the web app talks to the backend: same-origin /api, through
// the nginx proxy (or Vite's dev proxy). Auth rides on httpOnly cookies the
// browser sends automatically; no tokens are handled here. Errors are thrown
// with full context for the error banner, never logged or toasted.

export async function api<T>(method: HttpMethod, path: string, { body, form, version, signal }: ApiRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (version !== undefined) headers['If-Match'] = String(version)

  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      // A form sets its own multipart Content-Type, boundary included.
      body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
      credentials: 'same-origin',
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiRequestError(method, `/api${path}`, 0, null, null)
  }

  if (response.status === 204) return undefined as T
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiRequestError(method, `/api${path}`, response.status, data as ApiErrorBody | null, response.headers.get('X-Request-Id'))
  }
  return data as T
}
