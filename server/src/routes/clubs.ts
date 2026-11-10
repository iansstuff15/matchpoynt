import type { ClubListResponse, ClubView, SessionView } from '@matchpoynt/shared'
import { Hono, type Context } from 'hono'
import {
  countClubs,
  createInvite,
  revokeInvite,
  createClub,
  createPlan,
  deleteClub,
  deleteMember,
  deletePlan,
  listClubMedia,
  listClubs,
  loadClubRow,
  loadClubSessions,
  loadMembers,
  loadPlanRow,
  loadPlans,
  planFromRow,
  removeMedia,
  saveMember,
  sessionCoverInUse,
  setClubImage,
  setClubPosition,
  setClubTheme,
  toSummary,
  setPlanCover,
  startPlannedSession,
  updateClubInfo,
  updatePlan,
  uploadMedia,
} from '@/queries/clubs'
import { createBadge, deleteBadge, loadBadgeRows, loadClubHistory, setBadgeIcon, toBadgeView, updateBadge } from '@/queries/clubBadges'
import { env } from '@/config/env'
import { features } from '@/config/features'
import { cleanPosition, cleanTheme } from '@/utils/club/appearance'
import { addBadgeBlockedReason, careerTotals, cleanBadge, memberCareerBadges } from '@/utils/club/badges'
import { checkBadgeIcon, checkImage, mediaPath } from '@/utils/club/media'
import { downloadGif } from '@/utils/gif/giphy'
import { toWebp as convert } from '@/utils/image/webp'
import { addClubBlockedReason, addMemberBlockedReason, addPlanBlockedReason, cleanClubInfo, cleanMember, cleanPlan, planToSetup } from '@/utils/club/rules'
import { conflict, notFound } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { body, currentUser, requireCompleteProfile, requireUser, resolveUser } from '@/utils/http/middleware'
import type { AppEnv } from '@/utils/http/types'
import { uploadedImage } from '@/utils/http/upload'
import { engineContext } from '@/utils/session/context'
import { createSession } from '@/utils/session/setup'
import { toSessionView } from '@/utils/session/view'
import {
  badgeIconFromGifSchema,
  clubBadgeSchema,
  clubImageKind,
  clubInfoSchema,
  clubMemberSchema,
  clubThemeSchema,
  photoPositionSchema,
  plannedSessionSchema,
  sendInviteSchema,
  uuidParam,
} from '@/utils/validation/schemas'
import { actionUrl } from '@/utils/auth/returnTo'
import { authFailure } from '@/utils/firebase/errors'
import { sendSignInLink } from '@/utils/firebase/identity'
import { newPublicSlug } from '@/utils/session/publish'


function idParam(c: Context, name: string): string {
  const parsed = uuidParam.safeParse(c.req.param(name))
  if (!parsed.success) throw notFound('Not found.')
  return parsed.data
}

const clubNotFound = () => notFound('Club not found. The link may be wrong, or the club belongs to another account.')
const badgeNotFound = () => notFound('That badge no longer exists. It may have been deleted on another device.')
const planNotFound = () => notFound('That planned session no longer exists. It may have been started or deleted on another device.')

/** The caller's club (RLS hides everyone else's), or 404. */
async function ownClub(c: Context<AppEnv>) {
  const row = await loadClubRow(c.get('db'), idParam(c, 'id'))
  if (!row) throw clubNotFound()
  return row
}

/** Everything the club manager page shows. Every change answers with it, so the page never computes anything. */
async function clubView(c: Context<AppEnv>, clubId: string): Promise<ClubView> {
  const db = c.get('db')
  const row = await loadClubRow(db, clubId)
  if (!row) throw clubNotFound()
  const badgesOn = features().web.clubBadges
  const [members, planned, sessions, badgeRows, history] = await Promise.all([
    loadMembers(db, clubId),
    loadPlans(db, clubId),
    loadClubSessions(db, clubId),
    badgesOn ? loadBadgeRows(db, clubId) : [],
    badgesOn ? loadClubHistory(db, clubId) : null,
  ])
  const badges = badgeRows.map(toBadgeView)
  const career = history ? careerTotals(history) : new Map()
  return {
    club: toSummary(row, members.length, planned.length),
    members: members.map((m) => ({ ...m, badges: memberCareerBadges(m.name, badges, career) })),
    // Members who have left drop off the plans' rosters.
    planned: planned.map((p) => ({ ...p, memberIds: p.memberIds.filter((id) => members.some((m) => m.id === id)) })),
    sessions,
    badges,
  }
}

