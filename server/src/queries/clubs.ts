import { paymentQrsOf, paymentQrViews, type StoredPaymentQr } from '@/utils/club/paymentQrs'
import type {
  ClubInfoInput,
  ClubMemberInput,
  ClubMemberRole,
  ClubMemberView,
  ClubSessionView,
  ClubSummary,
  ClubJoiningInput,
  ClubThemeInput,
  JoinRequestView,
  SavedClubTheme,
  SessionRequestView,
  SocialLink,
  FeeScheme,
  MemberTier,
  PhotoPosition,
  PlannedSessionInput,
  PlannedSessionView,
  SessionSettings,
  SportId,
} from '@matchpoynt/shared'
import { pageSizes, sportRules } from '@matchpoynt/shared'
import { features } from '@/config/features'
import type { SessionState } from '@/interfaces/SessionState'
import { savePayload } from '@/queries/sessions'
import type { Json, Tables } from '@/types/database'
import { colorsOf, positionOf, savedThemesOf, themeOf } from '@/utils/club/appearance'
import { feeSummary } from '@/utils/fees/rules'
import { joiningOf } from '@/utils/club/joining'
import { socialLinksOf } from '@/utils/social/links'
import { clubFolder, mediaBucket, mediaUrl, profileMediaUrl } from '@/utils/club/media'
import type { SuggestionCandidate } from '@/utils/club/suggest'
import { dbFail, storageFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

// Clubs, their rosters and planned sessions, queried as the signed-in user:
// RLS limits every row to the clubs they own.

type ClubRow = Tables<'clubs'>

async function counts(db: Db, clubIds: string[]) {
  if (!clubIds.length) return { members: new Map<string, number>(), plans: new Map<string, number>() }
  const [members, plans] = await Promise.all([
    db.from('club_members').select('club_id').in('club_id', clubIds),
    db.from('planned_sessions').select('club_id').in('club_id', clubIds),
  ])
  dbFail(members.error ?? plans.error)
  const tally = (rows: { club_id: string }[] | null) => {
    const map = new Map<string, number>()
    for (const r of rows ?? []) map.set(r.club_id, (map.get(r.club_id) ?? 0) + 1)
    return map
  }
  return { members: tally(members.data), plans: tally(plans.data) }
}

const clubFee = (row: ClubRow): FeeScheme | null => (features().web.fees ? ((row.fee as unknown as FeeScheme | null) ?? null) : null)

export function toSummary(row: ClubRow, members: number, plannedSessions: number): ClubSummary {
  const fee = clubFee(row)
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    socialLinks: socialLinksOf(row.social_links),
    joining: joiningOf(row),
    description: row.description,
    avatarUrl: mediaUrl(row.avatar_path),
    coverUrl: mediaUrl(row.cover_path),
    avatarPosition: positionOf(row.avatar_position),
    coverPosition: positionOf(row.cover_position),
    theme: themeOf(colorsOf(row.theme)),
    savedThemes: savedThemesOf(row.saved_themes),
    paymentQrs: features().web.fees ? paymentQrViews(paymentQrsOf(row.payment_qrs)) : [],
    fee,
    feeSummary: fee && feeSummary(fee),
    members,
    plannedSessions,
  }
}

/** The caller's clubs, by name, a page at a time (`offset`), with where the next page starts. */
export async function listClubs(db: Db, offset = 0): Promise<{ clubs: ClubSummary[]; nextOffset: number | null }> {
  const { data, error } = await db.from('clubs').select('*').order('name').order('id').range(offset, offset + pageSizes.clubs)
  dbFail(error)
  const more = (data ?? []).length > pageSizes.clubs
  const rows = (data ?? []).slice(0, pageSizes.clubs)
  const n = await counts(
    db,
    rows.map((r) => r.id),
  )
  return { clubs: rows.map((r) => toSummary(r, n.members.get(r.id) ?? 0, n.plans.get(r.id) ?? 0)), nextOffset: more ? offset + pageSizes.clubs : null }
}

