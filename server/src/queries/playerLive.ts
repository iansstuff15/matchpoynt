import { sportRules, type FeeScheme, type ClubBadgeView, type PlayerLiveSummary, type PlayerSessionEndedView, type SportId } from '@matchpoynt/shared'
import { conflict, notFound } from '@/utils/http/errors'
import type { MatchState, SessionState } from '@/interfaces/SessionState'
import { features } from '@/config/features'
import { toBadgeView } from '@/queries/clubBadges'
import { paymentQrsOf, paymentQrViews } from '@/utils/club/paymentQrs'
import { playerPayment, type PlayerInvoiceRow } from '@/utils/fees/playerPayment'
import { stateFromRows, toMatch } from '@/queries/sessions'
import type { ClubHistory } from '@/utils/club/badges'
import { mediaUrl } from '@/utils/club/media'
import type { Tables } from '@/types/database'
import type { PlayerViewClub } from '@/utils/session/playerView'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

// Players' live view of their club's running sessions. The session belongs
// to the club's owner, which RLS hides from members, so these read through
// `player_live_session` / `player_live_sessions` (0035): only for the club's
// members (and its owner), and only while the session runs.

interface LiveRow {
  /** Without its link codes, which the function leaves out. */
  session: Omit<Tables<'sessions'>, 'public_slug' | 'check_in_slug' | 'tournament_slug'>
  club: PlayerViewClub & { avatar_path?: string | null }
  member_name: string | null
  courts: Tables<'session_courts'>[]
  players: Tables<'session_players'>[]
  matches: Tables<'matches'>[]
  /** From 0038: the club's badges, and its finished sessions' players and matches (for career badges). */
  badges?: Parameters<typeof toBadgeView>[0][]
  history_players?: { id: string; session_id: string; name: string }[]
  history_matches?: (Omit<Tables<'matches'>, 'court_id' | 'sport_id'> & { session_id: string })[]
}

/** A running club session as its players see it; `null` when it isn't running or the caller isn't in its club. */
export async function loadPlayerLive(
  db: Db,
  sessionId: string,
): Promise<{ state: SessionState; club: PlayerViewClub; clubAvatarUrl: string | null; memberName: string | null; finished: MatchState[]; clubBadges: ClubBadgeView[]; clubHistory: ClubHistory } | null> {
  const { data, error } = await db.rpc('player_live_session', { p_session_id: sessionId })
  dbFail(error)
  const r = data as unknown as LiveRow | null
  if (!r) return null
  // Nothing here needs the session's link codes.
  const session = { ...r.session, public_slug: null, check_in_slug: null, tournament_slug: null }
  return {
    state: stateFromRows(session, r.courts, r.players, r.matches),
    club: { name: r.club.name, handle: r.club.handle },
    // Its photo (from 0037), for the leaderboard's images.
    clubAvatarUrl: mediaUrl(r.club.avatar_path ?? null),
    memberName: r.member_name,
    finished: r.matches.filter((m) => m.finished_at).map(toMatch),
    clubBadges: (r.badges ?? []).map(toBadgeView),
    // The club's finished sessions, for career badges (the running one is added where they're awarded).
    clubHistory: {
      players: (r.history_players ?? []).map((p) => ({ id: p.id, sessionId: p.session_id, name: p.name })),
      matches: (r.history_matches ?? []).map((m) => toMatch({ ...m, court_id: null, sport_id: '' } as unknown as Tables<'matches'>)),
    },
  }
}

/** Running sessions of the caller's clubs that they're on the roster of, newest first (their status in each is added by the route). */
export async function loadPlayerLiveSessions(db: Db): Promise<Omit<PlayerLiveSummary, 'status'>[]> {
  const { data, error } = await db.rpc('player_live_sessions')
  dbFail(error)
  const rows = (data as unknown as { session_id: string; title: string | null; sport_id: string; club_name: string; started_at: string }[] | null) ?? []
  return rows.map((r) => ({
    sessionId: r.session_id,
    title: r.title ?? `${sportRules[r.sport_id as SportId]?.name ?? 'Court'} session`,
    sportId: r.sport_id as SportId,
    clubName: r.club_name,
    startedAt: r.started_at,
  }))
}

/** A club session of the caller's that has ended (player_ended_session); `null` while it runs, or when it isn't theirs. */
export async function loadPlayerEnded(db: Db, sessionId: string): Promise<PlayerSessionEndedView | null> {
  const { data, error } = await db.rpc('player_ended_session', { p_session_id: sessionId })
  dbFail(error)
  const r = data as unknown as {
    session_id: string
    title: string | null
    sport_id: string
    ended_at: string
    club: { name: string; handle: string | null }
    /** From 0041: the session's fee, the caller's invoice and the club's payment QR codes. */
    fee?: FeeScheme | null
    my_invoice?: PlayerInvoiceRow | null
    payment_qrs?: unknown
  } | null
  if (!r) return null
  const fees = features().web.fees
  return {
    ended: true,
    sessionId: r.session_id,
    title: r.title ?? `${sportRules[r.sport_id as SportId]?.name ?? 'Court'} session`,
    sportId: r.sport_id as SportId,
    clubName: r.club.name,
    clubHandle: r.club.handle,
    endedAt: r.ended_at,
    payment: fees ? playerPayment(r.fee ?? null, r.my_invoice ?? null) : null,
    paymentQrs: fees ? paymentQrViews(paymentQrsOf(r.payment_qrs)) : [],
  }
}

/** What checking in from the app answered. */
export type PlayerCheckInResult = 'checked_in' | 'not_on_roster' | 'closed'

/** The caller checks themselves in to a running club session they're on the roster of (player_check_in, 0039). */
export async function playerCheckIn(db: Db, sessionId: string): Promise<PlayerCheckInResult> {
  const { data, error } = await db.rpc('player_check_in', { p_session_id: sessionId })
  dbFail(error)
  return (data as PlayerCheckInResult | null) ?? 'not_on_roster'
}

/** Starts or ends the caller's own break in a running club session (`set_player_break`, 0048); the API checks the rules first. */
export async function setOwnBreak(db: Db, sessionId: string, on: boolean): Promise<void> {
  const { error } = await db.rpc('set_player_break', { p_session_id: sessionId, p_on: on })
  if (error?.message.includes('break_not_allowed')) throw conflict(on ? "You can't take a break right now. Reload to see where you stand." : "You're not on a break.")
  if (error?.message.includes('not_found')) throw notFound("You're not on this session's roster, or it has ended.")
  dbFail(error)
}
