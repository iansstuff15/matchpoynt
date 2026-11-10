export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface ApiRequestOptions {
  body?: unknown
  /** A multipart form (photo uploads), sent instead of a JSON body. */
  form?: FormData
  /** Session version for optimistic concurrency, sent as If-Match. */
  version?: number
  signal?: AbortSignal
}