export async function countClubs(db: Db): Promise<number> {
  const { count, error } = await db.from('clubs').select('id', { count: 'exact', head: true })
  dbFail(error)
  return count ?? 0
}

export async function loadClubRow(db: Db, id: string): Promise<ClubRow | null> {
  const { data, error } = await db.from('clubs').select('*').eq('id', id).maybeSingle()
  dbFail(error)
  return data
}

export async function loadClubSummary(db: Db, row: ClubRow): Promise<ClubSummary> {
  const n = await counts(db, [row.id])
  return toSummary(row, n.members.get(row.id) ?? 0, n.plans.get(row.id) ?? 0)
}

/** A new club, with its colours and fee scheme when the step-by-step form set them (null keeps the defaults). */
export async function createClub(db: Db, id: string, info: ClubInfoInput, theme: ClubThemeInput | null = null, fee: FeeScheme | null = null): Promise<ClubRow> {
  const colors = theme && (theme.accent || theme.sidebar || theme.page) ? (theme as unknown as Json) : null
  const { data, error } = await db
    .from('clubs')
    .insert({ id, name: info.name, handle: info.handle, description: info.description, theme: colors, fee: fee as unknown as Json })
    .select('*')
    .single()
  dbFail(error)
  return data!
}

export async function updateClubInfo(db: Db, id: string, info: ClubInfoInput): Promise<void> {
  const { error } = await db.from('clubs').update({ name: info.name, handle: info.handle, description: info.description, updated_at: new Date().toISOString() }).eq('id', id)
  dbFail(error)
}

/** Sets or clears a club photo. A new photo starts centred: its old position is cleared. */
export async function setClubImage(db: Db, id: string, column: 'avatar_path' | 'cover_path', path: string | null): Promise<void> {
  const position = column === 'avatar_path' ? 'avatar_position' : 'cover_position'
  const change: Partial<ClubRow> = { [column]: path, [position]: null, updated_at: new Date().toISOString() }
  const { error } = await db.from('clubs').update(change).eq('id', id)
  dbFail(error)
}

export async function setClubPosition(db: Db, id: string, column: 'avatar_position' | 'cover_position', position: PhotoPosition): Promise<void> {
  const change: Partial<ClubRow> = { [column]: position as unknown as Json, updated_at: new Date().toISOString() }
  const { error } = await db.from('clubs').update(change).eq('id', id)
  dbFail(error)
}

export async function setClubTheme(db: Db, id: string, theme: ClubThemeInput): Promise<void> {
  const stored = theme.accent || theme.sidebar || theme.page ? (theme as unknown as Json) : null
  const { error } = await db.from('clubs').update({ theme: stored, updated_at: new Date().toISOString() }).eq('id', id)
  dbFail(error)
}

/** Replaces the club's saved themes (the route works out the new list with `withSavedTheme`). */
export async function setPaymentQrs(db: Db, id: string, qrs: StoredPaymentQr[]): Promise<void> {
  const { error } = await db
    .from('clubs')
    .update({ payment_qrs: qrs as unknown as Json, updated_at: new Date().toISOString() })
    .eq('id', id)
  dbFail(error)
}

export async function setSavedThemes(db: Db, id: string, themes: SavedClubTheme[]): Promise<void> {
  const { error } = await db
    .from('clubs')
    .update({ saved_themes: themes as unknown as Json, updated_at: new Date().toISOString() })
    .eq('id', id)
  dbFail(error)
}

/** Whether another club already uses this handle (club_handle_taken: every club, not just the caller's). `clubId` is the club it's for, which doesn't count. */
export async function clubHandleTaken(db: Db, handle: string, clubId: string | null): Promise<boolean> {
  const { data, error } = await db.rpc('club_handle_taken', { p_handle: handle, p_club_id: clubId })
  dbFail(error)
  return Boolean(data)
}

