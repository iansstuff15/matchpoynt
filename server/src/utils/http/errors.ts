import type { ApiErrorBody, ApiErrorCode } from '@matchpoynt/shared'

const statusByCode: Record<ApiErrorCode, 400 | 401 | 403 | 404 | 409 | 500 | 503> = {
  invalid: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  unavailable: 503,
  server_error: 500,
}

/** An error that is safe to show the user. Anything else becomes a generic 500. */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly fields?: Record<string, string>

  constructor(code: ApiErrorCode, message: string, fields?: Record<string, string>) {
    super(message)
    this.code = code
    this.fields = fields
  }

  get status() {
    return statusByCode[this.code]
  }

  toBody(requestId?: string): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fields && { fields: this.fields }),
        ...(requestId && { requestId }),
      },
    }
  }
}

export const invalid = (message: string, fields?: Record<string, string>) => new ApiError('invalid', message, fields)
export const conflict = (message: string) => new ApiError('conflict', message)
export const notFound = (message: string) => new ApiError('not_found', message)
export const unavailable = (message: string) => new ApiError('unavailable', message)
