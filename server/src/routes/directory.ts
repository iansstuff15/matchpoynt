import type { ClubAnnouncementView, MemberFeedbackView, ClubDirectoryResponse, JoinClubResponse, MyClubInvitesResponse, PeopleSearchResponse, PlayerClubPageView, MyClubsResponse } from '@matchpoynt/shared'
import { Hono, type Context } from 'hono'
import { features } from '@/config/features'
import { loadDirectory, loadMyInvites, loadPlanAttendees, loadPlayerClubPage, requestJoinClub, requestJoinSession, respondToInvite, searchPeople, signUpForPlan, loadMyClubs } from '@/queries/directory'
import { signUpBlockedReason } from '@/utils/club/signUp'
import { ApiError, conflict, notFound } from '@/utils/http/errors'
import { loadFeedbackPrompts, submitFeedback } from '@/queries/feedback'
import { cleanAnswers } from '@/utils/club/feedback'
import { announcementView, sortAnnouncements } from '@/utils/club/announcements'
import { loadMemberAnnouncements } from '@/queries/announcements'
import { requireFeature } from '@/utils/http/feature'
import { body, requireCompleteProfile, requireUser, resolveUser } from '@/utils/http/middleware'
import type { AppEnv } from '@/utils/http/types'
import { feedbackSubmitSchema, directoryQuery, handleParam, inviteAnswerSchema, peopleQuery, planSignUpSchema, sessionJoinSchema, uuidParam } from '@/utils/validation/schemas'

const clubGone = () => notFound('No club has that handle. The link may be wrong, or the club changed its handle.')

/** The club page for players behind a handle, or 404. */
async function playerPage(c: Context<AppEnv>): Promise<PlayerClubPageView> {
  const handle = handleParam.safeParse(c.req.param('handle'))
  if (!handle.success) throw clubGone()
  const page = await loadPlayerClubPage(c.get('db'), handle.data, { fees: features().web.fees, badges: features().web.clubBadges })
  if (!page) throw clubGone()
  return page
}

/**
 * The club directory for players: every club with a handle, a page at a
 * time; each club's page for players; asking to join a club or one of its
 * sessions; and in-app invites. Signed-in accounts with a complete profile.
 */
