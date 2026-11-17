import { describe, expect, it } from 'vitest'
import { actionMode, linkProblem, linkProblemPath, oobCodeOf } from '@/utils/auth/actionLinks'
import { FirebaseError } from '@/utils/firebase/errors'

describe('actionMode', () => {
  it('knows the emailed links the API handles, and nothing else', () => {
    expect(actionMode('verifyAndChangeEmail')).toBe('verifyAndChangeEmail')
    expect(actionMode('recoverEmail')).toBe('recoverEmail')
    expect(actionMode('revertSecondFactorAddition')).toBeNull()
    expect(actionMode(undefined)).toBeNull()
  })
})

describe('linkProblem', () => {
  it('calls an expired or used link expired, and anything else invalid', () => {
    expect(linkProblem(new FirebaseError('EXPIRED_OOB_CODE', 400))).toBe('expired')
    expect(linkProblem(new FirebaseError('INVALID_OOB_CODE', 400))).toBe('expired')
    expect(linkProblem(new FirebaseError('USER_DISABLED', 400))).toBe('invalid')
    expect(linkProblem(new Error('network'))).toBe('invalid')
  })
  it('points at the link problem page with the reason and the kind of link', () => {
    expect(linkProblemPath('expired', 'resetPassword')).toBe('/auth/link-error?reason=expired&mode=resetPassword')
    expect(linkProblemPath('invalid', null)).toBe('/auth/link-error?reason=invalid')
  })
})

describe('oobCodeOf', () => {
  it("takes the one-time code out of the link Firebase made, so the API can send its own", () => {
    expect(oobCodeOf('https://x.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=V1q-abc&apiKey=k')).toBe('V1q-abc')
    expect(oobCodeOf('https://x.firebaseapp.com/__/auth/action?mode=resetPassword')).toBeNull()
    expect(oobCodeOf('not a link')).toBeNull()
    expect(oobCodeOf(undefined)).toBeNull()
  })
})
