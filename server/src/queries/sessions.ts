import { sessionHistory, sportRules } from '@matchpoynt/shared'
import type { ActiveSessionSummary, EndedSessionsResponse, EndedSessionView, FeeScheme, GameScore, MatchSide, SessionRules, SessionSettings, ScoringSettings, SportId } from '@matchpoynt/shared'
import type { CourtState, MatchState, PlayerState, SessionState } from '@/interfaces/SessionState'
import type { TournamentState } from '@/interfaces/TournamentState'
import { features } from '@/config/features'
import type { Json, Tables } from '@/types/database'
import { mediaUrl } from '@/utils/club/media'
import type { InvoiceDraft } from '@/utils/fees/invoices'
import { ApiError } from '@/utils/http/errors'
import { dbFail } from '@/utils/supabase/errors'
import type { Db } from '@/utils/supabase/client'

const tournamentsOn = () => features().web.tournaments
const feesOn = () => features().web.fees

const ms = (iso: string) => new Date(iso).getTime()
const iso = (time: number) => new Date(time).toISOString()


const toPlayer = (r: Tables<'session_players'>): PlayerState => ({
  id: r.id,
  name: r.name,
  tierId: r.tier_id,
  gamesPlayed: r.games_played,
  rotation: r.rotation,
  queuedAt: ms(r.queued_at),
  status: r.status as PlayerState['status'],
  active: r.active,
  checkedInAt: r.checked_in_at ? ms(r.checked_in_at) : null,
  breakSince: r.break_since ? ms(r.break_since) : null,
})

export const toMatch = (r: Tables<'matches'>): MatchState => ({
  id: r.id,
  courtId: r.court_id ?? '',
  courtLabel: r.court_label,
  sides: [r.side_a, r.side_b],
  startedAt: ms(r.started_at),
  finishedAt: r.finished_at ? ms(r.finished_at) : null,
  games: r.games as unknown as GameScore[],
  winner: r.winner as MatchSide | null,
})

const toSettings = (r: Tables<'sessions'>): SessionSettings => ({
  sportId: r.sport_id as SportId,
  scoring: r.scoring as unknown as ScoringSettings,
  // Sessions saved before a rule existed get its default.
  rules: { queueing: 'automatic', ...(r.rules as unknown as Partial<SessionRules>) } as SessionRules,
  matchmaking: r.matchmaking as SessionSettings['matchmaking'],
  // With fees switched off, sessions run without one (and saves leave the stored fee alone).
  fee: feesOn() ? ((r.fee as unknown as FeeScheme | null) ?? null) : null,
})

/** The club that runs a session, or `null` (started from the board, or not the caller's). */
export async function loadSessionClubId(db: Db, id: string): Promise<string | null> {
  const { data, error } = await db.from('sessions').select('club_id').eq('id', id).maybeSingle()
  dbFail(error)
  return data?.club_id ?? null
}

/** Loads a session with its courts, players and open matches. `null` if missing or not the caller's. */
async function loadById(db: Db, id: string): Promise<SessionState | null> {
  const { data: row, error } = await db.from('sessions').select('*').eq('id', id).maybeSingle()
  dbFail(error)
  if (!row) return null

  const [courts, players, matches] = await Promise.all([
    db.from('session_courts').select('*').eq('session_id', id).order('position'),
    db.from('session_players').select('*').eq('session_id', id),
    db.from('matches').select('*').eq('session_id', id).is('finished_at', null),
  ])
  dbFail(courts.error ?? players.error ?? matches.error)
  return stateFromRows(row, courts.data ?? [], players.data ?? [], matches.data ?? [])
}

/** A session's state from its rows: the session, its courts, roster and open matches. */
export function stateFromRows(
  row: Tables<'sessions'>,
  courts: Tables<'session_courts'>[],
  players: Tables<'session_players'>[],
  matches: Tables<'matches'>[],
): SessionState {
  return {
    id: row.id,
    ownerId: row.owner_id,
    version: row.version,
    status: row.status as SessionState['status'],
    title: row.title,
    clubId: row.club_id,
    publicSlug: row.public_slug,
    checkInSlug: row.check_in_slug,
    settings: toSettings(row),
    tournament: tournamentsOn() ? ((row.tournament as unknown as TournamentState | null) ?? null) : null,
    tournamentSlug: row.tournament_slug,
    courts: [...courts].sort((a, b) => a.position - b.position).map(
      (c): CourtState => ({
        id: c.id,
        label: c.label,
        position: c.position,
        status: c.status as CourtState['status'],
        lineup: (c.lineup as unknown as CourtState['lineup'] | null) ?? [[], []],
        // With tournaments switched off, tournament courts play open play (and saves leave the flag alone).
        tournament: tournamentsOn() && c.tournament,
      }),
    ),
    players: Object.fromEntries(players.map((p) => [p.id, toPlayer(p)])),
    matches: Object.fromEntries(matches.filter((m) => !m.finished_at).map((m) => [m.id, toMatch(m)])),
  }
}

export async function loadSession(db: Db, id: string): Promise<SessionState | null> {
  return loadById(db, id)
}