export async function setClubSocialLinks(db: Db, id: string, links: SocialLink[]): Promise<void> {
  const { error } = await db
    .from('clubs')
    .update({ social_links: links as unknown as Json, updated_at: new Date().toISOString() })
    .eq('id', id)
  dbFail(error)
}

/** Saves the club's fee scheme (`null` for none), offered when setting up its sessions. */
export async function setClubFee(db: Db, id: string, fee: FeeScheme | null): Promise<void> {
  const { error } = await db
    .from('clubs')
    .update({ fee: fee as unknown as Json, updated_at: new Date().toISOString() })
    .eq('id', id)
  dbFail(error)
}

export async function deleteClub(db: Db, id: string): Promise<void> {
  const { error } = await db.from('clubs').delete().eq('id', id)
  dbFail(error)
}

// Members

export async function loadMembers(db: Db, clubId: string): Promise<ClubMemberView[]> {
  const { data, error } = await db.from('club_members').select('*').eq('club_id', clubId).order('name')
  dbFail(error)
  const members = data ?? []
  const tiers = new Map<string, MemberTier[]>()
  if (members.length) {
    const sports = await db
      .from('club_member_sports')
      .select('*')
      .in(
        'member_id',
        members.map((m) => m.id),
      )
    dbFail(sports.error)
    for (const s of sports.data ?? []) tiers.set(s.member_id, [...(tiers.get(s.member_id) ?? []), { sportId: s.sport_id as SportId, tierId: s.tier_id }])
  }
  const invites = new Map<string, { status: 'pending' | 'accepted'; sentAt: string; via: 'email' | 'app' }>()
  if (members.length) {
    const { data: rows, error: inviteError } = await db
      .from('club_invites')
      .select('member_id, status, created_at, user_id')
      .eq('club_id', clubId)
      .neq('status', 'revoked')
      .order('created_at', { ascending: false })
    dbFail(inviteError)
    for (const r of rows ?? []) if (!invites.has(r.member_id)) invites.set(r.member_id, { status: r.status as 'pending' | 'accepted', sentAt: r.created_at, via: r.user_id ? 'app' : 'email' })
  }
  const cards = members.some((m) => m.user_id) ? await memberCards(db, clubId) : new Map<string, MemberCard>()
  return members.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role as ClubMemberRole,
    contact: m.contact,
    username: cards.get(m.id)?.username ?? null,
    avatarUrl: profileMediaUrl(cards.get(m.id)?.avatar_path ?? null),
    // Career badges are added by the route (utils/club/badges.ts), which has the club's history.
    badges: [],
    email: m.email,
    linked: m.user_id !== null,
    invite: invites.get(m.id) ?? null,
    tiers: tiers.get(m.id) ?? [],
  }))
}

interface MemberCard {
  member_id: string
  username: string | null
  email: string | null
  avatar_path: string | null
}

/** The accounts the club's members have linked (username, email, photo), by member id (club_member_cards: the owner only). */
async function memberCards(db: Db, clubId: string): Promise<Map<string, MemberCard>> {
  const { data, error } = await db.rpc('club_member_cards', { p_club_id: clubId })
  dbFail(error)
  return new Map(((data as unknown as MemberCard[] | null) ?? []).map((c) => [c.member_id, c]))
}

/** Adds or edits a member and their tiers in one transaction (save_club_member). */
export async function saveMember(db: Db, clubId: string, id: string, member: ClubMemberInput): Promise<void> {
  const { error } = await db.rpc('save_club_member', {
    p_member: { id, club_id: clubId, name: member.name, contact: member.contact },
    p_sports: member.tiers.map((t) => ({ sport_id: t.sportId, tier_id: t.tierId })),
  })
  dbFail(error)
  if (member.role) await setMemberRole(db, clubId, id, member.role)
}

/** Gives a member a role in the club (saved with the member; save_club_member predates roles). */
async function setMemberRole(db: Db, clubId: string, id: string, role: ClubMemberRole): Promise<boolean> {
  const { data, error } = await db.from('club_members').update({ role }).eq('club_id', clubId).eq('id', id).select('id')
  dbFail(error)
  return Boolean(data?.length)
}

