import { firebaseEndpoints } from '@/config/auth'
import { env } from '@/config/env'
import type { AuthTokens } from '@/interfaces/AuthUser'
import { linkProviderToEmail } from '@/utils/firebase/admin'
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

export async function signInWithEmailLink(email: string, oobCode: string): Promise<AuthTokens> {
  return tokensOf(await call<TokenAnswer>('signInWithEmailLink', { email, oobCode }))
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

/** Uses an emailed link's code (email confirmation, a change of email, or undoing one) and says which email the account now has. */
export async function applyEmailCode(oobCode: string): Promise<string | null> {
  return (await call<{ email?: string }>('update', { oobCode })).email ?? null
}

/** What an emailed link's code is for, without using it: its kind, the account's email and, for a change, the new one. */
export async function checkActionCode(oobCode: string): Promise<{ requestType: string | null; email: string | null; newEmail: string | null }> {
  const info = await call<{ requestType?: string; email?: string; newEmail?: string }>('resetPassword', { oobCode })
  return { requestType: info.requestType ?? null, email: info.email ?? null, newEmail: info.newEmail ?? null }
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

interface IdpAnswer extends TokenAnswer {
  needConfirmation?: boolean
  errorMessage?: string
  email?: string
  emailVerified?: boolean
  providerId?: string
  displayName?: string
  photoUrl?: string
  federatedId?: string
  rawUserInfo?: string
  oauthIdToken?: string
  oauthAccessToken?: string
}

/** A finished provider sign-in, and the photo on the provider's account (Google's), if any. */
export interface ProviderSignIn {
  tokens: AuthTokens
  photoUrl: string | null
}

/** The provider's own id for the person (Google's `sub`), from the answer. */
function providerUserId(answer: IdpAnswer): string | null {
  try {
    const raw = JSON.parse(answer.rawUserInfo ?? '{}') as { sub?: string; id?: string }
    if (raw.sub ?? raw.id) return String(raw.sub ?? raw.id)
  } catch {
    // Fall back to the federated id below.
  }
  return answer.federatedId?.split('/').pop() || null
}

/**
 * Finishes a Google/Apple sign-in from the URL the provider returned to.
 * When the email already has an account (e.g. made with a password) and
 * Google has confirmed the person owns that email, Google is linked to that
 * account and the sign-in goes through as it: one person, one account. Any
 * other clash is refused (`NEEDS_CONFIRMATION`).
 */
export async function finishProviderSignIn(requestUri: string, sessionId: string, continueUri: string): Promise<ProviderSignIn> {
  const answer = await call<IdpAnswer>('signInWithIdp', { requestUri, sessionId, returnSecureToken: true, returnIdpCredential: true })
  if (answer.errorMessage) throw new FirebaseError(answer.errorMessage, 400)
  if (!answer.needConfirmation) return { tokens: tokensOf(answer), photoUrl: answer.photoUrl ?? null }

  const rawId = providerUserId(answer)
  const credential = answer.oauthIdToken ? `id_token=${answer.oauthIdToken}` : answer.oauthAccessToken ? `access_token=${answer.oauthAccessToken}` : null
  if (answer.providerId !== 'google.com' || !answer.emailVerified || !answer.email || !rawId || !credential) throw new FirebaseError('NEEDS_CONFIRMATION', 409)
  await linkProviderToEmail(answer.email, { providerId: answer.providerId, rawId, email: answer.email, displayName: answer.displayName, photoUrl: answer.photoUrl })
  // Signed in again with the same Google credential: now it belongs to the existing account.
  const linked = await call<IdpAnswer>('signInWithIdp', {
    requestUri: continueUri,
    postBody: `${credential}&providerId=${answer.providerId}`,
    returnSecureToken: true,
    returnIdpCredential: true,
  })
  if (linked.errorMessage) throw new FirebaseError(linked.errorMessage, 400)
  if (linked.needConfirmation) throw new FirebaseError('NEEDS_CONFIRMATION', 409)
  return { tokens: tokensOf(linked), photoUrl: linked.photoUrl ?? answer.photoUrl ?? null }
}
