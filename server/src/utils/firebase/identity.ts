import { firebaseEndpoints } from '@/config/auth'
import { env } from '@/config/env'
import type { AuthTokens } from '@/interfaces/AuthUser'
import { FirebaseError } from '@/utils/firebase/errors'
import { unavailable } from '@/utils/http/errors'

// Firebase Auth's REST API, called with the web API key. Only the API calls
// it; the browser never sees a Firebase token or code.

interface TokenAnswer {
  idToken?: string
  refreshToken?: string
}

async function send<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (cause) {
    throw Object.assign(unavailable("The API couldn't reach Firebase Auth. Check the server's internet connection."), { cause })
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } | string; error_description?: string }
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error.toUpperCase() : (data.error?.message ?? `HTTP_${response.status}`)
    throw new FirebaseError(message, response.status)
  }
  return data
}

function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
  return send<T>(`${firebaseEndpoints.identity}/accounts:${method}?key=${env().FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function tokensOf(answer: TokenAnswer): AuthTokens {
  if (!answer.idToken || !answer.refreshToken) throw new FirebaseError('MISSING_TOKENS', 502)
  return { idToken: answer.idToken, refreshToken: answer.refreshToken }
}

export async function signUpWithPassword(email: string, password: string): Promise<AuthTokens> {
  return tokensOf(await call<TokenAnswer>('signUp', { email, password, returnSecureToken: true }))
}

/** A guest account (Firebase's Anonymous provider). */
export async function signUpGuest(): Promise<AuthTokens> {
  return tokensOf(await call<TokenAnswer>('signUp', { returnSecureToken: true }))
}

export async function signInWithPassword(email: string, password: string): Promise<AuthTokens> {
  return tokensOf(await call<TokenAnswer>('signInWithPassword', { email, password, returnSecureToken: true }))
}

/** Renews the ID token. Firebase's token endpoint answers in snake_case. */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const answer = await send<{ id_token?: string; refresh_token?: string }>(`${firebaseEndpoints.token}?key=${env().FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  return tokensOf({ idToken: answer.id_token, refreshToken: answer.refresh_token })
}

/** Emails a sign-in link. Opening it lands on `continueUrl` (the API's `/auth/action`). Creates the account if there is none. */
export async function sendSignInLink(email: string, continueUrl: string): Promise<void> {
  await call('sendOobCode', { requestType: 'EMAIL_SIGNIN', email, continueUrl, canHandleCodeInApp: true })
}

export async function signInWithEmailLink(email: string, oobCode: string): Promise<AuthTokens> {
  return tokensOf(await call<TokenAnswer>('signInWithEmailLink', { email, oobCode }))
}

export async function sendPasswordReset(email: string, continueUrl: string): Promise<void> {
  await call('sendOobCode', { requestType: 'PASSWORD_RESET', email, continueUrl })
}

export async function sendEmailVerification(idToken: string, continueUrl: string): Promise<void> {
  await call('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken, continueUrl })
}

/** Checks a reset code without using it, and says whose account it's for. */
export async function checkResetCode(oobCode: string): Promise<string> {
  return (await call<{ email: string }>('resetPassword', { oobCode })).email
}

/** Uses a reset code to set the new password. Returns the account's email. */
export async function resetPassword(oobCode: string, newPassword: string): Promise<string> {
  return (await call<{ email: string }>('resetPassword', { oobCode, newPassword })).email
}

/** Applies an email-confirmation code. */
export async function confirmEmail(oobCode: string): Promise<void> {
  await call('update', { oobCode })
}

/** Sets or changes the signed-in account's password. Firebase answers with fresh tokens. */
export async function updatePassword(idToken: string, password: string): Promise<AuthTokens> {
  return tokensOf(await call<TokenAnswer>('update', { idToken, password, returnSecureToken: true }))
}

/** Starts a Google/Apple sign-in. The provider sends the browser back to `continueUri` with a code. */
export async function startProviderSignIn(providerId: string, continueUri: string, scope: string): Promise<{ authUri: string; sessionId: string }> {
  const answer = await call<{ authUri?: string; sessionId?: string }>('createAuthUri', {
    providerId,
    continueUri,
    authFlowType: 'CODE_FLOW',
    oauthScope: scope,
  })
  if (!answer.authUri || !answer.sessionId) throw new FirebaseError('MISSING_AUTH_URI', 502)
  return { authUri: answer.authUri, sessionId: answer.sessionId }
}

/** Finishes a Google/Apple sign-in from the URL the provider returned to. */
export async function finishProviderSignIn(requestUri: string, sessionId: string): Promise<AuthTokens> {
  const answer = await call<TokenAnswer & { needConfirmation?: boolean; errorMessage?: string }>('signInWithIdp', {
    requestUri,
    sessionId,
    returnSecureToken: true,
    returnIdpCredential: true,
  })
  if (answer.errorMessage) throw new FirebaseError(answer.errorMessage, 400)
  if (answer.needConfirmation) throw new FirebaseError('NEEDS_CONFIRMATION', 409)
  return tokensOf(answer)
}