export async function deleteMember(db: Db, clubId: string, id: string): Promise<boolean> {
  const { data, error } = await db.from('club_members').delete().eq('club_id', clubId).eq('id', id).select('id')
  dbFail(error)
  return Boolean(data?.length)
}

// Planned sessions

type PlanRow = Tables<'planned_sessions'>

const toPlan = (r: PlanRow): PlannedSessionView => ({
  id: r.id,
  title: r.title,
  scheduledFor: r.scheduled_for,
  sportId: r.sport_id as SportId,
  scoring: r.scoring as unknown as SessionSettings['scoring'],
  rules: r.rules as unknown as SessionSettings['rules'],
  matchmaking: r.matchmaking as SessionSettings['matchmaking'],
  courts: r.courts as unknown as PlannedSessionView['courts'],
  memberIds: r.member_ids,
  fee: features().web.fees ? ((r.fee as unknown as FeeScheme | null) ?? null) : null,
  coverUrl: mediaUrl(r.cover_path),
  signUp: r.sign_up === 'open' ? 'open' : 'approval',
  maxPlayers: r.max_players,
})

/** Plans soonest first; undated ones last. */
export async function loadPlans(db: Db, clubId: string): Promise<PlannedSessionView[]> {
  const { data, error } = await db
    .from('planned_sessions')
    .select('*')
    .eq('club_id', clubId)
    .order('scheduled_for', { ascending: true, nullsFirst: false })
    .order('created_at')
  dbFail(error)
  return (data ?? []).map(toPlan)
}

export async function loadPlanRow(db: Db, clubId: string, id: string): Promise<PlanRow | null> {
  const { data, error } = await db.from('planned_sessions').select('*').eq('club_id', clubId).eq('id', id).maybeSingle()
  dbFail(error)
  return data
}

export const planFromRow = toPlan

const planColumns = (plan: PlannedSessionInput) => ({
  title: plan.title,
  scheduled_for: plan.scheduledFor,
  sport_id: plan.sportId,
  scoring: { ...plan.scoring },
  rules: { ...plan.rules },
  matchmaking: plan.matchmaking,
  courts: plan.courts.map((c) => ({ id: c.id, label: c.label })),
  member_ids: plan.memberIds,
  sign_up: plan.signUp ?? 'approval',
  max_players: plan.maxPlayers ?? null,
  // With fees switched off, a plan's saved fee is left alone.
  ...(features().web.fees && { fee: plan.fee as unknown as Json }),
})

export async function createPlan(db: Db, clubId: string, id: string, plan: PlannedSessionInput): Promise<void> {
  const { error } = await db.from('planned_sessions').insert({ id, club_id: clubId, ...planColumns(plan) })
  dbFail(error)
}

export async function updatePlan(db: Db, clubId: string, id: string, plan: PlannedSessionInput): Promise<void> {
  const { error } = await db
    .from('planned_sessions')
    .update({ ...planColumns(plan), updated_at: new Date().toISOString() })
    .eq('club_id', clubId)
    .eq('id', id)
  dbFail(error)
}

export async function setPlanCover(db: Db, id: string, path: string | null): Promise<void> {
  const { error } = await db.from('planned_sessions').update({ cover_path: path, updated_at: new Date().toISOString() }).eq('id', id)
  dbFail(error)
}

export async function deletePlan(db: Db, clubId: string, id: string): Promise<void> {
  const { error } = await db.from('planned_sessions').delete().eq('club_id', clubId).eq('id', id)
  dbFail(error)
}

/** Saves the new session, gives it the plan's club, title and cover, and removes the plan, in one transaction. */
export async function startPlannedSession(db: Db, planId: string, state: SessionState): Promise<number> {
  const { data, error } = await db.rpc('start_planned_session', { p_plan_id: planId, ...savePayload(state) })
  dbFail(error)
  return data ?? 0
}

// The club's sessions

