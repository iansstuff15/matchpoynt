import { addQrBlockedReason, cleanQrLabel, paymentQrsOf, uploadedQrPosition } from '@/utils/club/paymentQrs'
import type { ClubFeedbackView, ClubListResponse, ClubSessionsResponse, ClubView, NameCheckResponse, SessionView } from '@matchpoynt/shared'
import { Hono, type Context } from 'hono'
import {
  clubHandleTaken,
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
  setClubFee,
  setClubJoining,
  createAppInvite,
  decideJoinRequest,
  loadJoinRequests,
  loadSessionRequests,
  loadSessionRequest,
  closeSessionRequest,
  setClubSocialLinks,
  setPaymentQrs,
  setSavedThemes,
  setClubTheme,
  toSummary,
  setPlanCover,
  startPlannedSession,
  updateClubInfo,
  updatePlan,
  uploadMedia,
} from '@/queries/clubs'
import { loadFeedbackForm, loadFeedbackHistory, saveFeedbackForm } from '@/queries/feedback'
import { createAnnouncement, deleteAnnouncement, loadAnnouncements, updateAnnouncement } from '@/queries/announcements'
import { addAnnouncementBlockedReason, announcementsView, cleanAnnouncement, pinBlockedReason } from '@/utils/club/announcements'
import { cleanFeedbackForm, feedbackResults, formOf } from '@/utils/club/feedback'
import { createBadge, deleteBadge, loadBadgeRows, loadClubHistory, setBadgeIcon, toBadgeView, updateBadge } from '@/queries/clubBadges'
import { env } from '@/config/env'
import { features } from '@/config/features'
import { cleanPosition, cleanTheme, savedThemesOf, withSavedTheme } from '@/utils/club/appearance'
import { addBadgeBlockedReason, careerTotals, cleanBadge, memberCareerBadges } from '@/utils/club/badges'
import { checkBadgeIcon, checkImage, mediaPath } from '@/utils/club/media'
import { cleanFee } from '@/utils/fees/rules'
import { cleanJoining } from '@/utils/club/joining'
import { loadSession, saveSession } from '@/queries/sessions'
import { addPlayer } from '@/utils/session/engine'
import { handleProblem, normalizeHandle } from '@/utils/social/handles'
import { cleanSocialLinks } from '@/utils/social/links'
import { downloadGif } from '@/utils/gif/giphy'
import { toWebp as convert } from '@/utils/image/webp'
import { clubSetup } from '@/utils/club/setup'
import { addClubBlockedReason, addMemberBlockedReason, addPlanBlockedReason, cleanClubInfo, cleanMember, cleanPlan, planToSetup, tierFor } from '@/utils/club/rules'
import { ApiError, conflict, invalid, notFound } from '@/utils/http/errors'
import { requireFeature } from '@/utils/http/feature'
import { body, currentUser, requireClubManager, requireCompleteProfile, requireUser, resolveUser } from '@/utils/http/middleware'
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
  announcementSchema,
  feedbackFormSchema,
  clubFeeSchema,
  clubJoiningSchema,
  createClubSchema,
  decisionSchema,
  endedSessionsQuery,
  pageOffset,
  nameCheckQuery,
  socialLinksSchema,
  clubThemeSchema,
  photoPositionSchema,
  plannedSessionSchema,
  savedThemeSchema,
  sendInviteSchema,
  uuidParam,
} from '@/utils/validation/schemas'
import { authFailure } from '@/utils/firebase/errors'
import { sendInviteEmail } from '@/utils/email/authEmails'
import { newPublicSlug } from '@/utils/session/publish'


function idParam(c: Context, name: string): string {
  const parsed = uuidParam.safeParse(c.req.param(name))
  if (!parsed.success) throw notFound('Not found.')
  return parsed.data
}

const announcementGone = () => notFound('That announcement was deleted, maybe on another device.')

