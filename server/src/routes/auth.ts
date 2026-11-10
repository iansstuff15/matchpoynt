import type { MeResponse, SignInResponse, SignUpResponse } from '@matchpoynt/shared'
import { Hono, type Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { authCookies, authLifetimes, oauthProviders } from '@/config/auth'
import { env } from '@/config/env'
import { features } from '@/config/features'
import { saveProfile } from '@/queries/profiles'
import { actionUrl, afterSignIn, providerCallbackUrl, returnPath } from '@/utils/auth/returnTo'
import { authorize, endSession, readSession, saveSession, type AuthSession } from '@/utils/auth/session'
import { hasAccount } from '@/utils/firebase/admin'
import { authFailure, FirebaseError } from '@/utils/firebase/errors'
import {
  checkResetCode,
  confirmEmail,
  finishProviderSignIn,
  resetPassword,
  sendEmailVerification,
  sendPasswordReset,
  sendSignInLink,
  signInWithEmailLink,
  signInWithPassword,
  signUpWithPassword,
  startProviderSignIn,
  updatePassword,
} from '@/utils/firebase/identity'
import { ApiError, invalid, notFound } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { body } from '@/utils/http/middleware'
import { assertValidProfile, passwordProblem } from '@/utils/profile/rules'
import { currentUser } from '@/utils/profile/status'
import { supabaseAs } from '@/utils/supabase/client'
import {
  emailSignInSchema,
  forgotPasswordSchema,
  passwordSignInSchema,
  resetPasswordSchema,
  signUpSchema,
} from '@/utils/validation/schemas'

type OAuthProvider = keyof typeof oauthProviders
const isOAuthProvider = (value: string): value is OAuthProvider => value in oauthProviders

const handshake = { path: '/api/auth', httpOnly: true, sameSite: 'Lax', maxAge: authLifetimes.handshakeSeconds } as const
const secureHandshake = () => ({ ...handshake, secure: env().NODE_ENV === 'production' })

/** Signs the browser in and says where to land: an unfinished profile first, then the page asked for. */
async function finishSignIn(c: Context, session: AuthSession, next: string) {
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
      const session = await authorize(await finishProviderSignIn(requestUri, started.sessionId))
      return c.redirect(`${app}${(await finishSignIn(c, session, started.next)).redirectTo}`)
    } catch (error) {
      logFailure(c, 'provider sign-in failed', error)
      const reason = error instanceof FirebaseError && error.code === 'NEEDS_CONFIRMATION' ? 'linked' : 'exchange'
      return c.redirect(`${app}/sign-in?error=${reason}`)
    }
  })
  .post('/sign-in', requireFeature('web', 'signInEmail'), async (c) => {
    const { email, password, next } = await body(c, passwordSignInSchema)
    let session: AuthSession
    try {
      session = await authorize(await signInWithPassword(email, password))
    } catch (error) {
      if (error instanceof FirebaseError && ['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD', 'EMAIL_NOT_FOUND'].includes(error.code)) {
        throw new ApiError(
          'unauthorized',
          "The email or password is incorrect. If you've only signed in with an email link or Google, you haven't set a password yet: use \"Forgot password?\" to set one, or \"Email me a sign-in link instead\".",
          { password: 'Incorrect' },
        )
      }
      throw authFailure(error, 'Sign-in failed')
    }
    if (!session.user.emailVerified) {
      await sendEmailVerification(session.tokens.idToken, actionUrl(next)).catch((error) => logFailure(c, 'verification resend failed', error))
      throw new ApiError('forbidden', `Confirm your email first: open the link we sent to ${email}. We've just sent a new one.`)
    }
    const response: SignInResponse = await finishSignIn(c, session, returnPath(next))
    return c.json(response)
  })
  .post('/email', requireFeature('web', 'signInEmail'), async (c) => {
    const { email, next } = await body(c, emailSignInSchema)
    // Links only sign in existing accounts (a Firebase link would create one). New accounts come
    // from the sign-up form, where people choose a password. Unknown emails get the same answer
    // as known ones, so the form can't be used to find accounts.
    try {
      if (await hasAccount(email)) await sendSignInLink(email, actionUrl(next, email))
    } catch (error) {
      throw authFailure(error, "Couldn't send the sign-in link")
    }
    return c.body(null, 204)
  })
  .post('/sign-up', requireFeature('web', 'signUp'), async (c) => {
    const { email, password, profile } = await body(c, signUpSchema)
    const weak = passwordProblem(password)
    assertValidProfile(profile, weak ? { account: weak } : {})
    try {
      const session = await authorize(await signUpWithPassword(email, password))
      // The account saves its own profile now (RLS), then confirms its email before it can sign in.
      await saveProfile(supabaseAs(session.tokens.idToken), profile, new Date())
      await sendEmailVerification(session.tokens.idToken, actionUrl())
    } catch (error) {
      throw authFailure(error, "Couldn't create the account")
    }
    const response: SignUpResponse = { confirmEmail: true }
    return c.json(response, 201)
  })
  .post('/forgot-password', requireFeature('web', 'passwordReset'), async (c) => {
    const { email } = await body(c, forgotPasswordSchema)
    try {
      await sendPasswordReset(email, actionUrl('/reset-password'))
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
  // Every emailed Firebase link ends here: with Firebase's action URL set to this route, or
  // forwarded by Firebase's own page as the continue URL. `mode` says what the link is for.
  .get('/action', async (c) => {
    const app = env().APP_URL
    const continued = c.req.query('continueUrl')
    const params = continued ? new URL(continued, app).searchParams : new URLSearchParams(new URL(c.req.url).search)
    const next = returnPath(params.get('next') ?? c.req.query('next'))
    const email = params.get('email') ?? c.req.query('email')
    const mode = c.req.query('mode')
    const code = c.req.query('oobCode')
    // Back from a page Firebase handled itself (e.g. its own reset form): just continue.
    if (!code) return c.redirect(`${app}${next === '/reset-password' ? '/sign-in' : next}`)
    try {
      if (mode === 'signIn') {
        if (!email) return c.redirect(`${app}/sign-in?error=missing_code`)
        const session = await authorize(await signInWithEmailLink(email, code))
        return c.redirect(`${app}${(await finishSignIn(c, session, next)).redirectTo}`)
      }
      if (mode === 'verifyEmail') {
        await confirmEmail(code)
        return c.redirect(`${app}/sign-in?confirmed=1&next=${encodeURIComponent(next)}`)
      }
      if (mode === 'resetPassword') {
        await checkResetCode(code)
        setCookie(c, authCookies.reset, code, secureHandshake())
        return c.redirect(`${app}/reset-password`)
      }
    } catch (error) {
      logFailure(c, `${mode ?? 'unknown'} link failed`, error)
      return c.redirect(`${app}/sign-in?error=exchange`)
    }
    return c.redirect(`${app}/sign-in`)
  })
  .post('/signout', (c) => {
    endSession(c)
    return c.body(null, 204)
  })
