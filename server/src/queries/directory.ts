import { signUpBlockedReason, spotsLeft } from '@/utils/club/signUp'
import { ApiError, conflict, notFound } from '@/utils/http/errors'
import { directoryLimits, sportRules, type ClubMemberRole, type ClubTeamMember, type ClubJoinCardView, type ClubMembership, type ClubStandingView, type DirectoryClubView, type JoinApproval, type MyClubInviteView, type PersonCard, type PlayerClubPageView, type PlanAttendeesView, type PlayerSessionView, type SportId, type UpcomingSessionView } from '@matchpoynt/shared'
import { toBadgeView } from '@/queries/clubBadges'
import { toMatch } from '@/queries/sessions'
import type { Tables } from '@/types/database'
import { positionOf, themeOf, colorsOf } from '@/utils/club/appearance'
import { mediaUrl, profileMediaUrl } from '@/utils/club/media'
import { clubStandings } from '@/utils/club/standings'
import { feeSummary } from '@/utils/fees/rules'
import type { FeeScheme } from '@matchpoynt/shared'
import { socialLinksOf } from '@/utils/social/links'
import { anonSupabase } from '@/utils/supabase/anon'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

// The club directory, players' club pages, joining and the member search.
// Other owners' rows are hidden by RLS, so these go through security definer
// functions (0032) that return only what each screen needs.

interface CardRow {
  id: string
  name: string
  handle: string | null
  description: string | null
  avatar_path: string | null
  avatar_position: unknown
  cover_path: string | null
  cover_position: unknown
  members: number
  approval: string
  membership: string
  theme?: unknown
}

const toCard = (r: CardRow): DirectoryClubView => ({
  id: r.id,
  name: r.name,
  handle: r.handle,
  description: r.description,
  avatarUrl: mediaUrl(r.avatar_path),
  avatarPosition: positionOf(r.avatar_position),
  coverUrl: mediaUrl(r.cover_path),
  coverPosition: positionOf(r.cover_position),
  members: Number(r.members),
  approval: r.approval === 'auto' ? 'auto' : 'manual',
  membership: r.membership as ClubMembership,
  theme: themeOf(colorsOf(r.theme ?? null)),
})

/** Up to 5 people matching what was typed, by name, email or @username; never anyone already in `clubId`. */
export async function searchPeople(db: Db, query: string, clubId: string | null): Promise<PersonCard[]> {
  // LIKE wildcards are dropped, so they can't widen the search.
  const q = query.trim().replace(/^@/, '').replace(/[%_\\\\]/g, '')
  if (q.length < directoryLimits.searchMinLength) return []
  const { data, error } = await db.rpc('search_people', { p_query: q, p_club_id: clubId })
  dbFail(error)
  const rows = (data as unknown as { user_id: string; username: string | null; display_name: string | null; email: string | null; avatar_path: string | null; avatar_position: unknown }[] | null) ?? []
  return rows.slice(0, directoryLimits.searchResults).map((r) => ({
    userId: r.user_id,
    username: r.username,
    displayName: r.username ?? r.display_name,
    email: r.email,
    avatarUrl: profileMediaUrl(r.avatar_path),
    avatarPosition: positionOf(r.avatar_position),
  }))
}

/** A page of clubs with a handle, newest first, matching `query` by name or handle. */
export async function loadDirectory(db: Db, query: string, offset: number): Promise<{ clubs: DirectoryClubView[]; nextOffset: number | null }> {
  const { data, error } = await db.rpc('club_directory', { p_query: query.trim().replace(/^@/, '').replace(/[%_\\\\]/g, ''), p_offset: offset, p_limit: directoryLimits.pageSize })
  dbFail(error)
  const rows = (data as unknown as CardRow[] | null) ?? []
  const page = rows.slice(0, directoryLimits.pageSize)
  return { clubs: page.map(toCard), nextOffset: rows.length > directoryLimits.pageSize ? offset + directoryLimits.pageSize : null }
}

/** The clubs the caller owns or is a member of, by name (my_member_clubs, 0042, 0043). */
export async function loadMyClubs(db: Db): Promise<DirectoryClubView[]> {
  const { data, error } = await db.rpc('my_member_clubs')
  dbFail(error)
  return ((data as unknown as CardRow[] | null) ?? []).map(toCard)
}