const handleTaken = (handle: string) => new ApiError('conflict', `@${handle} is already another club's handle. Pick another.`, { handle: 'Taken' })

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
  const directoryOn = features().web.clubDirectory
  const [members, planned, sessionPage, badgeRows, history, joinRequests, sessionRequests] = await Promise.all([
    loadMembers(db, clubId),
    loadPlans(db, clubId),
    loadClubSessions(db, clubId),
    badgesOn ? loadBadgeRows(db, clubId) : [],
    badgesOn ? loadClubHistory(db, clubId) : null,
    directoryOn ? loadJoinRequests(db, clubId) : [],
    directoryOn ? loadSessionRequests(db, clubId) : [],
  ])
  const badges = badgeRows.map(toBadgeView)
  const career = history ? careerTotals(history) : new Map()
  const view = {
    club: toSummary(row, members.length, planned.length),
    members: members.map((m) => ({ ...m, badges: memberCareerBadges(m.name, badges, career) })),
    // Members who have left drop off the plans' rosters.
    planned: planned.map((p) => ({ ...p, memberIds: p.memberIds.filter((id) => members.some((m) => m.id === id)) })),
    sessions: sessionPage.sessions,
    sessionsNextBefore: sessionPage.nextBefore,
    badges,
    joinRequests,
    sessionRequests,
  }
  return { ...view, setup: clubSetup(view, features().web.fees) }
}

const respond = async (c: Context<AppEnv>, clubId: string) => c.json(await clubView(c, clubId))