/** The caller's running sessions, newest first, as the session switcher lists them. */
export async function listActiveSessions(db: Db): Promise<ActiveSessionSummary[]> {
  const { data, error } = await db.from('sessions').select('id, title, sport_id, created_at').eq('status', 'active').order('created_at', { ascending: false })
  dbFail(error)
  const rows = data ?? []
  if (!rows.length) return []
  const ids = rows.map((r) => r.id)
  const [courts, players] = await Promise.all([
    db.from('session_courts').select('session_id, status').in('session_id', ids),
    db.from('session_players').select('session_id').in('session_id', ids).eq('active', true),
  ])
  dbFail(courts.error ?? players.error)
  const count = <T extends { session_id: string }>(list: T[] | null, id: string, keep: (r: T) => boolean = () => true) =>
    (list ?? []).filter((r) => r.session_id === id && keep(r)).length
  return rows.map((r) => ({
    id: r.id,
    label: r.title ?? `${sportRules[r.sport_id as SportId]?.name ?? 'Court'} session`,
    sportId: r.sport_id as SportId,
    startedAt: r.created_at,
    courts: count(courts.data, r.id),
    playing: count(courts.data, r.id, (c) => c.status === 'playing'),
    players: count(players.data, r.id),
  }))
}

/**
 * Writes the whole session in one transaction. Fails with a conflict if
 * someone else saved first. Returns the new version.
 */
export async function saveSession(db: Db, state: SessionState, expectedVersion: number | null): Promise<number> {
  const { data, error } = await db.rpc('save_session', { p_expected_version: expectedVersion, ...savePayload(state) })
  dbFail(error)
  return data ?? 0
}

/**
 * Deletes a session for good, running or finished: its courts, players and
 * matches go with it (foreign keys cascade). `false` when it doesn't exist or
 * isn't the caller's (RLS).
 */
export async function deleteSession(db: Db, id: string): Promise<boolean> {
  const { data, error } = await db.from('sessions').delete().eq('id', id).select('id')
  dbFail(error)
  return Boolean(data?.length)
}

/** Saves a session started over (`restartSession`): its stored matches are deleted in the same transaction. */
export async function saveRestartedSession(db: Db, state: SessionState, expectedVersion: number): Promise<number> {
  const { data, error } = await db.rpc('restart_session', { p_expected_version: expectedVersion, ...savePayload(state) })
  dbFail(error)
  return data ?? 0
}

/** Saves a session after a match was cancelled (`cancelMatch`): that match's row is deleted in the same transaction. */
export async function saveCancelledMatch(db: Db, state: SessionState, expectedVersion: number, matchId: string): Promise<number> {
  const { data, error } = await db.rpc('cancel_match', { p_expected_version: expectedVersion, p_match_id: matchId, ...savePayload(state) })
  dbFail(error)
  return data ?? 0
}

/** The whole session as save_session (and start_planned_session) take it. */
export function savePayload(state: SessionState) {
  return {
    p_session: {
      id: state.id,
      sport_id: state.settings.sportId,
      scoring: { ...state.settings.scoring },
      rules: { ...state.settings.rules },
      matchmaking: state.settings.matchmaking,
      // Only sent while tournaments are on: save_session keeps the stored tournament when the key is missing.
      ...(tournamentsOn() && { tournament: state.tournament as unknown as Json }),
      // The same for the fee: save_session keeps the stored one when the key is missing.
      ...(feesOn() && { fee: state.settings.fee as unknown as Json }),
    },
    p_courts: state.courts.map((c) => ({ id: c.id, label: c.label, position: c.position, status: c.status, lineup: c.lineup, tournament: c.tournament })),
    p_players: Object.values(state.players).map((p) => ({
      id: p.id,
      name: p.name,
      tier_id: p.tierId,
      games_played: p.gamesPlayed,
      rotation: p.rotation,
      queued_at: iso(p.queuedAt),
      status: p.status,
      active: p.active,
      checked_in_at: p.checkedInAt === null ? null : iso(p.checkedInAt),
      break_since: p.breakSince == null ? null : iso(p.breakSince),
    })),
    p_matches: Object.values(state.matches).map((m) => ({
      id: m.id,
      court_id: m.courtId,
      court_label: m.courtLabel,
      side_a: m.sides[0],
      side_b: m.sides[1],
      started_at: iso(m.startedAt),
      finished_at: m.finishedAt === null ? null : iso(m.finishedAt),
      games: m.games.map((g) => ({ ...g })),
      winner: m.winner,
    })),
  }
}

/** Ends a session and writes its invoices (`sessionInvoices`), in one transaction with the version check. */
export async function endSession(db: Db, id: string, expectedVersion: number, invoices: InvoiceDraft[]): Promise<void> {
  const { error } = await db.rpc('end_session', {
    p_session_id: id,
    p_expected_version: expectedVersion,
    p_invoices: invoices.map((i) => ({ id: i.id, player_id: i.playerId, name: i.name, games: i.games, amount: i.amount, currency: i.currency })),
  })
  dbFail(error)
}