/** Sessions run from the club's plans, newest first. */
/** Sessions the club has run (or is running), newest first, a page at a time: those started before `before`. */
export async function loadClubSessions(db: Db, clubId: string, before: string | null = null): Promise<{ sessions: ClubSessionView[]; nextBefore: string | null }> {
  let query = db.from('sessions').select('*').eq('club_id', clubId)
  if (before) query = query.lt('created_at', before)
  const { data, error } = await query.order('created_at', { ascending: false }).limit(pageSizes.clubSessions + 1)
  dbFail(error)
  const rows = (data ?? []).slice(0, pageSizes.clubSessions)
  const nextBefore = (data ?? []).length > pageSizes.clubSessions ? rows.at(-1)!.created_at : null
  const sessions = rows.map((r): ClubSessionView => ({
    id: r.id,
    title: r.title,
    sportId: r.sport_id as SportId,
    status: r.status === 'ended' ? 'ended' : 'active',
    startedAt: r.created_at,
    endedAt: r.ended_at,
    coverUrl: mediaUrl(r.cover_path),
  }))
  return { sessions, nextBefore }
}

/** Photo paths still in use by any of the club's sessions, so deleting a plan never deletes a session's cover. */
export async function sessionCoverInUse(db: Db, path: string): Promise<boolean> {
  const { count, error } = await db.from('sessions').select('id', { count: 'exact', head: true }).eq('cover_path', path)
  dbFail(error)
  return (count ?? 0) > 0
}

// Storage

export async function uploadMedia(db: Db, path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const { error } = await db.storage.from(mediaBucket).upload(path, bytes, { contentType, cacheControl: '31536000', upsert: false })
  storageFail(error)
}

/** Best effort: a photo left behind is only wasted space, so failures here never fail the request. */
export async function removeMedia(db: Db, paths: (string | null | undefined)[]): Promise<void> {
  const real = paths.filter((p): p is string => Boolean(p))
  if (real.length) await db.storage.from(mediaBucket).remove(real)
}

/** Every photo a club has uploaded (club photos and plan covers), for clean-up when it's deleted. */
export async function listClubMedia(db: Db, ownerId: string, clubId: string): Promise<string[]> {
  const folder = clubFolder(ownerId, clubId)
  const { data, error } = await db.storage.from(mediaBucket).list(folder, { limit: 1000 })
  storageFail(error)
  return (data ?? []).map((o) => `${folder}/${o.name}`)
}

/**
 * Members of the caller's clubs whose name contains `query`, with their tier
 * in `sportId`, for name suggestions. RLS keeps it to the caller's own clubs.
 */
export async function findMembers(db: Db, query: string, sportId: SportId, max: number): Promise<SuggestionCandidate[]> {
  // Escape LIKE wildcards so "%" and "_" match themselves.
  const safe = query.replace(/[\\%_]/g, (ch) => `\\${ch}`)
  const handle = safe.replace(/^@/, '').toLowerCase()
  // By name or the email on file; @usernames come from the members' linked accounts (club_member_cards).
  const { data, error } = await db.from('club_members').select('id, name, email, club_id, user_id, clubs(name)').or(`name.ilike.%${safe}%,email.ilike.${safe}%`).limit(max)
  dbFail(error)
  const clubIds = await db.from('clubs').select('id')
  dbFail(clubIds.error)
  const cards = new Map<string, MemberCard>()
  for (const club of clubIds.data ?? []) for (const [id, card] of await memberCards(db, club.id)) cards.set(id, card)
  const byUsername = [...cards.values()].filter((c) => c.username?.startsWith(handle)).map((c) => c.member_id)
  const extra = byUsername.filter((id) => !(data ?? []).some((r) => r.id === id))
  const more = extra.length ? await db.from('club_members').select('id, name, email, club_id, user_id, clubs(name)').in('id', extra) : { data: [], error: null }
  dbFail(more.error)
  const rows = [...(data ?? []), ...(more.data ?? [])] as unknown as { id: string; name: string; email: string | null; club_id: string; clubs: { name: string } | null }[]
  if (!rows.length) return []
  const tiers = await db
    .from('club_member_sports')
    .select('member_id, tier_id')
    .eq('sport_id', sportId)
    .in(
      'member_id',
      rows.map((r) => r.id),
    )
  dbFail(tiers.error)
  const tierOf = new Map((tiers.data ?? []).map((t) => [t.member_id, t.tier_id]))
  return rows.map((r) => {
    const card = cards.get(r.id)
    return {
      memberId: r.id,
      name: r.name,
      tierId: tierOf.get(r.id) ?? null,
      clubName: r.clubs?.name ?? '',
      clubId: r.club_id,
      username: card?.username ?? null,
      email: card?.email ?? r.email,
      avatarUrl: profileMediaUrl(card?.avatar_path ?? null),
    }
  })
}

