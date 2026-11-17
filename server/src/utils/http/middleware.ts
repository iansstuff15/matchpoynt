import type { Context, MiddlewareHandler } from 'hono'
import type { ZodType } from 'zod'
import { env } from '@/config/env'
import { features } from '@/config/features'
import { loadProfile } from '@/queries/profiles'
import { readSession, startGuest } from '@/utils/auth/session'
import { ApiError, invalid } from '@/utils/http/errors'
import type { AppEnv } from '@/utils/http/types'
import { manageClubsBlockedReason, missingFields, runSessionsBlockedReason } from '@/utils/profile/rules'
import { supabaseAs } from '@/utils/supabase/client'

const isWrite = (method: string) => !['GET', 'HEAD', 'OPTIONS'].includes(method)

/**
 * Resolves who is calling from the session cookies (a verified Firebase ID
 * token). When the sign-in feature is off, the first write from a browser
 * creates a guest (Firebase anonymous sign-in), so sessions still have an
 * owner and RLS still applies. Reads never create guests, so crawlers and
 * idle visits don't make accounts.
 */
export const resolveUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  let session = await readSession(c)
  if (!session && !features().web.signIn && isWrite(c.req.method)) session = await startGuest(c)
  c.set('db', supabaseAs(session?.tokens.idToken ?? null))
  c.set('user', session?.user ?? null)
  c.set('tokens', session?.tokens ?? null)
  await next()
}

/** Answers 401 unless `resolveUser` found or created a user. */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get('user')) {
    throw new ApiError('unauthorized', features().web.signIn ? 'You are not signed in, or your sign-in expired. Sign in to continue.' : 'Start a session first.')
  }
  await next()
}

/**
 * Signed-in people must finish their profile before they can change anything.
 * The web app sends them to the form first; this stops anyone skipping it.
 */
export const requireCompleteProfile: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get('user')
  if (user && !user.isAnonymous && features().web.signIn && isWrite(c.req.method)) {
    const missing = missingFields(await loadProfile(c.get('db'), user.id))
    if (missing.length) {
      throw new ApiError('forbidden', `Finish your profile first. Missing: ${missing.join(', ')}.`, { profile: missing.join(',') })
    }
  }
  await next()
}

/**
 * Club management (creating clubs, their rosters, money and settings) is for
 * accounts that run sessions. Player-only accounts are refused with how to
 * change that; the web app hides those screens from them too.
 */
export const requireClubManager: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get('user')
  if (user && !user.isAnonymous && features().web.signIn) {
    const blocked = manageClubsBlockedReason((await loadProfile(c.get('db'), user.id)).role, false)
    if (blocked) throw new ApiError('forbidden', blocked)
  }
  await next()
}

/**
 * The session board (sessions, their history and invoices, member
 * suggestions while adding players) is for accounts that run sessions.
 * Player-only accounts are refused with how to change that.
 */
export const requireSessionRunner: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get('user')
  if (user && !user.isAnonymous && features().web.signIn) {
    const blocked = runSessionsBlockedReason((await loadProfile(c.get('db'), user.id)).role, false)
    if (blocked) throw new ApiError('forbidden', blocked)
  }
  await next()
}

/** The caller, after `requireUser`. */
export function currentUser(c: Context<AppEnv>) {
  const user = c.get('user')
  if (!user) throw new ApiError('unauthorized', 'Sign in to continue.')
  return user
}

/**
 * Cookie auth needs CSRF protection: state-changing requests must come from
 * our own origin. SameSite=Lax cookies are the first layer; this is the second.
 */
export const sameOrigin: MiddlewareHandler = async (c, next) => {
  if (isWrite(c.req.method)) {
    const allowed = new URL(env().APP_URL).origin
    const origin = c.req.header('Origin')
    const site = c.req.header('Sec-Fetch-Site')
    const ok = origin ? origin === allowed : site === 'same-origin'
    if (!ok) throw new ApiError('forbidden', `Blocked: this change came from ${origin ?? 'an unknown page'}, not from ${allowed}. If that is this site, set APP_URL to match.`)
  }
  await next()
}

/** The version the client last saw, from `If-Match`. */
export function expectedVersion(c: Context): number {
  const version = Number(c.req.header('If-Match'))
  if (!Number.isInteger(version) || version < 1) throw invalid('The request is missing the session version (If-Match header). Reload the page and try again.')
  return version
}

/** Parses and shape-checks a JSON body. */
export async function body<T>(c: Context, schema: ZodType<T>): Promise<T> {
  const raw = await c.req.json().catch(() => {
    throw invalid('The request body was not valid JSON.')
  })
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    // Name the exact fields, e.g. "games.0.a: Too big: expected number to be <=99".
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.') || 'body', i.message]))
    const first = parsed.error.issues[0]
    const where = first?.path.length ? `${first.path.join('.')}: ` : ''
    throw invalid(`Invalid request. ${where}${first?.message ?? 'Unexpected shape.'}`, fields)
  }
  return parsed.data
}
