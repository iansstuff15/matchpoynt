import { env } from '@/config/env'

/**
 * Pages someone may be sent back to after signing in (e.g. after their sign-in
 * expired). Anything else goes to the board, so a crafted link can't redirect off-site.
 */
const returnPages = new Set(['/app', '/app/past', '/clubs', '/rankings', '/account/password', '/reset-password', '/complete-profile'])

/** A session's page (`/app/<session id>`) or a club's (`/clubs/<club id>`). Only a UUID may follow, so nothing else slips through. */
const idPages = /^\/(app|clubs)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** A club invite (`/invite/<token>`): only a 22-character token may follow. */
const invitePage = /^\/invite\/[A-Za-z0-9_-]{22}$/

export const isInvitePage = (path: string) => invitePage.test(path)

export const defaultReturnPath = '/app'

/** The page to return to: the one asked for when it's allowed, otherwise the board. */
export function returnPath(requested: string | null | undefined): string {
  return requested && (returnPages.has(requested) || idPages.test(requested) || isInvitePage(requested)) ? requested : defaultReturnPath
}

/**
 * Where a sign-in lands: an unfinished profile comes first, then the page they
 * came from. An invite page has its own sign-up form, so it goes there directly.
 */
export function afterSignIn(next: string, profileComplete: boolean): string {
  return profileComplete || isInvitePage(next) ? next : '/complete-profile'
}

/**
 * Where an emailed Firebase link continues to (sign-in, email confirmation,
 * password reset). It carries the page to return to and, for sign-in links,
 * the email Firebase needs to complete them on any device.
 */
export function actionUrl(next = defaultReturnPath, email?: string): string {
  const query = new URLSearchParams({ next: returnPath(next) })
  if (email) query.set('email', email)
  return `${env().APP_URL}/api/auth/action?${query}`
}

/** Where Google or Apple send the browser back to. It must be listed in the OAuth client's redirect URIs. */
export const providerCallbackUrl = () => `${env().APP_URL}/api/auth/callback`