const respond = async (c: Context<AppEnv>, clubId: string) => c.json(await clubView(c, clubId))

/** An uploaded photo, checked (size, real type) and ready to convert. */
const checkedImage = (bytes: Uint8Array) => ({ bytes, type: checkImage(bytes) })
const toWebp = ({ bytes, type }: ReturnType<typeof checkedImage>) => convert(bytes, type)

/** A badge icon ready to store: GIFs as they are (so they keep moving), everything else as WebP. */
async function badgeIconFile(bytes: Uint8Array): Promise<{ bytes: Uint8Array; type: 'image/gif' | 'image/webp' }> {
  const type = checkBadgeIcon(bytes)
  return type === 'image/gif' ? { bytes, type } : { bytes: await convert(bytes, type), type: 'image/webp' }
}

/** One of the club's badges, or 404. */
async function ownBadge(c: Context<AppEnv>, clubId: string) {
  const badgeId = idParam(c, 'badgeId')
  const badge = (await loadBadgeRows(c.get('db'), clubId)).find((b) => b.id === badgeId)
  if (!badge) throw badgeNotFound()
  return badge
}

/** Stores a badge's new icon and drops the old one. */
async function replaceBadgeIcon(c: Context<AppEnv>, clubId: string, badge: { id: string; icon_path: string | null }, file: Awaited<ReturnType<typeof badgeIconFile>>, source: 'upload' | 'giphy') {
  const db = c.get('db')
  const path = mediaPath(currentUser(c).id, clubId, 'badge', crypto.randomUUID(), file.type)
  await uploadMedia(db, path, file.bytes, file.type)
  await setBadgeIcon(db, clubId, badge.id, path, source)
  await removeMedia(db, [badge.icon_path])
}

