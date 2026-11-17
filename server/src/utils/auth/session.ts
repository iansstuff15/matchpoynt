import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { authCookies, authLifetimes } from '@/config/auth'
import { env } from '@/config/env'
import type { AuthTokens, AuthUser } from '@/interfaces/AuthUser'
import { grantDatabaseRole } from '@/utils/firebase/admin'
import { authFailure, FirebaseError, isSessionGone } from '@/utils/firebase/errors'
import { refreshTokens, signUpGuest } from '@/utils/firebase/identity'
import { isRejectedToken, verifyIdToken } from '@/utils/firebase/verify'
import { unavailable } from '@/utils/http/errors'

/** A verified sign-in: who it is, and the tokens Supabase and Firebase calls are made with. */
export interface AuthSession {
  user: AuthUser
  tokens: AuthTokens
}

const cookieOptions = (maxAge: number) =>
  ({ path: '/', httpOnly: true, secure: env().NODE_ENV === 'production', sameSite: 'Lax', maxAge }) as const

/**
 * Verifies fresh Firebase tokens and makes sure they carry `role: authenticated`.
 * A new account doesn't yet: the claim is granted once, then the token renewed to include it.
 */
export async function authorize(tokens: AuthTokens): Promise<AuthSession> {
  const user = await verifyIdToken(tokens.idToken)
  if (user.hasRole) return { user, tokens }
  try {
    await grantDatabaseRole(user.id)
    const renewed = await refreshTokens(tokens.refreshToken)
    return { user: await verifyIdToken(renewed.idToken), tokens: renewed }
  } catch (error) {
    throw authFailure(error, "Couldn't finish setting up the account")
  }
}

/** Stores a sign-in in httpOnly cookies. The browser carries them but can't read them. */
export function saveSession(c: Context, tokens: AuthTokens): void {
  setCookie(c, authCookies.id, tokens.idToken, cookieOptions(authLifetimes.sessionSeconds))
  setCookie(c, authCookies.refresh, tokens.refreshToken, cookieOptions(authLifetimes.sessionSeconds))
}

export function endSession(c: Context): void {
  deleteCookie(c, authCookies.id, { path: '/' })
  deleteCookie(c, authCookies.refresh, { path: '/' })
}

/**
 * Who is calling, from the session cookies. An expired ID token is renewed from
 * the refresh token (and the cookies updated). A sign-in that ended elsewhere
 * (revoked, deleted, disabled) clears the cookies and counts as signed out.
 */
/**
 * Accounts must confirm their email before they count as signed in. Guests have
 * no email; Google and invite links confirm it themselves.
 */
export const emailConfirmed = (user: Pick<AuthUser, 'isAnonymous' | 'emailVerified'>) => user.isAnonymous || user.emailVerified

/** Drops this browser's sign-in and answers "nobody". */
function signedOut(c: Context): null {
  endSession(c)
  return null
}

export async function readSession(c: Context): Promise<AuthSession | null> {
  const refreshToken = getCookie(c, authCookies.refresh)
  if (!refreshToken) return null
  const idToken = getCookie(c, authCookies.id)
  if (idToken) {
    try {
      const user = await verifyIdToken(idToken)
      if (!emailConfirmed(user)) return signedOut(c)
      if (user.hasRole) return { user, tokens: { idToken, refreshToken } }
    } catch (error) {
      if (!isRejectedToken(error)) throw error
    }
  }
  try {
    const session = await authorize(await refreshTokens(refreshToken))
    if (!emailConfirmed(session.user)) return signedOut(c)
    saveSession(c, session.tokens)
    return session
  } catch (error) {
    if (isSessionGone(error) || isRejectedToken(error)) {
      endSession(c)
      return null
    }
    throw authFailure(error, "Couldn't check who is signed in")
  }
}

/** A guest for this browser (sign-in is off), so its sessions still have an owner and RLS still applies. */
export async function startGuest(c: Context): Promise<AuthSession> {
  let tokens: AuthTokens
  try {
    tokens = await signUpGuest()
  } catch (error) {
    if (error instanceof FirebaseError && (error.code === 'OPERATION_NOT_ALLOWED' || error.code === 'ADMIN_ONLY_OPERATION')) {
      throw Object.assign(
        unavailable('Sign-in is switched off, and guest sessions need the Anonymous provider turned on in Firebase (Authentication > Sign-in method).'),
        { cause: error },
      )
    }
    throw authFailure(error, "Couldn't start a guest session")
  }
  const session = await authorize(tokens)
  saveSession(c, session.tokens)
  return session
}
