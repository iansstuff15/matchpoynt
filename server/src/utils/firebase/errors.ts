import { ApiError, invalid, unavailable } from '@/utils/http/errors'

/** An error answer from Firebase Auth, e.g. `EMAIL_EXISTS` or `WEAK_PASSWORD : Password should be at least 6 characters`. */
export class FirebaseError extends Error {
  readonly code: string
  readonly detail: string
  readonly status: number

  constructor(message: string, status: number) {
    const [code = 'UNKNOWN', ...rest] = message.split(' : ')
    super(`Firebase Auth: ${message}`)
    this.code = code.trim()
    this.detail = rest.join(' : ').trim()
    this.status = status
  }
}

/** Refresh answers that mean the sign-in is over (signed out elsewhere, deleted, disabled), not that Firebase failed. */
const sessionGone = new Set(['TOKEN_EXPIRED', 'USER_DISABLED', 'USER_NOT_FOUND', 'INVALID_REFRESH_TOKEN', 'INVALID_GRANT_TYPE', 'MISSING_REFRESH_TOKEN', 'PROJECT_NUMBER_MISMATCH'])

export const isSessionGone = (error: unknown) => error instanceof FirebaseError && sessionGone.has(error.code)

/** Firebase Auth errors in plain words, keyed by its error codes. */
export function authFailure(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error
  if (!(error instanceof FirebaseError)) return Object.assign(unavailable("The API couldn't reach Firebase Auth."), { cause: error })
  const cause = { cause: error }
  switch (error.code) {
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
    case 'QUOTA_EXCEEDED':
      return Object.assign(new ApiError('conflict', 'Too many attempts. Wait a minute, then try again.'), cause)
    case 'WEAK_PASSWORD':
      return invalid(`That password is too easy to guess. ${error.detail}`.trim(), { account: 'Weak password' })
    case 'INVALID_EMAIL':
      return invalid("That email address isn't valid.", { account: 'Invalid email' })
    case 'EMAIL_EXISTS':
      return invalid('An account with that email already exists. Sign in, or reset your password.', { account: 'Email in use' })
    case 'USER_DISABLED':
      return new ApiError('forbidden', 'This account has been disabled. Contact the club or site owner.')
    case 'INVALID_OOB_CODE':
    case 'EXPIRED_OOB_CODE':
      return new ApiError('unauthorized', 'This link has expired or was already used. Each link works once, for a limited time. Request a new one.')
    case 'CREDENTIAL_TOO_OLD_LOGIN_AGAIN':
      return new ApiError('forbidden', 'For security, Firebase wants a fresh sign-in before a password change. Sign in again (an email link works), then set it.')
    case 'OPERATION_NOT_ALLOWED':
    case 'ADMIN_ONLY_OPERATION':
      return Object.assign(
        unavailable('This sign-in method is turned off in Firebase (Authentication > Sign-in method). Turn it on, or use another method.'),
        cause,
      )
    case 'API_KEY_INVALID':
    case 'API_KEY_SERVICE_BLOCKED':
    case 'CONFIGURATION_NOT_FOUND':
      return Object.assign(unavailable('Firebase Auth refused the API key. Check FIREBASE_API_KEY and FIREBASE_PROJECT_ID in the API environment.'), cause)
  }
  if (error.status >= 500) return Object.assign(unavailable("The API couldn't reach Firebase Auth."), cause)
  return Object.assign(new ApiError('server_error', `${fallback} (${error.code}).`), cause)
}
