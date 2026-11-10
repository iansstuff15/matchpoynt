import type { ApiErrorBody, ApiErrorCode } from '@matchpoynt/shared'
import type { HttpMethod } from '@/interfaces/ApiRequest'

/** Statuses the proxy (nginx, or Vite in dev) returns when the API itself didn't answer. */
const gatewayStatuses = new Set([502, 503, 504])

function fallbackMessage(status: number): string {
  if (status === 0) return 'No response from the Matchpoynt API. You may be offline, or the API is not running.'
  if (gatewayStatuses.has(status)) {
    return `The web server got no answer from the Matchpoynt API (HTTP ${status}). The API is stopped or restarting. If you run it yourself, check the terminal running pnpm dev.`
  }
  return `The Matchpoynt API answered HTTP ${status} without an explanation.`
}

/** A failed API call. Everything needed to explain it precisely is kept here. */
export class ApiRequestError extends Error {
  readonly status: number
  readonly code: ApiErrorCode | 'network'
  readonly fields: Record<string, string>
  readonly requestId: string | null
  readonly method: HttpMethod
  readonly path: string

  constructor(method: HttpMethod, path: string, status: number, body: ApiErrorBody | null, requestId: string | null) {
    super(body?.error.message ?? fallbackMessage(status))
    this.method = method
    this.path = path
    this.status = status
    this.code = status === 0 ? 'network' : (body?.error.code ?? (gatewayStatuses.has(status) ? 'unavailable' : 'server_error'))
    this.fields = (body?.error.fields ?? {}) as Record<string, string>
    this.requestId = body?.error.requestId ?? requestId
  }
}

/** Message to show for any error thrown by the API client. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}
