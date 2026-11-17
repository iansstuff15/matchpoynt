import { FirebaseError } from '@/utils/firebase/errors'

/** The kinds of emailed link the API handles at /api/auth/action. */
export type ActionMode = 'signIn' | 'verifyEmail' | 'resetPassword' | 'verifyAndChangeEmail' | 'recoverEmail'

/** Why a link didn't work, for the "link problem" page: worn out (expired or already used), or not a link we know. */
export type LinkProblem = 'expired' | 'invalid'

const modes: ActionMode[] = ['signIn', 'verifyEmail', 'resetPassword', 'verifyAndChangeEmail', 'recoverEmail']

/** The link's kind, or `null` for one we don't handle. */
export const actionMode = (raw: string | null | undefined): ActionMode | null => (modes as string[]).includes(raw ?? '') ? (raw as ActionMode) : null

/** Firebase's codes for a link that's past it: expired, or used already (Firebase can't tell those apart). */
const wornOut = new Set(['EXPIRED_OOB_CODE', 'INVALID_OOB_CODE'])

/** Sorts a failed link into what the page tells the person. */
export function linkProblem(error: unknown): LinkProblem {
  return error instanceof FirebaseError && wornOut.has(error.code) ? 'expired' : 'invalid'
}

/** The link problem page's address: why, and which kind of link, so it can say what to do instead. */
export function linkProblemPath(problem: LinkProblem, mode: ActionMode | null): string {
  const query = new URLSearchParams({ reason: problem })
  if (mode) query.set('mode', mode)
  return `/auth/link-error?${query}`
}

/** The one-time code in a link Firebase made (`oobCode=`), or `null`. */
export function oobCodeOf(link: string | null | undefined): string | null {
  if (!link) return null
  try {
    return new URL(link).searchParams.get('oobCode')
  } catch {
    return null
  }
}
