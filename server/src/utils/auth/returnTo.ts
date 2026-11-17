import { env } from '@/config/env'

/**
 * Pages someone may be sent back to after signing in (e.g. after their sign-in
 * expired). Anything else goes to the board, so a crafted link can't redirect off-site.
 */
const returnPages = new Set(['/app', '/start', '/choose-club', '/profile', '/record', '/explore', '/friends', '/play', '/clubs', '/rankings', '/account/password', '/reset-password', '/complete-profile'])

/**
 * A session's page (`/app/<session id>`), a player's live view of one (`/play/<session id>`), a club's dashboard (`/clubs/<club id>`) or one of its pages
 * (`/clubs/<club id>/members`…). Only a UUID and a known page may follow, so nothing else slips through.
 */
const idPages = /^\/((app|play)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|clubs\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/(sessions|members|badges|feedback|announcements|invoices|expenses|billers|accounting))?)$/i
/** A club invite (`/invite/<token>`): only a 22-character token may follow. */
const invitePage = /^\/invite\/[A-Za-z0-9_-]{22}$/
/** A club's join page (`/join/<handle>`), its page for players (`/c/<handle>`) or someone's profile (`/u/<username>`): only a handle may follow. */
const joinPage = /^\/join\/[a-z0-9._]{3,30}$/
const playerClubPage = /^\/(c|u)\/[a-z0-9._]{3,30}$/

export const isJoinPage = (path: string) => joinPage.test(path)

export const isInvitePage = (path: string) => invitePage.test(path)

export const defaultReturnPath = '/app'

/** The page to return to: the one asked for when it's allowed, otherwise the board. */
export function returnPath(requested: string | null | undefined): string {
  return requested && (returnPages.has(requested) || idPages.test(requested) || isInvitePage(requested) || isJoinPage(requested) || playerClubPage.test(requested)) ? requested : defaultReturnPath
}

/**
 * Where a sign-in lands: an unfinished profile comes first, then the page they
 * came from. An invite page has its own sign-up form, so it goes there directly.
 */
export function afterSignIn(next: string, profileComplete: boolean): string {
  // Invite and join pages have their own profile form, so they go there directly.
  if (!profileComplete && !isInvitePage(next) && !isJoinPage(next)) return '/complete-profile'
  // Signing in without somewhere particular to go: the start page, where players pick a club and
  // "both" accounts pick how they're using the app this time.
  return next === defaultReturnPath ? startPath : next
}

/** Where a sign-in lands when it wasn't sent somewhere particular. */
export const startPath = '/start'

/**
 * An emailed link of the API's own (it sends the emails itself): straight to
 * /api/auth/action with Firebase's code, the page to return to and, for
 * invites, the email the link was sent to.
 */
export function actionLink(mode: string, oobCode: string, next = defaultReturnPath, email?: string): string {
  const query = new URLSearchParams({ mode, oobCode, next: returnPath(next) })
  if (email) query.set('email', email)
  return `${env().APP_URL}/api/auth/action?${query}`
}

/** Where Google or Apple send the browser back to. It must be listed in the OAuth client's redirect URIs. */
export const providerCallbackUrl = () => `${env().APP_URL}/api/auth/callback`