interface PlayerPageRow {
  card: CardRow
  social_links: unknown
  fee: FeeScheme | null
  theme: unknown
  member_id: string | null
  welcome: { message: string | null; links: { label: string; url: string }[] } | null
  invite_id: string | null
  plans: { id: string; title: string; sport_id: string; when: string | null; players: number; joined: boolean | null; requested: boolean; sign_up?: string; max_players?: number | null }[]
  active: { id: string; title: string | null; sport_id: string; when: string; players: number; joined: boolean; requested: boolean }[]
  badges: Parameters<typeof toBadgeView>[0][]
  players: { id: string; session_id: string; name: string }[]
  matches: { id: string; session_id: string; court_label: string; side_a: string[]; side_b: string[]; started_at: string; finished_at: string; games: unknown; winner: string | null }[]
}

/** A club's page for players, by handle; `null` when there's no such club. `fees` and `badges` follow their toggles. */
export async function loadPlayerClubPage(db: Db, handle: string, show: { fees: boolean; badges: boolean }): Promise<PlayerClubPageView | null> {
  const { data, error } = await db.rpc('club_player_page', { p_handle: handle.replace(/^@/, '').toLowerCase() })
  dbFail(error)
  const r = data as unknown as PlayerPageRow | null
  if (!r) return null
  const sessionTitle = (title: string | null, sportId: string) => title ?? `${sportRules[sportId as SportId]?.name ?? 'Court'} session`
  const sessions: PlayerSessionView[] = [
    ...r.active.map((s) => ({ id: s.id, kind: 'active' as const, title: sessionTitle(s.title, s.sport_id), sportId: s.sport_id as SportId, when: s.when, players: Number(s.players), joined: s.joined, requested: s.requested, signUp: null, spotsLeft: null, signUpBlockedReason: null })),
    ...r.plans.map((p) => {
      // Older databases (before 0050) don't send the sign-up mode: approval, as before.
      const plan = { signUp: p.sign_up === 'open' ? ('open' as const) : ('approval' as const), maxPlayers: p.max_players ?? null, players: Number(p.players), when: p.when, joined: Boolean(p.joined) }
      return {
        id: p.id,
        kind: 'planned' as const,
        title: p.title,
        sportId: p.sport_id as SportId,
        when: p.when,
        players: plan.players,
        joined: plan.joined,
        requested: p.requested,
        signUp: plan.signUp,
        spotsLeft: spotsLeft(plan.maxPlayers, plan.players),
        signUpBlockedReason: r.member_id ? signUpBlockedReason(plan, !plan.joined, Date.now()) : null,
      }
    }),
  ]
  const history = {
    players: r.players.map((p) => ({ id: p.id, sessionId: p.session_id, name: p.name })),
    matches: r.matches.map((m) => toMatch({ ...m, court_id: null, sport_id: '' } as unknown as Tables<'matches'>)),
  }
  const leaderboard: ClubStandingView[] = clubStandings(history, directoryLimits.leaderboard)
  const team = await loadClubTeam(db, r.card.id)
  const fee = show.fees ? r.fee : null
  return {
    club: { ...toCard(r.card), socialLinks: socialLinksOf(r.social_links), fee, feeSummary: fee && feeSummary(fee), theme: themeOf(colorsOf(r.theme)) },
    memberId: r.member_id,
    myRole: team.myRole,
    team: team.team,
    welcome: r.welcome && { message: r.welcome.message, links: Array.isArray(r.welcome.links) ? r.welcome.links : [] },
    inviteId: r.invite_id,
    sessions,
    badges: show.badges ? r.badges.map(toBadgeView) : [],
    leaderboard,
  }
}

/** A club's team (members with a role other than `member`) and the caller's own role in it (club_team). */
async function loadClubTeam(db: Db, clubId: string): Promise<{ myRole: ClubMemberRole | null; team: ClubTeamMember[] }> {
  const { data, error } = await db.rpc('club_team', { p_club_id: clubId })
  dbFail(error)
  const r = data as unknown as { my_role: string | null; team: { name: string; role: string; username: string | null; avatar_path: string | null }[] } | null
  return {
    myRole: (r?.my_role as ClubMemberRole | null) ?? null,
    team: (r?.team ?? []).map((m) => ({ name: m.name, role: m.role as ClubMemberRole, username: m.username, avatarUrl: profileMediaUrl(m.avatar_path) })),
  }
}