/** A session's club and its active players' names, for suggestions. `null` if it isn't the caller's. */
export async function sessionForSuggestions(db: Db, sessionId: string): Promise<{ clubId: string | null; names: string[] } | null> {
  const { data, error } = await db.from('sessions').select('club_id').eq('id', sessionId).maybeSingle()
  dbFail(error)
  if (!data) return null
  const players = await db.from('session_players').select('name').eq('session_id', sessionId).eq('active', true)
  dbFail(players.error)
  return { clubId: data.club_id, names: (players.data ?? []).map((p) => p.name) }
}

// Invites

/** Opens a new invite for a member (cancelling any still open) and records their email. */
/** An invite sent in the app to someone picked from the member search: they accept it from their Clubs page. Cancels any still open. */
export async function createAppInvite(db: Db, clubId: string, memberId: string, userId: string, token: string): Promise<void> {
  const revoke = await db.from('club_invites').update({ status: 'revoked' }).eq('member_id', memberId).eq('status', 'pending')
  dbFail(revoke.error)
  const { error } = await db.from('club_invites').insert({ id: crypto.randomUUID(), club_id: clubId, member_id: memberId, user_id: userId, token })
  dbFail(error)
}

export async function createInvite(db: Db, clubId: string, memberId: string, email: string, token: string): Promise<void> {
  const revoke = await db.from('club_invites').update({ status: 'revoked' }).eq('member_id', memberId).eq('status', 'pending')
  dbFail(revoke.error)
  const member = await db.from('club_members').update({ email }).eq('id', memberId).eq('club_id', clubId)
  dbFail(member.error)
  const { error } = await db.from('club_invites').insert({ id: crypto.randomUUID(), club_id: clubId, member_id: memberId, email, token })
  dbFail(error)
}

/** Cancels a member's open invite; returns whether there was one. */
export async function revokeInvite(db: Db, clubId: string, memberId: string): Promise<boolean> {
  const { data, error } = await db.from('club_invites').update({ status: 'revoked' }).eq('club_id', clubId).eq('member_id', memberId).eq('status', 'pending').select('id')
  dbFail(error)
  return Boolean(data?.length)
}

interface InviteRow {
  club_name: string
  club_avatar_path: string | null
  member_name: string
  email: string
  status: 'pending' | 'accepted' | 'revoked'
  for_caller: boolean
  accepted_by_caller: boolean
}

/** An invite as its recipient sees it (club_invite, security definer), or `null` for an unknown token. */
export async function loadInvite(db: Db, token: string): Promise<InviteRow | null> {
  const { data, error } = await db.rpc('club_invite', { p_token: token })
  dbFail(error)
  return (data as unknown as InviteRow | null) ?? null
}

/** Links the caller's account to the invited member (accept_club_invite). Returns the club's name. */
export async function acceptInvite(db: Db, token: string): Promise<string> {
  const { data, error } = await db.rpc('accept_club_invite', { p_token: token })
  dbFail(error)
  return data ?? ''
}

// Joining