export const directoryRoutes = new Hono<AppEnv>()
  .use(requireFeature('web', 'clubs'))
  .use(requireFeature('web', 'signIn'))
  .use(requireFeature('web', 'clubDirectory'))
  .use(resolveUser)
  .use(requireUser)
  .use(requireCompleteProfile)
  .get('/', async (c) => {
    const { q, offset } = directoryQuery.parse(c.req.query())
    const response: ClubDirectoryResponse = await loadDirectory(c.get('db'), q, offset)
    return c.json(response)
  })
  // The clubs the caller is a member of, for the club picker players see when they sign in.
  .get('/mine', async (c) => {
    const response: MyClubsResponse = { clubs: await loadMyClubs(c.get('db')) }
    return c.json(response)
  })
  .get('/invites', async (c) => {
    const response: MyClubInvitesResponse = { invites: await loadMyInvites(c.get('db')) }
    return c.json(response)
  })
  .post('/invites/:inviteId', async (c) => {
    const inviteId = uuidParam.safeParse(c.req.param('inviteId'))
    if (!inviteId.success) throw notFound('That invite is no longer open.')
    const { accept } = await body(c, inviteAnswerSchema)
    await respondToInvite(c.get('db'), inviteId.data, accept)
    const response: MyClubInvitesResponse = { invites: await loadMyInvites(c.get('db')) }
    return c.json(response)
  })
  .get('/:handle', async (c) => c.json(await playerPage(c)))
  // Joins at once when the club approves automatically (or the caller was invited); otherwise waits for the owner.
  .post('/:handle/join', async (c) => {
    const page = await playerPage(c)
    const status = await requestJoinClub(c.get('db'), page.club.id)
    const response: JoinClubResponse = { status, page: await playerPage(c) }
    return c.json(response)
  })
  // A member asks to join a planned session or one running now; the owner decides.
  .post('/:handle/sessions', async (c) => {
    const page = await playerPage(c)
    const { planId, sessionId } = await body(c, sessionJoinSchema)
    await requestJoinSession(c.get('db'), page.club.id, planId, sessionId)
    return c.json(await playerPage(c))
  })
  // A member signs up for a planned session with open sign-up, or takes themselves off one.
  .post('/:handle/plans/:planId/sign-up', async (c) => {
    const page = await playerPage(c)
    const { going } = await body(c, planSignUpSchema)
    const planId = uuidParam.safeParse(c.req.param('planId'))
    const plan = planId.success ? page.sessions.find((s) => s.kind === 'planned' && s.id === planId.data) : undefined
    if (!plan || !planId.success) throw notFound('That session has started or was removed.')
    if (!page.memberId) throw new ApiError('forbidden', 'Join the club to sign up for its sessions.')
    const blocked = signUpBlockedReason(
      { signUp: plan.signUp ?? 'approval', maxPlayers: plan.spotsLeft === null ? null : plan.players + plan.spotsLeft, players: plan.players, when: plan.when, joined: plan.joined },
      going,
      Date.now(),
    )
    if (blocked) throw conflict(blocked)
    await signUpForPlan(c.get('db'), page.club.id, planId.data, going)
    return c.json(await playerPage(c))
  })
  // Who's signed up for a planned session, for the club's members.
  .get('/:handle/plans/:planId/attendees', async (c) => {
    const page = await playerPage(c)
    const planId = uuidParam.safeParse(c.req.param('planId'))
    const attendees = planId.success ? await loadPlanAttendees(c.get('db'), page.club.id, planId.data) : null
    if (!attendees) throw notFound('That session has started or was removed, or you need to join the club to see who is coming.')
    c.header('Cache-Control', 'no-store')
    return c.json(attendees)
  })
  // The club's newest announcements, pinned first, for members only.
  .get('/:handle/announcements', requireFeature('web', 'clubAnnouncements'), async (c) => {
    const page = await playerPage(c)
    const records = await loadMemberAnnouncements(c.get('db'), page.club.id)
    if (!records) throw new ApiError('forbidden', 'Join the club to read its announcements.')
    const now = new Date()
    const response: ClubAnnouncementView[] = sortAnnouncements(records).map((r) => announcementView(r, now))
    c.header('Cache-Control', 'no-store')
    return c.json(response)
  })
  // The club's feedback form and the member's recent sessions to answer for.
  .get('/:handle/feedback', requireFeature('web', 'clubFeedback'), async (c) => {
    const page = await playerPage(c)
    return c.json(await memberFeedback(c, page.club.id))
  })
  .post('/:handle/feedback', requireFeature('web', 'clubFeedback'), async (c) => {
    const page = await playerPage(c)
    const { sessionId, answers } = await body(c, feedbackSubmitSchema)
    const view = await memberFeedback(c, page.club.id)
    if (!view.form) throw conflict("The club has turned its feedback form off, so it isn't taking answers now.")
    const session = view.sessions.find((s) => s.sessionId === sessionId)
    if (!session) throw notFound(`That session isn't one you played in, or it ended too long ago to answer for.`)
    if (session.answered) throw conflict('You have already answered for this session. Thanks!')
    await submitFeedback(c.get('db'), page.club.id, sessionId, cleanAnswers(view.form, answers))
    return c.json(await memberFeedback(c, page.club.id))
  })

/** The member's own feedback for the club's sessions. */
async function memberFeedback(c: Context<AppEnv>, clubId: string): Promise<MemberFeedbackView> {
  const view = await loadFeedbackPrompts(c.get('db'), clubId)
  if (!view) throw new ApiError('forbidden', 'Join the club to answer its feedback form.')
  return view
}

/** People search for adding club members (up to 5, by name, email or @username). */
export const peopleRoutes = new Hono<AppEnv>()
  .use(requireFeature('web', 'clubs'))
  .use(requireFeature('web', 'signIn'))
  .use(resolveUser)
  .use(requireUser)
  .get('/search', async (c) => {
    const parsed = peopleQuery.safeParse(c.req.query())
    const response: PeopleSearchResponse = { people: parsed.success ? await searchPeople(c.get('db'), parsed.data.q, parsed.data.club ?? null) : [] }
    c.header('Cache-Control', 'no-store')
    return c.json(response)
  })