/** Every player (including removed) and finished match, newest first, for the leaderboard. */
export async function loadResults(db: Db, sessionId: string) {
  const [players, matches] = await Promise.all([
    db.from('session_players').select('*').eq('session_id', sessionId),
    db.from('matches').select('*').eq('session_id', sessionId).not('finished_at', 'is', null).order('finished_at', { ascending: false }),
  ])
  dbFail(players.error ?? matches.error)
  return { players: (players.data ?? []).map(toPlayer), matches: (matches.data ?? []).map(toMatch) }
}

/** Sets or clears the public leaderboard slug. Doesn't bump the version: the board itself is unchanged. */
export async function setPublicSlug(db: Db, id: string, slug: string | null): Promise<string | null> {
  const { data, error } = await db.from('sessions').update({ public_slug: slug }).eq('id', id).select('public_slug').maybeSingle()
  dbFail(error)
  if (!data) throw new ApiError('not_found', 'Session not found.')
  return data.public_slug
}

/** Sets or clears the public tournament token. Doesn't bump the version. */
export async function setTournamentSlug(db: Db, id: string, slug: string | null): Promise<string | null> {
  const { data, error } = await db.from('sessions').update({ tournament_slug: slug }).eq('id', id).select('tournament_slug').maybeSingle()
  dbFail(error)
  if (!data) throw new ApiError('not_found', 'Session not found.')
  return data.tournament_slug
}

/** Sets the check-in QR token if the session has none yet; returns the one in use. Doesn't bump the version. */
export async function ensureCheckInSlug(db: Db, id: string, slug: string): Promise<string> {
  const { data, error } = await db
    .from('sessions')
    .update({ check_in_slug: slug })
    .eq('id', id)
    .is('check_in_slug', null)
    .select('check_in_slug')
    .maybeSingle()
  dbFail(error)
  if (data?.check_in_slug) return data.check_in_slug

  // Already had one (or a parallel request just set it): keep that, so printed QRs keep working.
  const existing = await db.from('sessions').select('check_in_slug').eq('id', id).maybeSingle()
  dbFail(existing.error)
  if (!existing.data?.check_in_slug) throw new ApiError('not_found', 'Session not found.')
  return existing.data.check_in_slug
}

/** The caller's most recently ended session, with how much was played, or `null`. */
export async function loadLatestEndedSession(db: Db): Promise<EndedSessionView | null> {
  const { data: row, error } = await db
    .from('sessions')
    .select('*')
    .eq('status', 'ended')
    .order('ended_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  dbFail(error)
  return row ? toEndedView(db, row) : null
}

/**
 * The caller's finished sessions, newest first, a page at a time: those that
 * ended before `before` (an ISO time from the previous page), with their
 * match and player counts loaded in one go for the whole page.
 */
export async function listEndedSessions(db: Db, before: string | null): Promise<EndedSessionsResponse> {
  let query = db.from('sessions').select('*').eq('status', 'ended').order('ended_at', { ascending: false, nullsFirst: false }).limit(sessionHistory.pageSize + 1)
  if (before) query = query.lt('ended_at', before)
  const { data, error } = await query
  dbFail(error)
  const rows = (data ?? []).slice(0, sessionHistory.pageSize)
  const more = (data ?? []).length > sessionHistory.pageSize
  if (!rows.length) return { sessions: [], nextBefore: null }
  const ids = rows.map((r) => r.id)
  const [matches, players] = await Promise.all([
    db.from('matches').select('session_id').in('session_id', ids).not('finished_at', 'is', null),
    db.from('session_players').select('session_id').in('session_id', ids),
  ])
  dbFail(matches.error ?? players.error)
  const count = (list: { session_id: string }[] | null, id: string) => (list ?? []).filter((r) => r.session_id === id).length
  const sessions = rows.map((row) => endedView(row, count(matches.data, row.id), count(players.data, row.id)))
  return { sessions, nextBefore: more ? (rows.at(-1)!.ended_at ?? null) : null }
}

/** One finished session by id (`null` if it doesn't exist, isn't the user's, or is still running). */
export async function loadEndedSession(db: Db, id: string): Promise<EndedSessionView | null> {
  const { data: row, error } = await db.from('sessions').select('*').eq('id', id).eq('status', 'ended').maybeSingle()
  dbFail(error)
  return row ? toEndedView(db, row) : null
}

async function toEndedView(db: Db, row: Tables<'sessions'>): Promise<EndedSessionView> {
  const [matches, players] = await Promise.all([
    db.from('matches').select('id', { count: 'exact', head: true }).eq('session_id', row.id).not('finished_at', 'is', null),
    db.from('session_players').select('id', { count: 'exact', head: true }).eq('session_id', row.id),
  ])
  dbFail(matches.error ?? players.error)
  return endedView(row, matches.count ?? 0, players.count ?? 0)
}

const endedView = (row: Tables<'sessions'>, matchesFinished: number, players: number): EndedSessionView => ({
  id: row.id,
  title: row.title,
  clubId: row.club_id,
  coverUrl: mediaUrl(row.cover_path),
  sportId: row.sport_id as SportId,
  startedAt: row.created_at,
  endedAt: row.ended_at ?? row.updated_at,
  matchesFinished,
  players,
  hasFee: feesOn() && row.fee !== null,
})
