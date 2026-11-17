import type { AcceptInviteResponse, InviteView } from '@matchpoynt/shared'
import { Hono, type Context } from 'hono'
import { acceptInvite, loadInvite } from '@/queries/clubs'
import { saveProfile, usernameTaken } from '@/queries/profiles'
import { mediaUrl } from '@/utils/club/media'
import { ApiError, invalid, notFound } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { body, currentUser, requireUser, resolveUser } from '@/utils/http/middleware'
import type { AppEnv } from '@/utils/http/types'
import { assertValidProfile, passwordProblem, usernameTakenError } from '@/utils/profile/rules'
import { normalizeHandle } from '@/utils/social/handles'
import { profileStatus } from '@/utils/profile/status'
import { saveSession } from '@/utils/auth/session'
import { authFailure } from '@/utils/firebase/errors'
import { updatePassword } from '@/utils/firebase/identity'
import { acceptInviteSchema, inviteToken } from '@/utils/validation/schemas'

const notValid = () => notFound('This invite link is not valid. Check you opened the latest email, or ask the club for a new one.')

function tokenOf(c: Context): string {
  const parsed = inviteToken.safeParse(c.req.param('token'))
  if (!parsed.success) throw notValid()
  return parsed.data
}

/**
 * Club invites, for the person who opened the link (signed in by it). They
 * see what they're joining; a new account fills in the sign-up form and sets
 * its own password, then the API links it to the club member.
 */
export const inviteRoutes = new Hono<AppEnv>()
  .use(requireFeature('web', 'clubs'))
  .use(requireFeature('web', 'signIn'))
  .use(resolveUser)
  .use(requireUser)
  .get('/:token', async (c) => {
    const user = currentUser(c)
    const db = c.get('db')
    const invite = await loadInvite(db, tokenOf(c))
    if (!invite) throw notValid()
    const status = await profileStatus(db, user)
    const response: InviteView = {
      clubName: invite.club_name,
      clubAvatarUrl: mediaUrl(invite.club_avatar_path),
      memberName: invite.member_name,
      email: invite.email,
      status: invite.status,
      forYou: invite.for_caller,
      acceptedByYou: invite.accepted_by_caller,
      signedInAs: user.email,
      needsSignUp: !status.complete,
    }
    c.header('Cache-Control', 'no-store')
    return c.json(response)
  })
  .post('/:token/accept', async (c) => {
    const user = currentUser(c)
    if (user.isAnonymous) throw new ApiError('forbidden', 'Open the invite link from your email to sign in first.')
    const token = tokenOf(c)
    const input = await body(c, acceptInviteSchema)
    const db = c.get('db')
    const invite = await loadInvite(db, token)
    if (!invite || invite.status === 'revoked') throw notValid()
    if (!invite.for_caller) throw new ApiError('forbidden', `This invite was sent to ${invite.email}. Sign out, then open the link from that inbox.`)

    // A new account (made by the link) finishes signing up here: profile and its own password.
    if (!(await profileStatus(db, user)).complete) {
      if (!input.profile) throw invalid('Fill in your profile to join.', { profile: 'Missing' })
      const weak = input.password === null ? 'Choose a password.' : passwordProblem(input.password)
      assertValidProfile(input.profile, weak ? { account: weak } : {})
      if (await usernameTaken(db, normalizeHandle(input.profile.username), user.id)) throw usernameTakenError(input.profile.username)
      const tokens = c.get('tokens')
      if (!tokens) throw new ApiError('unauthorized', 'Open the invite link from your email to sign in first.')
      try {
        saveSession(c, await updatePassword(tokens.idToken, input.password!))
      } catch (error) {
        throw authFailure(error, "Couldn't set your password")
      }
      await saveProfile(db, input.profile, new Date())
    }

    const clubName = await acceptInvite(db, token)
    const response: AcceptInviteResponse = { clubName, redirectTo: '/app' }
    return c.json(response)
  })