/** A club's join page, readable signed out; `null` when there's no such club. */
export async function loadJoinCard(handle: string): Promise<ClubJoinCardView | null> {
  const { data, error } = await anonSupabase().rpc('club_join_card', { p_handle: handle.replace(/^@/, '').toLowerCase() })
  dbFail(error)
  const r = data as unknown as (Omit<CardRow, 'id' | 'membership' | 'theme'> & { handle: string }) | null
  if (!r) return null
  return {
    name: r.name,
    handle: r.handle,
    description: r.description,
    avatarUrl: mediaUrl(r.avatar_path),
    avatarPosition: positionOf(r.avatar_position),
    coverUrl: mediaUrl(r.cover_path),
    coverPosition: positionOf(r.cover_position),
    members: Number(r.members),
    approval: (r.approval === 'auto' ? 'auto' : 'manual') as JoinApproval,
  }
}

/** Asks to join a club (request_join_club): `joined` at once (auto approval, or an open invite), or `requested`. */
export async function requestJoinClub(db: Db, clubId: string): Promise<'joined' | 'requested'> {
  const { data, error } = await db.rpc('request_join_club', { p_club_id: clubId })
  dbFail(error)
  return data === 'joined' ? 'joined' : 'requested'
}

/** A member asks to join a planned session or a running one (request_join_session). */
export async function requestJoinSession(db: Db, clubId: string, planId: string | null, sessionId: string | null): Promise<void> {
  const { error } = await db.rpc('request_join_session', { p_club_id: clubId, p_plan_id: planId, p_session_id: sessionId })
  dbFail(error)
}

/** In-app invites waiting for the caller. */
export async function loadMyInvites(db: Db): Promise<MyClubInviteView[]> {
  const { data, error } = await db.rpc('my_club_invites')
  dbFail(error)
  return ((data as unknown as { id: string; sent_at: string; club: CardRow }[] | null) ?? []).map((i) => ({ id: i.id, sentAt: i.sent_at, club: toCard(i.club) }))
}

/** Accepts (linking the caller to the member) or declines an in-app invite. */
export async function respondToInvite(db: Db, inviteId: string, accept: boolean): Promise<void> {
  const { error } = await db.rpc('respond_club_invite', { p_invite_id: inviteId, p_accept: accept })
  dbFail(error)
}

/** Signs the caller up for a club's planned session, or takes them off it (`sign_up_for_plan`, 0050); the API checks the rules first. */
export async function signUpForPlan(db: Db, clubId: string, planId: string, going: boolean): Promise<void> {
  const { error } = await db.rpc('sign_up_for_plan', { p_club_id: clubId, p_plan_id: planId, p_going: going })
  if (error?.message.includes('plan_full')) throw conflict("It's full. Ask the club if a place opens up.")
  if (error?.message.includes('sign_up_closed')) throw conflict('Ask to join: the club approves each player for this session.')
  if (error?.message.includes('session_not_open')) throw notFound('That session has started or was removed.')
  if (error?.message.includes('not_a_member')) throw new ApiError('forbidden', 'Join the club to sign up for its sessions.')
  dbFail(error)
}

/** Who's signed up for a planned session, for the club's members; `null` when it's gone or the caller isn't one. */
export async function loadPlanAttendees(db: Db, clubId: string, planId: string): Promise<PlanAttendeesView | null> {
  const { data, error } = await db.rpc('plan_attendees', { p_club_id: clubId, p_plan_id: planId })
  dbFail(error)
  const r = data as unknown as { names: string[]; players: number; max_players: number | null } | null
  return r ? { names: r.names, spotsLeft: spotsLeft(r.max_players, r.players) } : null
}

/** Planned sessions the caller is signed up for that start within `hours`, soonest first. */
export async function loadUpcomingPlans(db: Db, hours: number): Promise<UpcomingSessionView[]> {
  const { data, error } = await db.rpc('my_upcoming_plans', { p_hours: hours })
  dbFail(error)
  const rows = (data as unknown as { plan_id: string; title: string; sport_id: string; when: string; club_name: string; club_handle: string }[] | null) ?? []
  return rows.map((r) => ({ planId: r.plan_id, title: r.title, sportId: r.sport_id as SportId, when: r.when, clubName: r.club_name, clubHandle: r.club_handle }))
}