/** Saves how people join the club and the welcome they get. */
export async function setClubJoining(db: Db, id: string, joining: ClubJoiningInput): Promise<void> {
  const { error } = await db
    .from('clubs')
    .update({ join_approval: joining.approval, welcome_message: joining.welcomeMessage, welcome_links: joining.welcomeLinks as unknown as Json, updated_at: new Date().toISOString() })
    .eq('id', id)
  dbFail(error)
}

/** People asking to join the club, oldest first. */
export async function loadJoinRequests(db: Db, clubId: string): Promise<JoinRequestView[]> {
  const { data, error } = await db.from('club_join_requests').select('*').eq('club_id', clubId).eq('status', 'pending').order('created_at')
  dbFail(error)
  return (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    username: r.name,
    avatarUrl: profileMediaUrl(r.avatar_path),
    avatarPosition: positionOf(null),
    tiers: r.tiers as unknown as MemberTier[],
    requestedAt: r.created_at,
  }))
}

/** Approves or declines a request: approving adds them to the roster, linked to their account. `false` when there's no such open request. */
export async function decideJoinRequest(db: Db, clubId: string, requestId: string, approve: boolean): Promise<boolean> {
  const { data: request, error } = await db.from('club_join_requests').select('*').eq('club_id', clubId).eq('id', requestId).eq('status', 'pending').maybeSingle()
  dbFail(error)
  if (!request) return false
  if (approve) {
    const memberId = crypto.randomUUID()
    await saveMember(db, clubId, memberId, { name: request.name, contact: null, tiers: request.tiers as unknown as MemberTier[] })
    const link = await db.from('club_members').update({ user_id: request.user_id }).eq('id', memberId)
    dbFail(link.error)
  }
  const decided = await db.from('club_join_requests').update({ status: approve ? 'approved' : 'declined', decided_at: new Date().toISOString() }).eq('id', requestId)
  dbFail(decided.error)
  return true
}

/** Members asking to join the club's sessions, oldest first, with who and which session. */
export async function loadSessionRequests(db: Db, clubId: string): Promise<SessionRequestView[]> {
  const { data, error } = await db.from('session_join_requests').select('*').eq('club_id', clubId).eq('status', 'pending').order('created_at')
  dbFail(error)
  const rows = data ?? []
  if (!rows.length) return []
  const [members, plans, sessions] = await Promise.all([
    db.from('club_members').select('id, name').in('id', rows.map((r) => r.member_id)),
    db.from('planned_sessions').select('id, title').in('id', rows.flatMap((r) => (r.plan_id ? [r.plan_id] : []))),
    db.from('sessions').select('id, title, sport_id').in('id', rows.flatMap((r) => (r.session_id ? [r.session_id] : []))),
  ])
  dbFail(members.error ?? plans.error ?? sessions.error)
  const memberName = new Map((members.data ?? []).map((m) => [m.id, m.name]))
  const label = new Map<string, string>([
    ...(plans.data ?? []).map((p): [string, string] => [p.id, p.title]),
    ...(sessions.data ?? []).map((s): [string, string] => [s.id, s.title ?? `${sportRules[s.sport_id as SportId]?.name ?? 'Court'} session`]),
  ])
  return rows.map((r) => ({
    id: r.id,
    memberId: r.member_id,
    memberName: memberName.get(r.member_id) ?? 'A member',
    planId: r.plan_id,
    sessionId: r.session_id,
    sessionLabel: label.get(r.plan_id ?? r.session_id ?? '') ?? 'A session',
    requestedAt: r.created_at,
  }))
}

/** One open session request, or `null`. */
export async function loadSessionRequest(db: Db, clubId: string, requestId: string) {
  const { data, error } = await db.from('session_join_requests').select('*').eq('club_id', clubId).eq('id', requestId).eq('status', 'pending').maybeSingle()
  dbFail(error)
  return data
}

export async function closeSessionRequest(db: Db, requestId: string, approved: boolean): Promise<void> {
  const { error } = await db.from('session_join_requests').update({ status: approved ? 'approved' : 'declined', decided_at: new Date().toISOString() }).eq('id', requestId)
  dbFail(error)
}
