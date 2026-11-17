import type { AccountLookupResponse, MeResponse, NameCheckResponse, SignInResponse, SignUpResponse } from '@matchpoynt/shared'
import { Hono, type Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { authCookies, authLifetimes, oauthProviders } from '@/config/auth'
import { env } from '@/config/env'
import { features } from '@/config/features'
import { accountIdByUsername, loadProfileCard, saveProfile, usernameTaken } from '@/queries/profiles'
import { afterSignIn, providerCallbackUrl, returnPath } from '@/utils/auth/returnTo'
import { authorize, emailConfirmed, endSession, readSession, saveSession, type AuthSession } from '@/utils/auth/session'
import { accountIdByEmail, emailOfAccount } from '@/utils/firebase/admin'
import { loginName } from '@/utils/auth/login'
import { actionMode, linkProblem, linkProblemPath } from '@/utils/auth/actionLinks'
import { sendEmailChangeEmail, sendPasswordResetEmail, sendVerificationEmail } from '@/utils/email/authEmails'
import { authFailure, FirebaseError } from '@/utils/firebase/errors'
import {
  checkResetCode,
  applyEmailCode,
  checkActionCode,
  confirmEmail,
  finishProviderSignIn,
  resetPassword,
  signInWithEmailLink,
  signInWithPassword,
  signUpWithPassword,
  startProviderSignIn,
  updatePassword,
} from '@/utils/firebase/identity'
import { ApiError, invalid, notFound } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { body } from '@/utils/http/middleware'
import { adoptProviderPhoto } from '@/utils/profile/providerPhoto'
import { assertValidProfile, passwordProblem, usernameTakenError, usernameTakenMessage } from '@/utils/profile/rules'
import { handleProblem, normalizeHandle } from '@/utils/social/handles'
import { anonSupabase } from '@/utils/supabase/anon'
import { currentUser } from '@/utils/profile/status'
import { supabaseAs } from '@/utils/supabase/client'
import {
  forgotPasswordSchema,
  passwordSignInSchema,
  resetPasswordSchema,
  changeEmailSchema,
  signUpSchema,
  accountLookupSchema,
  nameCheckQuery,
} from '@/utils/validation/schemas'

type OAuthProvider = keyof typeof oauthProviders
const isOAuthProvider = (value: string): value is OAuthProvider => value in oauthProviders

const handshake = { path: '/api/auth', httpOnly: true, sameSite: 'Lax', maxAge: authLifetimes.handshakeSeconds } as const
const secureHandshake = () => ({ ...handshake, secure: env().NODE_ENV === 'production' })

/** Signs the browser in and says where to land: an unfinished profile first, then the page asked for. */
async function finishSignIn(c: Context, session: AuthSession, next: string) {
  // No sign-in path may hand out cookies for an account whose email isn't confirmed.
  if (!emailConfirmed(session.user)) throw new ApiError('forbidden', 'Confirm your email first: open the link we sent you, then sign in.')
  saveSession(c, session.tokens)
  const user = await currentUser(supabaseAs(session.tokens.idToken), session.user)
  return { user, redirectTo: afterSignIn(next, user.profileComplete) }
}

/** Links and provider round trips end in a redirect, not an error body, so the cause is logged here under the request id. */
function logFailure(c: Context, what: string, error: unknown) {
  console.error(`[${c.get('requestId')}] auth: ${what}`, error)
}

function readHandshake(raw: string | undefined): { sessionId: string; next: string } | null {
  try {
    const parsed = raw ? (JSON.parse(raw) as { sessionId?: unknown; next?: unknown }) : null
    return parsed && typeof parsed.sessionId === 'string' ? { sessionId: parsed.sessionId, next: returnPath(String(parsed.next)) } : null
  } catch {
    return null
  }
}

async function newPassword(c: Context): Promise<string> {
  const { password } = await body(c, resetPasswordSchema)
  const weak = passwordProblem(password)
  if (weak) throw invalid(weak, { password: weak })
  return password
}

/**
 * Sign-in runs entirely here, against Firebase Auth. The browser only follows
 * redirects and carries httpOnly cookies; it never sees a token or a link's code.
 */
/** The email to sign in with: the one typed, or the one behind a username; `null` when there's none. */
async function loginEmail(typed: string): Promise<string | null> {
  const name = loginName(typed)
  if (!name) return null
  if (name.kind === 'email') return name.email
  const userId = await accountIdByUsername(name.username)
  if (!userId) return null
  try {
    return await emailOfAccount(userId)
  } catch (error) {
    throw authFailure(error, 'Sign-in failed')
  }
}

export const authRoutes = new Hono()
  .use(requireFeature('web', 'signIn'))
  .get('/me', async (c) => {
    const session = await readSession(c)
    const response: MeResponse = { user: session ? await currentUser(supabaseAs(session.tokens.idToken), session.user) : null }
    return c.json(response)
  })
  .get('/oauth/:provider', async (c) => {
    const provider = c.req.param('provider')
    if (!isOAuthProvider(provider) || !features().web[oauthProviders[provider].feature]) throw notFound('Not found.')
    const { firebaseId, scope } = oauthProviders[provider]
    try {
      const { authUri, sessionId } = await startProviderSignIn(firebaseId, providerCallbackUrl(), scope)
      setCookie(c, authCookies.oauth, JSON.stringify({ sessionId, next: returnPath(c.req.query('next')) }), secureHandshake())
      return c.redirect(authUri)
    } catch (error) {
      logFailure(c, `${provider} sign-in refused to start`, error)
      return c.redirect(`${env().APP_URL}/sign-in?error=provider`)
    }
  })
  // Google or Apple send the browser back here with a code; Firebase exchanges it for a sign-in.
  .get('/callback', async (c) => {
    const app = env().APP_URL
    const started = readHandshake(getCookie(c, authCookies.oauth))
    deleteCookie(c, authCookies.oauth, { path: handshake.path })
    if (!started) return c.redirect(`${app}/sign-in?error=missing_code`)
    if (c.req.query('error')) return c.redirect(`${app}/sign-in?error=cancelled`)
    try {
      const requestUri = `${providerCallbackUrl()}${new URL(c.req.url).search}`
      const signedIn = await finishProviderSignIn(requestUri, started.sessionId, providerCallbackUrl())
      const session = await authorize(signedIn.tokens)
      // Someone without a profile photo gets their Google photo. Best effort: a photo never blocks signing in.
      // A provider that hasn't confirmed the email doesn't sign anyone in.
      if (!emailConfirmed(session.user)) return c.redirect(`${app}/sign-in?error=unconfirmed`)
      await adoptProviderPhoto(supabaseAs(session.tokens.idToken), session.user.id, signedIn.photoUrl).catch((error) => logFailure(c, 'provider photo not adopted', error))
      return c.redirect(`${app}${(await finishSignIn(c, session, started.next)).redirectTo}`)
    } catch (error) {
      logFailure(c, 'provider sign-in failed', error)
      const reason = error instanceof FirebaseError && error.code === 'NEEDS_CONFIRMATION' ? 'linked' : 'exchange'
      return c.redirect(`${app}/sign-in?error=${reason}`)
    }
  })
  // Email or username, then password. A username is turned into its account's email here; the browser never sees it.
  .post('/sign-in', requireFeature('web', 'signInEmail'), async (c) => {
    const { email: typed, password, next } = await body(c, passwordSignInSchema)
    const wrong = () =>
      new ApiError(
        'unauthorized',
        "The email, username or password is incorrect. If you've only signed in with Google or a club invite link, you haven't set a password yet: use \"Forgot password?\" to set one.",
        { password: 'Incorrect' },
      )
    const email = await loginEmail(typed)
    if (!email) throw wrong()
    let session: AuthSession
    try {
      session = await authorize(await signInWithPassword(email, password))
    } catch (error) {
      if (error instanceof FirebaseError && ['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD', 'EMAIL_NOT_FOUND'].includes(error.code)) throw wrong()
      throw authFailure(error, 'Sign-in failed')
    }
    if (!emailConfirmed(session.user)) {
      await sendVerificationEmail(email, returnPath(next)).catch((error) => logFailure(c, 'verification resend failed', error))
      throw new ApiError('forbidden', `Confirm your email first: open the link we sent to ${loginName(typed)?.kind === 'email' ? email : 'your email address'}. We've just sent a new one.`)
    }
    const response: SignInResponse = await finishSignIn(c, session, returnPath(next))
    return c.json(response)
  })
  // Whether a username is free, while someone types it (sign-up, complete profile, profile settings).
  .get('/username-check', async (c) => {
    const parsed = nameCheckQuery.safeParse(c.req.query())
    if (!parsed.success) throw invalid('Type a username to check.', { username: 'Missing' })
    const value = normalizeHandle(parsed.data.value)
    const problem = handleProblem(value, 'username')
    const session = await readSession(c)
    const taken = !problem && (await usernameTaken(anonSupabase(), value, session?.user.id ?? null))
    const response: NameCheckResponse = { value, available: !problem && !taken, reason: problem ?? (taken ? usernameTakenMessage(value) : null) }
    return c.json(response)
  })
  // Who an email or username belongs to, so the password step can greet them with their photo and username.
  // Unknown ones answer `account: null`.
  .post('/lookup', requireFeature('web', 'signInEmail'), async (c) => {
    const name = loginName((await body(c, accountLookupSchema)).email)
    let userId: string | null = null
    try {
      if (name?.kind === 'email') userId = await accountIdByEmail(name.email)
      else if (name) userId = await accountIdByUsername(name.username)
    } catch (error) {
      throw authFailure(error, "Couldn't look up the account")
    }
    const response: AccountLookupResponse = { account: userId ? await loadProfileCard(userId) : null }
    return c.json(response)
  })
  .post('/sign-up', requireFeature('web', 'signUp'), async (c) => {
    const { email, password, profile, next } = await body(c, signUpSchema)
    const weak = passwordProblem(password)
    assertValidProfile(profile, weak ? { account: weak } : {})
    // Checked before the account exists, so a taken username doesn't leave half an account behind.
    if (await usernameTaken(anonSupabase(), normalizeHandle(profile.username), null)) throw usernameTakenError(profile.username)
    try {
      const session = await authorize(await signUpWithPassword(email, password))
      // The account saves its own profile now (RLS), then confirms its email before it can sign in.
      await saveProfile(supabaseAs(session.tokens.idToken), profile, new Date())
      await sendVerificationEmail(email, returnPath(next))
    } catch (error) {
      throw authFailure(error, "Couldn't create the account")
    }
    const response: SignUpResponse = { confirmEmail: true }
    return c.json(response, 201)
  })
  .post('/forgot-password', requireFeature('web', 'passwordReset'), async (c) => {
    const { email: typed } = await body(c, forgotPasswordSchema)
    // An email or a username; a username's link goes to its account's email, which the browser never learns.
    const email = await loginEmail(typed)
    if (!email) return c.body(null, 204)
    try {
      await sendPasswordResetEmail(email)
    } catch (error) {
      // Same answer whether or not the email has an account, so the form can't be used to find accounts.
      if (!(error instanceof FirebaseError && error.code === 'EMAIL_NOT_FOUND')) throw authFailure(error, "Couldn't send the reset email")
    }
    return c.body(null, 204)
  })
  // After opening a reset email: the link's code waits in a cookie until the new password is chosen.
  .post('/reset-password', requireFeature('web', 'passwordReset'), async (c) => {
    const code = getCookie(c, authCookies.reset)
    if (!code) throw new ApiError('unauthorized', 'This reset link has expired or was already used. Request a new one from "Forgot password".')
    const password = await newPassword(c)
    try {
      const email = await resetPassword(code, password)
      deleteCookie(c, authCookies.reset, { path: handshake.path })
      // Opening the emailed link proved the address, so the reset also signs this browser in.
      saveSession(c, (await authorize(await signInWithPassword(email, password))).tokens)
    } catch (error) {
      throw authFailure(error, "Couldn't change the password")
    }
    return c.body(null, 204)
  })
  // Signed in already (e.g. by an email link or Google): set or change the password from the account menu.
  .post('/password', requireFeature('web', 'signInEmail'), async (c) => {
    const session = await readSession(c)
    if (!session || session.user.isAnonymous) throw new ApiError('unauthorized', 'Sign in first, then set your password.')
    const password = await newPassword(c)
    try {
      saveSession(c, await updatePassword(session.tokens.idToken, password))
    } catch (error) {
      throw authFailure(error, "Couldn't change the password")
    }
    return c.body(null, 204)
  })
  // A new sign-in email for the signed-in account: Firebase emails a link to it, and the change happens once it's opened.
  .post('/email', requireFeature('web', 'signInEmail'), async (c) => {
    const { email } = await body(c, changeEmailSchema)
    const session = await readSession(c)
    if (!session || session.user.isAnonymous || !session.user.email) throw new ApiError('unauthorized', 'Sign in to change your email.')
    const next = email.trim().toLowerCase()
    if (next === (session.user.email ?? '').toLowerCase()) throw invalid('That is already your sign-in email.', { email: 'Unchanged' })
    try {
      await sendEmailChangeEmail(session.user.email, next, '/profile')
    } catch (error) {
      throw authFailure(error, "Couldn't send the link to your new email")
    }
    return c.body(null, 204)
  })
  // Every emailed Firebase link ends here: with Firebase's action URL set to this route, or
  // forwarded by Firebase's own page as the continue URL. `mode` says what the link is for.
  .get('/action', async (c) => {
    const app = env().APP_URL
    const continued = c.req.query('continueUrl')
    const params = continued ? new URL(continued, app).searchParams : new URLSearchParams(new URL(c.req.url).search)
    const next = returnPath(params.get('next') ?? c.req.query('next'))
    const email = params.get('email') ?? c.req.query('email')
    const mode = actionMode(c.req.query('mode'))
    const code = c.req.query('oobCode')
    // Back from a page Firebase handled itself (e.g. its own reset form): just continue.
    if (!code) return c.redirect(`${app}${next === '/reset-password' ? '/sign-in' : next}`)
    if (!mode) return c.redirect(`${app}${linkProblemPath('invalid', null)}`)
    try {
      if (mode === 'signIn') {
        if (!email) return c.redirect(`${app}/sign-in?error=missing_code`)
        const session = await authorize(await signInWithEmailLink(email, code))
        return c.redirect(`${app}${(await finishSignIn(c, session, next)).redirectTo}`)
      }
      if (mode === 'verifyEmail') {
        await confirmEmail(code)
        return c.redirect(`${app}/auth/email-confirmed?next=${encodeURIComponent(next)}`)
      }
      if (mode === 'resetPassword') {
        await checkResetCode(code)
        setCookie(c, authCookies.reset, code, secureHandshake())
        return c.redirect(`${app}/reset-password`)
      }
      if (mode === 'verifyAndChangeEmail') {
        // The account now signs in with the new email; this browser signs in again with it.
        const changed = await applyEmailCode(code)
        endSession(c)
        return c.redirect(`${app}/auth/email-changed${changed ? `?email=${encodeURIComponent(changed)}` : ''}`)
      }
      // recoverEmail: "Undo this change" from the email-change email puts the old email back.
      const { email: restored } = await checkActionCode(code)
      await applyEmailCode(code)
      endSession(c)
      return c.redirect(`${app}/auth/email-restored${restored ? `?email=${encodeURIComponent(restored)}` : ''}`)
    } catch (error) {
      logFailure(c, `${mode} link failed`, error)
      return c.redirect(`${app}${linkProblemPath(linkProblem(error), mode)}`)
    }
  })
  .post('/signout', (c) => {
    endSession(c)
    return c.body(null, 204)
  })