/** The club's feedback form and each recent session's results, worked out here. */
async function feedbackView(c: Context<AppEnv>, clubId: string): Promise<ClubFeedbackView> {
  const db = c.get('db')
  const [record, history] = await Promise.all([loadFeedbackForm(db, clubId), loadFeedbackHistory(db, clubId)])
  const form = formOf(record)
  return { form, sessions: feedbackResults(form, history.sessions, history.responses) }
}

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
  .use(requireClubManager)
  .get('/', async (c) => {
    const offset = pageOffset.safeParse(c.req.query('offset')).data ?? 0
    const response: ClubListResponse = await listClubs(c.get('db'), offset)
    return c.json(response)
  })
  // The step-by-step form sends colours and a fee too (null for the defaults), so the club starts set up in one request.
  .post('/', async (c) => {
    const input = await body(c, createClubSchema)
    const info = cleanClubInfo(input)
    // Checked first: a club is only created with a handle no other club has (the unique index backs it up).
    if (await clubHandleTaken(c.get('db'), info.handle, null)) throw handleTaken(info.handle)
    const theme = input.theme ? cleanTheme(input.theme) : null
    const fee = features().web.fees ? cleanFee(input.fee) : null
    const db = c.get('db')
    const blocked = addClubBlockedReason(await countClubs(db))
    if (blocked) throw conflict(blocked)
    const row = await createClub(db, crypto.randomUUID(), info, theme, fee)
    return c.json(await clubView(c, row.id), 201)
  })
  // Whether a handle is free, before the create form (or settings) lets it be used. `club` is the club it's for, when editing.
  .get('/handle-check', async (c) => {
    const parsed = nameCheckQuery.safeParse(c.req.query())
    if (!parsed.success) throw invalid('Type a handle to check.', { handle: 'Missing' })
    const value = normalizeHandle(parsed.data.value)
    const problem = handleProblem(value, 'handle')
    const clubId = uuidParam.safeParse(c.req.query('club')).data ?? null
    const taken = !problem && (await clubHandleTaken(c.get('db'), value, clubId))
    const response: NameCheckResponse = { value, available: !problem && !taken, reason: problem ?? (taken ? `@${value} is already another club's handle.` : null) }
    return c.json(response)
  })
  .get('/:id', async (c) => respond(c, idParam(c, 'id')))
  .put('/:id', async (c) => {
    const club = await ownClub(c)
    const info = cleanClubInfo(await body(c, clubInfoSchema))
    if (await clubHandleTaken(c.get('db'), info.handle, club.id)) throw handleTaken(info.handle)
    await updateClubInfo(c.get('db'), club.id, info)
    return respond(c, club.id)
  })
  // The club's social and web links, in order.
  .put('/:id/social', async (c) => {
    const club = await ownClub(c)
    const { links } = await body(c, socialLinksSchema)
    await setClubSocialLinks(c.get('db'), club.id, cleanSocialLinks(links))
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
  // The club's own colour combinations, saved by name beside the presets.
  .post('/:id/themes', async (c) => {
    const club = await ownClub(c)
    const themes = withSavedTheme(savedThemesOf(club.saved_themes), await body(c, savedThemeSchema), crypto.randomUUID())
    await setSavedThemes(c.get('db'), club.id, themes)
    return respond(c, club.id)
  })
  .delete('/:id/themes/:themeId', async (c) => {
    const club = await ownClub(c)
    const saved = savedThemesOf(club.saved_themes)
    const themeId = c.req.param('themeId')
    if (!saved.some((t) => t.id === themeId)) throw notFound('That theme is no longer saved. It may have been deleted on another device.')
    await setSavedThemes(
      c.get('db'),
      club.id,
      saved.filter((t) => t.id !== themeId),
    )
    return respond(c, club.id)
  })
  // The club's fee scheme, offered when setting up its sessions; null for no fee.
  .put('/:id/fee', requireFeature('web', 'fees'), async (c) => {
    const club = await ownClub(c)
    const { fee } = await body(c, clubFeeSchema)
    await setClubFee(c.get('db'), club.id, cleanFee(fee))
    return respond(c, club.id)
  })
  // QR codes players pay the club with (shown to members who still owe), stored lossless so they still scan.
  .post('/:id/payment-qrs', requireFeature('web', 'fees'), async (c) => {
    const user = currentUser(c)
    const club = await ownClub(c)
    const qrs = paymentQrsOf(club.payment_qrs)
    const blocked = addQrBlockedReason(qrs.length)
    if (blocked) throw conflict(blocked)
    const form = await c.req.parseBody().catch(() => ({}) as Record<string, unknown>)
    const label = cleanQrLabel(typeof form['label'] === 'string' ? form['label'] : '')
    const position = uploadedQrPosition(form['position'], cleanPosition)
    const image = checkedImage(await uploadedImage(c))
    const webp = await convert(image.bytes, image.type, { lossless: true })
    const db = c.get('db')
    const path = mediaPath(user.id, club.id, 'qr', crypto.randomUUID())
    await uploadMedia(db, path, webp, 'image/webp')
    await setPaymentQrs(db, club.id, [...qrs, { id: crypto.randomUUID(), label, path, position }])
    return respond(c, club.id)
  })
  // A QR code's framing, adjusted after uploading (like a photo's).
  .put('/:id/payment-qrs/:qrId/position', requireFeature('web', 'fees'), async (c) => {
    const club = await ownClub(c)
    const qrs = paymentQrsOf(club.payment_qrs)
    const qrId = c.req.param('qrId')
    if (!qrs.some((q) => q.id === qrId)) throw notFound('That QR code is no longer on the club. It may have been removed on another device.')
    const position = cleanPosition(await body(c, photoPositionSchema))
    await setPaymentQrs(
      c.get('db'),
      club.id,
      qrs.map((q) => (q.id === qrId ? { ...q, position } : q)),
    )
    return respond(c, club.id)
  })
  .delete('/:id/payment-qrs/:qrId', requireFeature('web', 'fees'), async (c) => {
    const club = await ownClub(c)
    const qrs = paymentQrsOf(club.payment_qrs)
    const gone = qrs.find((q) => q.id === c.req.param('qrId'))
    if (!gone) throw notFound('That QR code is no longer on the club. It may have been removed on another device.')
    const db = c.get('db')
    await setPaymentQrs(
      db,
      club.id,
      qrs.filter((q) => q !== gone),
    )
    await removeMedia(db, [gone.path])
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
    const memberId = crypto.randomUUID()
    await saveMember(db, club.id, memberId, member)
    // Picked from the member search: they're invited in the app to link their account.
    const { userId } = await body(c, clubMemberSchema)
    if (userId && features().web.clubDirectory) await createAppInvite(db, club.id, memberId, userId, newPublicSlug())
    return respond(c, club.id)
  })
  // Older sessions the club has run, a page at a time.
  .get('/:id/sessions', async (c) => {
    const club = await ownClub(c)
    const before = endedSessionsQuery.safeParse(c.req.query()).data?.before ?? null
    const response: ClubSessionsResponse = await loadClubSessions(c.get('db'), club.id, before)
    return c.json(response)
  })
  // How people join (auto or reviewed) and the welcome they get.
  .put('/:id/joining', requireFeature('web', 'clubDirectory'), async (c) => {
    const club = await ownClub(c)
    await setClubJoining(c.get('db'), club.id, cleanJoining(await body(c, clubJoiningSchema)))
    return respond(c, club.id)
  })
  .post('/:id/requests/:requestId', requireFeature('web', 'clubDirectory'), async (c) => {
    const club = await ownClub(c)
    const { approve } = await body(c, decisionSchema)
    if (approve) {
      const blocked = addMemberBlockedReason((await loadMembers(c.get('db'), club.id)).length)
      if (blocked) throw conflict(blocked)
    }
    if (!(await decideJoinRequest(c.get('db'), club.id, idParam(c, 'requestId'), approve))) throw notFound('That request is no longer open. It may have been decided on another device.')
    return respond(c, club.id)
  })
  // A member asked to join a session: approving adds them to the plan's roster, or to the running board's queue.
  .post('/:id/session-requests/:requestId', requireFeature('web', 'clubDirectory'), async (c) => {
    const club = await ownClub(c)
    const db = c.get('db')
    const { approve } = await body(c, decisionSchema)
    const request = await loadSessionRequest(db, club.id, idParam(c, 'requestId'))
    if (!request) throw notFound('That request is no longer open. It may have been decided on another device.')
    if (approve) {
      const member = (await loadMembers(db, club.id)).find((m) => m.id === request.member_id)
      if (!member) throw notFound('That member is no longer in the club.')
      if (request.plan_id) {
        const row = await loadPlanRow(db, club.id, request.plan_id)
        if (!row) throw planNotFound()
        const plan = planFromRow(row)
        if (!plan.memberIds.includes(member.id)) await updatePlan(db, club.id, row.id, { ...plan, memberIds: [...plan.memberIds, member.id] })
      } else if (request.session_id) {
        const state = await loadSession(db, request.session_id)
        if (!state || state.status !== 'active') throw conflict('That session has ended, so nobody can join it now.')
        // They join the roster to check in at the venue, like a player added from setup.
        const next = addPlayer(state, { name: member.name, tierId: tierFor(member, state.settings.sportId), checkedIn: false }, engineContext())
        await saveSession(db, next, state.version)
      }
    }
    await closeSessionRequest(db, request.id, approve)
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
      await sendInviteEmail(address, `/invite/${token}`, club.name)
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

  // The post-session feedback form (club-wide) and how each recent session was rated.
  .get('/:id/feedback', requireFeature('web', 'clubFeedback'), async (c) => {
    const club = await ownClub(c)
    const response: ClubFeedbackView = await feedbackView(c, club.id)
    return c.json(response)
  })
  .put('/:id/feedback', requireFeature('web', 'clubFeedback'), async (c) => {
    const club = await ownClub(c)
    await saveFeedbackForm(c.get('db'), club.id, cleanFeedbackForm(await body(c, feedbackFormSchema)))
    const response: ClubFeedbackView = await feedbackView(c, club.id)
    return c.json(response)
  })

  // Announcements: news for members, pinned first. Every change answers with the whole list.
  .get('/:id/announcements', requireFeature('web', 'clubAnnouncements'), async (c) => {
    const club = await ownClub(c)
    return c.json(announcementsView(await loadAnnouncements(c.get('db'), club.id), new Date()))
  })
  .post('/:id/announcements', requireFeature('web', 'clubAnnouncements'), async (c) => {
    const club = await ownClub(c)
    const db = c.get('db')
    const input = cleanAnnouncement(await body(c, announcementSchema))
    const records = await loadAnnouncements(db, club.id)
    const blocked = addAnnouncementBlockedReason(records.length) ?? (input.pinned ? pinBlockedReason(records, null) : null)
    if (blocked) throw conflict(blocked)
    await createAnnouncement(db, club.id, input)
    return c.json(announcementsView(await loadAnnouncements(db, club.id), new Date()))
  })
  .put('/:id/announcements/:announcementId', requireFeature('web', 'clubAnnouncements'), async (c) => {
    const club = await ownClub(c)
    const id = idParam(c, 'announcementId')
    const db = c.get('db')
    const input = cleanAnnouncement(await body(c, announcementSchema))
    const blocked = input.pinned ? pinBlockedReason(await loadAnnouncements(db, club.id), id) : null
    if (blocked) throw conflict(blocked)
    if (!(await updateAnnouncement(db, club.id, id, input))) throw announcementGone()
    return c.json(announcementsView(await loadAnnouncements(db, club.id), new Date()))
  })
  .delete('/:id/announcements/:announcementId', requireFeature('web', 'clubAnnouncements'), async (c) => {
    const club = await ownClub(c)
    const db = c.get('db')
    if (!(await deleteAnnouncement(db, club.id, idParam(c, 'announcementId')))) throw announcementGone()
    return c.json(announcementsView(await loadAnnouncements(db, club.id), new Date()))
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
