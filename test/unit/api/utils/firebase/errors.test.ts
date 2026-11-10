import { describe, expect, it } from 'vitest'
import { authFailure, FirebaseError, isSessionGone } from '@/utils/firebase/errors'
import { ApiError } from '@/utils/http/errors'

describe('FirebaseError', () => {
  it('splits the code from the detail Firebase appends', () => {
    const error = new FirebaseError('WEAK_PASSWORD : Password should be at least 6 characters', 400)
    expect(error.code).toBe('WEAK_PASSWORD')
    expect(error.detail).toBe('Password should be at least 6 characters')
  })

  it('keeps a bare code', () => {
    const error = new FirebaseError('EMAIL_EXISTS', 400)
    expect(error.code).toBe('EMAIL_EXISTS')
    expect(error.detail).toBe('')
  })
})

describe('isSessionGone', () => {
  it('treats a revoked or deleted sign-in as signed out', () => {
    expect(isSessionGone(new FirebaseError('TOKEN_EXPIRED', 400))).toBe(true)
    expect(isSessionGone(new FirebaseError('USER_NOT_FOUND', 400))).toBe(true)
    expect(isSessionGone(new FirebaseError('INVALID_REFRESH_TOKEN', 400))).toBe(true)
  })

  it('does not hide Firebase failing', () => {
    expect(isSessionGone(new FirebaseError('HTTP_503', 503))).toBe(false)
    expect(isSessionGone(new Error('fetch failed'))).toBe(false)
  })
})

describe('authFailure', () => {
  it('names the field at fault for a weak password or a taken email', () => {
    const weak = authFailure(new FirebaseError('WEAK_PASSWORD : Password should be at least 6 characters', 400), 'x')
    expect(weak.code).toBe('invalid')
    expect(weak.message).toContain('Password should be at least 6 characters')
    expect(weak.fields).toEqual({ account: 'Weak password' })
    expect(authFailure(new FirebaseError('EMAIL_EXISTS', 400), 'x').fields).toEqual({ account: 'Email in use' })
  })

  it('asks to wait when rate limited', () => {
    expect(authFailure(new FirebaseError('TOO_MANY_ATTEMPTS_TRY_LATER', 400), 'x').code).toBe('conflict')
  })

  it('says which Firebase setting is off', () => {
    const off = authFailure(new FirebaseError('OPERATION_NOT_ALLOWED', 400), 'x')
    expect(off.code).toBe('unavailable')
    expect(off.message).toContain('Authentication > Sign-in method')
  })

  it('explains an expired or used link', () => {
    expect(authFailure(new FirebaseError('EXPIRED_OOB_CODE', 400), 'x').code).toBe('unauthorized')
    expect(authFailure(new FirebaseError('INVALID_OOB_CODE', 400), 'x').message).toContain('Request a new one')
  })

  it('treats network failures and Firebase outages as unavailable', () => {
    expect(authFailure(new Error('fetch failed'), 'x').code).toBe('unavailable')
    expect(authFailure(new FirebaseError('HTTP_503', 503), 'x').code).toBe('unavailable')
  })

  it('passes ApiErrors through and names unknown codes with the action', () => {
    const own = new ApiError('forbidden', 'nope')
    expect(authFailure(own, 'x')).toBe(own)
    const unknown = authFailure(new FirebaseError('SOMETHING_NEW', 400), "Couldn't create the account")
    expect(unknown.code).toBe('server_error')
    expect(unknown.message).toBe("Couldn't create the account (SOMETHING_NEW).")
  })
})
