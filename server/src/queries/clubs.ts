import type {
  ClubInfoInput,
  ClubMemberInput,
  ClubMemberView,
  ClubSessionView,
  ClubSummary,
  ClubThemeInput,
  MemberTier,
  PhotoPosition,
  PlannedSessionInput,
  PlannedSessionView,
  SessionSettings,
  SportId,
} from '@matchpoynt/shared'
import { clubLimits } from '@matchpoynt/shared'
import type { SessionState } from '@/interfaces/SessionState'
import { savePayload } from '@/queries/sessions'
import type { Json, Tables } from '@/types/database'
import { positionOf, themeOf } from '@/utils/club/appearance'
import { clubFolder, mediaBucket, mediaUrl } from '@/utils/club/media'
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

export const toSummary = (row: ClubRow, members: number, plannedSessions: number): ClubSummary => ({
  id: row.id,
  name: row.name,
  description: row.description,
  avatarUrl: mediaUrl(row.avatar_path),
  coverUrl: mediaUrl(row.cover_path),
  avatarPosition: positionOf(row.avatar_position),
  coverPosition: positionOf(row.cover_position),
  theme: themeOf(row.theme as unknown as ClubThemeInput | null),
  members,
  plannedSessions,
})

/** The caller's clubs, by name. */
export async function listClubs(db: Db): Promise<ClubSummary[]> {
  const { data, error } = await db.from('clubs').select('*').order('name')
  dbFail(error)
  const rows = data ?? []
  const n = await counts(
    db,
    rows.map((r) => r.id),
  )
  return rows.map((r) => toSummary(r, n.members.get(r.id) ?? 0, n.plans.get(r.id) ?? 0))
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

export async function createClub(db: Db, id: string, info: ClubInfoInput): Promise<ClubRow> {
  const { data, error } = await db.from('clubs').insert({ id, name: info.name, description: info.description }).select('*').single()
  dbFail(error)
  return data!
}

export async function updateClubInfo(db: Db, id: string, info: ClubInfoInput): Promise<void> {
  const { error } = await db.from('clubs').update({ name: info.name, description: info.description, updated_at: new Date().toISOString() }).eq('id', id)
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
  const stored = theme.accent || theme.sidebar ? (theme as unknown as Json) : null
  const { error } = await db.from('clubs').update({ theme: stored, updated_at: new Date().toISOString() }).eq('id', id)
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
  const invites = new Map<string, { status: 'pending' | 'accepted'; sentAt: string }>()
  if (members.length) {
    const { data: rows, error: inviteError } = await db
      .from('club_invites')
      .select('member_id, status, created_at')
      .eq('club_id', clubId)
      .neq('status', 'revoked')
      .order('created_at', { ascending: false })
    dbFail(inviteError)
    for (const r of rows ?? []) if (!invites.has(r.member_id)) invites.set(r.member_id, { status: r.status as 'pending' | 'accepted', sentAt: r.created_at })
  }
  return members.map((m) => ({
    id: m.id,
    name: m.name,
    contact: m.contact,
    // Career badges are added by the route (utils/club/badges.ts), which has the club's history.
    badges: [],
    email: m.email,
    linked: m.user_id !== null,
    invite: invites.get(m.id) ?? null,
    tiers: tiers.get(m.id) ?? [],
  }))
}

/** Adds or edits a member and their tiers in one transaction (save_club_member). */
export async function saveMember(db: Db, clubId: string, id: string, member: ClubMemberInput): Promise<void> {
  const { error } = await db.rpc('save_club_member', {
    p_member: { id, club_id: clubId, name: member.name, contact: member.contact },
    p_sports: member.tiers.map((t) => ({ sport_id: t.sportId, tier_id: t.tierId })),
  })
  dbFail(error)
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
  coverUrl: mediaUrl(r.cover_path),
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
export async function loadClubSessions(db: Db, clubId: string): Promise<ClubSessionView[]> {
  const { data, error } = await db
    .from('sessions')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(clubLimits.recentSessions)
  dbFail(error)
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    sportId: r.sport_id as SportId,
    status: r.status === 'ended' ? 'ended' : 'active',
    startedAt: r.created_at,
    endedAt: r.ended_at,
    coverUrl: mediaUrl(r.cover_path),
  }))
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
  const pattern = `%${query.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`
  const { data, error } = await db.from('club_members').select('id, name, club_id, clubs(name)').ilike('name', pattern).limit(max)
  dbFail(error)
  const rows = (data ?? []) as unknown as { id: string; name: string; club_id: string; clubs: { name: string } | null }[]
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
  return rows.map((r) => ({ memberId: r.id, name: r.name, tierId: tierOf.get(r.id) ?? null, clubName: r.clubs?.name ?? '', clubId: r.club_id }))
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
