import { importPKCS8, SignJWT } from 'jose'
import { firebaseEndpoints } from '@/config/auth'
import { env } from '@/config/env'
import { oobCodeOf } from '@/utils/auth/actionLinks'
import { FirebaseError } from '@/utils/firebase/errors'
import { unavailable } from '@/utils/http/errors'

// Admin calls, made with the Firebase service account: giving an account the
// `role: authenticated` claim Supabase needs, finding the account an email
// belongs to, linking Google to an existing account with the same email, and
// making the codes for emailed links (the API sends the emails itself). A Google access token is minted from the key and reused until it expires.

let cached: { token: string; expiresAt: number } | undefined

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token
  const { FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = env()
  let key: Awaited<ReturnType<typeof importPKCS8>>
  try {
    key = await importPKCS8(FIREBASE_PRIVATE_KEY, 'RS256')
  } catch (cause) {
    throw Object.assign(unavailable('FIREBASE_PRIVATE_KEY is not a valid private key. Copy private_key from the service account JSON, with its \\n escapes.'), { cause })
  }
  const assertion = await new SignJWT({ scope: firebaseEndpoints.adminScope })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(FIREBASE_CLIENT_EMAIL)
    .setAudience(firebaseEndpoints.oauthToken)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key)
  const response = await fetch(firebaseEndpoints.oauthToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  }).catch((cause) => {
    throw Object.assign(unavailable("The API couldn't reach Google to authorise its Firebase service account."), { cause })
  })
  const data = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string }
  if (!response.ok || !data.access_token) {
    throw Object.assign(
      unavailable('Google refused the Firebase service account. Check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY belong to the same, active key.'),
      { cause: new Error(data.error_description ?? `HTTP ${response.status}`) },
    )
  }
  cached = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 }
  return cached.token
}

async function admin<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const url = `${firebaseEndpoints.identity}/projects/${env().FIREBASE_PROJECT_ID}/accounts:${method}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` },
    body: JSON.stringify(body),
  }).catch((cause) => {
    throw Object.assign(unavailable("The API couldn't reach Firebase Auth."), { cause })
  })
  const data = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } }
  if (!response.ok) throw new FirebaseError(data.error?.message ?? `HTTP_${response.status}`, response.status)
  return data
}

/**
 * Supabase runs a Firebase token as Postgres's `authenticated` role only when it
 * carries `role: authenticated`; without it every query is anonymous and RLS denies it.
 */
export async function grantDatabaseRole(uid: string): Promise<void> {
  await admin('update', { localId: uid, customAttributes: JSON.stringify({ role: 'authenticated' }) })
}


/** The account an email belongs to, or `null` when it has none. */
export async function accountIdByEmail(email: string): Promise<string | null> {
  const answer = await admin<{ users?: { localId: string }[] }>('lookup', { email: [email] })
  return answer.users?.[0]?.localId ?? null
}

/** The email an account signs in with, or `null` when it has none (or no such account). */
export async function emailOfAccount(uid: string): Promise<string | null> {
  const answer = await admin<{ users?: { email?: string }[] }>('lookup', { localId: [uid] })
  return answer.users?.[0]?.email ?? null
}

/**
 * Links a sign-in provider (Google) to the account that already has its email,
 * so the person keeps one account. Only for emails the provider has confirmed.
 */
export async function linkProviderToEmail(
  email: string,
  info: { providerId: string; rawId: string; email: string; displayName?: string; photoUrl?: string },
): Promise<void> {
  const localId = await accountIdByEmail(email)
  if (!localId) throw new FirebaseError('USER_NOT_FOUND', 404)
  await admin('update', { localId, linkProviderUserInfo: info })
}

/** The kinds of emailed link Firebase makes codes for. */
export type ActionCodeRequest = 'PASSWORD_RESET' | 'VERIFY_EMAIL' | 'EMAIL_SIGNIN' | 'VERIFY_AND_CHANGE_EMAIL'

/**
 * A one-time code for an emailed link, made by Firebase without it sending
 * anything (`returnOobLink`): the API sends the email itself, with its own
 * link around the code. `newEmail` is where a change of email goes.
 */
export async function actionCode(requestType: ActionCodeRequest, email: string, continueUrl: string, newEmail?: string): Promise<string> {
  const answer = await admin<{ oobLink?: string }>('sendOobCode', {
    requestType,
    email,
    ...(newEmail && { newEmail }),
    continueUrl,
    canHandleCodeInApp: requestType === 'EMAIL_SIGNIN',
    returnOobLink: true,
  })
  const code = oobCodeOf(answer.oobLink)
  if (!code) throw unavailable("Firebase didn't give the API a link code for the email. Check the service account can manage users.")
  return code
}
