import { createRemoteJWKSet, errors, jwtVerify } from 'jose'
import { firebaseEndpoints } from '@/config/auth'
import { env } from '@/config/env'
import type { AuthUser } from '@/interfaces/AuthUser'
import { unavailable } from '@/utils/http/errors'

let keys: ReturnType<typeof createRemoteJWKSet> | undefined

/** Errors that mean "this token is no good" (expired, forged, another project), not "Google is unreachable". */
const rejected = [errors.JWTExpired, errors.JWTClaimValidationFailed, errors.JWSSignatureVerificationFailed, errors.JWSInvalid, errors.JWTInvalid, errors.JWKSNoMatchingKey]

export const isRejectedToken = (error: unknown) => rejected.some((kind) => error instanceof kind)

/**
 * Checks a Firebase ID token's signature against Google's published keys, and
 * that it was issued for this project. Throws one of the `rejected` errors for a bad token.
 */
export async function verifyIdToken(token: string): Promise<AuthUser> {
  keys ??= createRemoteJWKSet(new URL(firebaseEndpoints.keys))
  const project = env().FIREBASE_PROJECT_ID
  let payload
  try {
    ;({ payload } = await jwtVerify(token, keys, { issuer: `${firebaseEndpoints.issuer}${project}`, audience: project, algorithms: ['RS256'] }))
  } catch (error) {
    if (isRejectedToken(error)) throw error
    throw Object.assign(unavailable("The API couldn't fetch Firebase's signing keys to check who is signed in."), { cause: error })
  }
  if (!payload.sub) throw new errors.JWTClaimValidationFailed('missing sub', payload, 'sub', 'missing')
  const firebase = (payload.firebase ?? {}) as { sign_in_provider?: string }
  return {
    id: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    emailVerified: payload.email_verified === true,
    isAnonymous: firebase.sign_in_provider === 'anonymous',
    name: typeof payload.name === 'string' ? payload.name : null,
    hasRole: payload.role === 'authenticated',
  }
}