/** The club manager: clubs, their rosters, planned sessions and photos. Signed-in (or guest) owners only, and RLS checks every row. */
export const clubRoutes = new Hono<AppEnv>()
  .use(requireFeature('web', 'clubs'))
  .use(resolveUser)
  .use(requireUser)
  .use(requireCompleteProfile)
  .get('/', async (c) => {
    const response: ClubListResponse = { clubs: await listClubs(c.get('db')) }
    return c.json(response)
  })
  .post('/', async (c) => {
    const info = cleanClubInfo(await body(c, clubInfoSchema))
    const db = c.get('db')
    const blocked = addClubBlockedReason(await countClubs(db))
    if (blocked) throw conflict(blocked)
    const row = await createClub(db, crypto.randomUUID(), info)
    return c.json(await clubView(c, row.id), 201)
  })
  .get('/:id', async (c) => respond(c, idParam(c, 'id')))
  .put('/:id', async (c) => {
    const club = await ownClub(c)
    await updateClubInfo(c.get('db'), club.id, cleanClubInfo(await body(c, clubInfoSchema)))
    return respond(c, club.id)
  })
  .delete('/:id', async (c) => {
    const user = currentUser(c)
    const club = await ownClub(c)
    const db = c.get('db')
    // Photos go too, except covers that sessions already run still show.
    const media = await listClubMedia(db, user.id, club.id)
    const inUse = await Promise.all(media.map((p) => sessionCoverInUse(db, p)))
    await deleteClub(db, club.id)
    await removeMedia(
      db,
      media.filter((_, i) => !inUse[i]),
    )
    return c.body(null, 204)
  })

  // Club photos
  .put('/:id/:kind{avatar|cover}', async (c) => {
    const user = currentUser(c)
    const club = await ownClub(c)
    const kind = clubImageKind.parse(c.req.param('kind'))
    // Stored as WebP whatever was uploaded.
    const webp = await toWebp(await uploadedImage(c).then(checkedImage))
    const db = c.get('db')
    const path = mediaPath(user.id, club.id, kind, crypto.randomUUID())
    await uploadMedia(db, path, webp, 'image/webp')
    const column = kind === 'avatar' ? 'avatar_path' : 'cover_path'
    await setClubImage(db, club.id, column, path)
    await removeMedia(db, [club[column]])
    return respond(c, club.id)
  })
  // Where a photo sits in its frame (dragged and zoomed in the photo editor).
  .put('/:id/:kind{avatar|cover}/position', async (c) => {
    const club = await ownClub(c)
    const kind = clubImageKind.parse(c.req.param('kind'))
    if (!club[kind === 'avatar' ? 'avatar_path' : 'cover_path']) throw conflict('Upload a photo before aligning it.')
    const position = cleanPosition(await body(c, photoPositionSchema))
    await setClubPosition(c.get('db'), club.id, kind === 'avatar' ? 'avatar_position' : 'cover_position', position)
    return respond(c, club.id)
  })
  // The club's colours for the app (accent and sidebar); null colours mean Matchpoynt's own.
  .put('/:id/theme', async (c) => {
    const club = await ownClub(c)
    await setClubTheme(c.get('db'), club.id, cleanTheme(await body(c, clubThemeSchema)))
    return respond(c, club.id)
  })
  .delete('/:id/:kind{avatar|cover}', async (c) => {
    const club = await ownClub(c)
    const column = clubImageKind.parse(c.req.param('kind')) === 'avatar' ? 'avatar_path' : 'cover_path'
    const db = c.get('db')
    await setClubImage(db, club.id, column, null)
    await removeMedia(db, [club[column]])
    return respond(c, club.id)
  })

  // Members
  .post('/:id/members', async (c) => {
    const club = await ownClub(c)
    const member = cleanMember(await body(c, clubMemberSchema))
    const db = c.get('db')
    const blocked = addMemberBlockedReason((await loadMembers(db, club.id)).length)
    if (blocked) throw conflict(blocked)
    await saveMember(db, club.id, crypto.randomUUID(), member)
    return respond(c, club.id)
  })
  .put('/:id/members/:memberId', async (c) => {
    const club = await ownClub(c)
    const memberId = idParam(c, 'memberId')
    const member = cleanMember(await body(c, clubMemberSchema))
    const db = c.get('db')
    if (!(await loadMembers(db, club.id)).some((m) => m.id === memberId)) throw notFound('That member is no longer in the club.')
    await saveMember(db, club.id, memberId, member)
    return respond(c, club.id)
  })
  // Invites: email a member a sign-in link that brings them to /invite/<token>.
  .post('/:id/members/:memberId/invite', requireFeature('web', 'signIn'), requireFeature('web', 'signInEmail'), async (c) => {
    const club = await ownClub(c)
    const memberId = idParam(c, 'memberId')
    const { email } = await body(c, sendInviteSchema)
    const db = c.get('db')
    const member = (await loadMembers(db, club.id)).find((m) => m.id === memberId)
    if (!member) throw notFound('That member is no longer in the club.')
    if (member.linked) throw conflict(`${member.name} has already joined with their own account.`)
    const token = newPublicSlug()
    const address = email.trim().toLowerCase()
    await createInvite(db, club.id, member.id, address, token)
    // New accounts are created by the link; the invite page then asks for their profile and a password.
    try {
      await sendSignInLink(address, actionUrl(`/invite/${token}`, address))
    } catch (error) {
      throw authFailure(error, "Couldn't send the invite email")
    }
    return respond(c, club.id)
  })
  .delete('/:id/members/:memberId/invite', async (c) => {
    const club = await ownClub(c)
    if (!(await revokeInvite(c.get('db'), club.id, idParam(c, 'memberId')))) throw notFound('That member has no open invite.')
    return respond(c, club.id)
  })
  .delete('/:id/members/:memberId', async (c) => {
    const club = await ownClub(c)
    if (!(await deleteMember(c.get('db'), club.id, idParam(c, 'memberId')))) throw notFound('That member is no longer in the club.')
    return respond(c, club.id)
  })

  // Club badges: conditions checked by the API, icons uploaded or picked from GIF search.
  .post('/:id/badges', requireFeature('web', 'clubBadges'), async (c) => {
    const club = await ownClub(c)
    const badge = cleanBadge(await body(c, clubBadgeSchema))
    const db = c.get('db')
    const blocked = addBadgeBlockedReason((await loadBadgeRows(db, club.id)).length)
    if (blocked) throw conflict(blocked)
    await createBadge(db, club.id, crypto.randomUUID(), badge)
    return respond(c, club.id)
  })
  .put('/:id/badges/:badgeId', requireFeature('web', 'clubBadges'), async (c) => {
    const club = await ownClub(c)
    const badge = cleanBadge(await body(c, clubBadgeSchema))
    if (!(await updateBadge(c.get('db'), club.id, idParam(c, 'badgeId'), badge))) throw badgeNotFound()
    return respond(c, club.id)
  })
  .delete('/:id/badges/:badgeId', requireFeature('web', 'clubBadges'), async (c) => {
    const club = await ownClub(c)
    const db = c.get('db')
    const icon = await deleteBadge(db, club.id, idParam(c, 'badgeId'))
    if (icon === undefined) throw badgeNotFound()
    await removeMedia(db, [icon])
    return respond(c, club.id)
  })
  .put('/:id/badges/:badgeId/icon', requireFeature('web', 'clubBadges'), async (c) => {
    const club = await ownClub(c)
    const badge = await ownBadge(c, club.id)
    await replaceBadgeIcon(c, club.id, badge, await badgeIconFile(await uploadedImage(c)), 'upload')
    return respond(c, club.id)
  })
  // A GIF picked from search: the API fetches it from GIPHY and stores it, so leaderboards never load from GIPHY.
  .post('/:id/badges/:badgeId/icon/gif', requireFeature('web', 'clubBadges'), requireFeature('web', 'gifSearch'), async (c) => {
    const club = await ownClub(c)
    const badge = await ownBadge(c, club.id)
    const { gifId } = await body(c, badgeIconFromGifSchema)
    const bytes = await downloadGif(env().GIPHY_API_KEY ?? '', gifId)
    await replaceBadgeIcon(c, club.id, badge, await badgeIconFile(bytes), 'giphy')
    return respond(c, club.id)
  })
  .delete('/:id/badges/:badgeId/icon', requireFeature('web', 'clubBadges'), async (c) => {
    const club = await ownClub(c)
    const badge = await ownBadge(c, club.id)
    await setBadgeIcon(c.get('db'), club.id, badge.id, null, null)
    await removeMedia(c.get('db'), [badge.icon_path])
    return respond(c, club.id)
  })

  // Planned sessions
  .post('/:id/plans', async (c) => {
    const club = await ownClub(c)
    const db = c.get('db')
    const [members, plans] = await Promise.all([loadMembers(db, club.id), loadPlans(db, club.id)])
    const blocked = addPlanBlockedReason(plans.length)
    if (blocked) throw conflict(blocked)
    const plan = cleanPlan(await body(c, plannedSessionSchema), members)
    await createPlan(db, club.id, crypto.randomUUID(), plan)
    return respond(c, club.id)
  })
  .put('/:id/plans/:planId', async (c) => {
    const club = await ownClub(c)
    const db = c.get('db')
    const planId = idParam(c, 'planId')
    if (!(await loadPlanRow(db, club.id, planId))) throw planNotFound()
    const plan = cleanPlan(await body(c, plannedSessionSchema), await loadMembers(db, club.id))
    await updatePlan(db, club.id, planId, plan)
    return respond(c, club.id)
  })
  .delete('/:id/plans/:planId', async (c) => {
    const club = await ownClub(c)
    const db = c.get('db')
    const row = await loadPlanRow(db, club.id, idParam(c, 'planId'))
    if (!row) throw planNotFound()
    await deletePlan(db, club.id, row.id)
    await removeMedia(db, [row.cover_path])
    return respond(c, club.id)
  })
  .put('/:id/plans/:planId/cover', async (c) => {
    const user = currentUser(c)
    const club = await ownClub(c)
    const db = c.get('db')
    const row = await loadPlanRow(db, club.id, idParam(c, 'planId'))
    if (!row) throw planNotFound()
    const webp = await toWebp(await uploadedImage(c).then(checkedImage))
    const path = mediaPath(user.id, club.id, 'plan', crypto.randomUUID())
    await uploadMedia(db, path, webp, 'image/webp')
    await setPlanCover(db, row.id, path)
    await removeMedia(db, [row.cover_path])
    return respond(c, club.id)
  })
  .delete('/:id/plans/:planId/cover', async (c) => {
    const club = await ownClub(c)
    const db = c.get('db')
    const row = await loadPlanRow(db, club.id, idParam(c, 'planId'))
    if (!row) throw planNotFound()
    await setPlanCover(db, row.id, null)
    await removeMedia(db, [row.cover_path])
    return respond(c, club.id)
  })
  // Starting a plan makes it the running session: the board opens it at /app.
  .post('/:id/plans/:planId/start', async (c) => {
    const user = currentUser(c)
    const club = await ownClub(c)
    const db = c.get('db')
    const row = await loadPlanRow(db, club.id, idParam(c, 'planId'))
    if (!row) throw planNotFound()
    const members = await loadMembers(db, club.id)
    const state = createSession(user.id, planToSetup(planFromRow(row), members), engineContext())
    const version = await startPlannedSession(db, row.id, state)
    const view: SessionView = toSessionView({ ...state, clubId: row.club_id, version })
    return c.json(view, 201)
  })
