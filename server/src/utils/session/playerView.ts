import { sportRules, type ClubBadgeView, type LeaderboardEntry, type PlayerLiveCourt, type PlayerLiveFriend, type PlayerLiveInfo, type PlayerLiveMe, type PlayerLiveView } from '@matchpoynt/shared'
import type { MatchState, PlayerState, SessionState } from '@/interfaces/SessionState'
import { awardClubBadges, careerKey, careerTotals, type ClubHistory } from '@/utils/club/badges'
import { computeLeaderboard, toMatchResult } from '@/utils/session/leaderboard'
import { activePlayers, awaitingCheckIn, breakBlockedReason, fairQueue, isCheckedIn, isOnBreak, openMatchFor, placedIds, upcomingMatches } from '@/utils/session/engine'
import { amountFor, feeSummary, formatMoney, invoiceBreakdown } from '@/utils/fees/rules'
import { estimatedStart, typicalMatchMs } from '@/utils/session/waitEstimate'

/** The club's own badges and its finished sessions, to award them in the live view (none while club badges are off). */
export interface PlayerViewAwards {
  clubBadges: ClubBadgeView[]
  clubHistory: ClubHistory
}

const noAwards: PlayerViewAwards = { clubBadges: [], clubHistory: { players: [], matches: [] } }

/** The club running the session, as the player view names it. */
export interface PlayerViewClub {
  name: string
  handle: string | null
}

const plural = (n: number, one: string, many = `${one}es`) => `${n} ${n === 1 ? one : many}`
const iso = (ms: number) => new Date(ms).toISOString()

/** The viewer on the session's roster: the active player with their name on the club's roster (careerKey). */
export function findMe(state: SessionState, memberName: string | null): PlayerState | null {
  if (!memberName) return null
  const key = careerKey(memberName)
  return activePlayers(state).find((p) => careerKey(p.name) === key) ?? null
}

/** Wins and losses from the session's finished matches with a winner. */
function record(playerId: string, finished: MatchState[]) {
  let wins = 0
  let losses = 0
  for (const m of finished) {
    if (!m.winner) continue
    const side = m.sides[0].includes(playerId) ? 'a' : m.sides[1].includes(playerId) ? 'b' : null
    if (!side) continue
    if (side === m.winner) wins++
    else losses++
  }
  return { wins, losses }
}

/**
 * Where the viewer stands and the one line that says so. With automatic
 * queueing, the matchmaking run over the queue (`upcomingMatches`, exactly
 * as starting a court would pick) says which match is theirs; matches up to
 * the number of open courts start as soon as courts are filled.
 */
function meView(state: SessionState, me: PlayerState, finished: MatchState[], entries: LeaderboardEntry[], now: number): PlayerLiveMe {
  // Their badges and streak as the session's leaderboard has them, the club's own included.
  const entry = entries.find((e) => e.playerId === me.id)
  const base = {
    name: me.name,
    gamesPlayed: me.gamesPlayed,
    ...record(me.id, finished),
    badges: entry?.badges ?? [],
    clubBadges: entry?.clubBadges ?? [],
    streak: entry?.streak ?? 0,
    // Their place counts once they've played; everyone with no games shares the bottom.
    rank: entry && entry.played > 0 ? entry.rank : null,
    ranked: entries.filter((e) => e.played > 0).length,
    pointsFor: entry?.pointsFor ?? 0,
    pointsAgainst: entry?.pointsAgainst ?? 0,
    fee: feeSoFar(state, me),
    canCheckIn: false,
    breakSince: null,
    breakBlockedReason: breakBlockedReason(state, me.id, true),
    queuePosition: null,
    matchesAhead: null,
    waitingSince: null,
    courtLabel: null,
    nextMatch: null,
    estimatedStartAt: null,
  }
  const courts = [...state.courts].sort((a, b) => a.position - b.position)
  const playingOn = courts.find((c) => openMatchFor(state, c.id)?.sides.some((s) => s.includes(me.id)))
  if (me.status === 'playing' || playingOn) {
    const label = playingOn?.label ?? null
    return { ...base, status: 'playing', courtLabel: label, headline: label ? `You're playing on ${label}.` : "You're playing now." }
  }
  if (placedIds(state).has(me.id)) {
    const court = courts.find((c) => c.lineup.some((side) => side.includes(me.id)))
    const label = court?.label ?? null
    return { ...base, status: 'placed', courtLabel: label, headline: label ? `You're on ${label} for its next match. Head over when it starts.` : "You've been placed on a court for its next match." }
  }
  if (!isCheckedIn(me)) return { ...base, status: 'checking_in', canCheckIn: true, headline: 'Check in to join the queue: here, or at the venue.' }
  if (isOnBreak(me)) return { ...base, status: 'on_break', breakSince: iso(me.breakSince!), breakBlockedReason: null, headline: "You're on a break. Come back to the queue when you're ready." }

  const waitingSince = iso(me.queuedAt)
  const queue = fairQueue(state)
  const position = queue.findIndex((p) => p.id === me.id)
  if (position < 0) {
    // Held out of open play, e.g. still in the running tournament.
    const headline = state.tournament ? "You're in the tournament. Your next match is on the bracket." : "You're waiting for the Queue Master to call you."
    return { ...base, status: 'queued', waitingSince, headline }
  }
  const queuePosition = position + 1
  const upcoming = upcomingMatches(state)
  if (!upcoming) {
    return { ...base, status: 'queued', waitingSince, queuePosition, headline: `You're #${queuePosition} in the queue. The Queue Master calls players onto courts.` }
  }
  const mine = upcoming.matches.findIndex(([a, b]) => [...a, ...b].includes(me.id))
  if (mine < 0) {
    return { ...base, status: 'queued', waitingSince, queuePosition, matchesAhead: upcoming.matches.length, headline: "You're waiting for enough players to make your match." }
  }
  // Their match, their side first, and when it should start.
  const [a, b] = upcoming.matches[mine]!
  const ours = a.includes(me.id) ? a : b
  const nextMatch = {
    partners: ours.filter((id) => id !== me.id).map((id) => state.players[id]?.name ?? 'A player'),
    opponents: (ours === a ? b : a).map((id) => state.players[id]?.name ?? 'A player'),
  }
  const startsAt = estimatedStart(state, finished, mine, now)
  const next = { ...base, waitingSince, queuePosition, matchesAhead: mine, nextMatch, estimatedStartAt: startsAt === null ? null : iso(startsAt) }
  const openCourts = courts.filter((c) => c.status === 'open' && !c.tournament).length
  if (mine < Math.max(openCourts, 1)) {
    return { ...next, status: 'up_next', headline: "You're up next: your match starts on the next free court." }
  }
  return { ...next, status: 'queued', headline: `${plural(mine, 'match')} before yours.` }
}

/** What the viewer would owe for the session so far, while it charges a fee. */
function feeSoFar(state: SessionState, me: PlayerState): PlayerLiveMe['fee'] {
  const fee = state.settings.fee
  if (!fee) return null
  const amount = amountFor(fee, me.gamesPlayed)
  return { amount, text: formatMoney(amount, fee.currency), breakdown: invoiceBreakdown(fee, me.gamesPlayed) }
}

const formatWords = { singles: 'singles', doubles: 'doubles', team: 'teams' } as const

/** The session's settings players care about, in words. */
function sessionInfo(state: SessionState): PlayerLiveInfo {
  const sport = sportRules[state.settings.sportId]
  const scoring = sport.scoring.find((f) => f.id === state.settings.scoring.formatId)
  const limit = state.settings.rules.timeLimitMinutes
  return {
    format: `${sport.name} · ${scoring?.label ?? 'Custom scoring'}, ${formatWords[state.settings.scoring.matchFormat]}`,
    timeLimit: limit === null ? null : `${limit} min per match`,
    courts: state.courts.length,
    queueing: state.settings.rules.queueing === 'automatic' ? 'Fair queue: the app picks who plays next' : 'The Queue Master calls players onto courts',
    fee: state.settings.fee ? feeSummary(state.settings.fee) : null,
  }
}

/** The viewer's friends on the roster (matched by name, as the roster holds usernames), and where each is. */
function friendsOnRoster(state: SessionState, friendNames: string[], meId: string | undefined): PlayerLiveFriend[] {
  const keys = new Set(friendNames.map(careerKey))
  const playing = new Set(
    Object.values(state.matches)
      .filter((m) => m.finishedAt === null)
      .flatMap((m) => [...m.sides[0], ...m.sides[1]]),
  )
  return activePlayers(state)
    .filter((p) => p.id !== meId && keys.has(careerKey(p.name)))
    .map((p): PlayerLiveFriend => ({ name: p.name, status: playing.has(p.id) || p.status === 'playing' ? 'playing' : isCheckedIn(p) ? 'waiting' : 'checking_in' }))
    .sort((x, y) => x.name.localeCompare(y.name))
}

/**
 * A player's live view of a running club session: their wait, who's on
 * court, who plays next and the queue. Only names, never contacts or
 * tiers. `finished` are the session's finished matches, for their record.
 */
export function playerLiveView(
  state: SessionState,
  club: PlayerViewClub,
  memberName: string | null,
  finished: MatchState[],
  now: number = Date.now(),
  awards: PlayerViewAwards = noAwards,
  /** The viewer's friends' usernames, to say which of them are here. */
  friendNames: string[] = [],
): PlayerLiveView {
  const me = findMe(state, memberName)
  const players = Object.values(state.players)
  // The leaderboard as it stands, with the club's badges: career ones count the club's finished sessions and this one.
  const career = careerTotals({
    players: [...awards.clubHistory.players, ...players.map((p) => ({ id: p.id, sessionId: state.id, name: p.name }))],
    matches: [...awards.clubHistory.matches, ...finished],
  })
  const entries = awardClubBadges(computeLeaderboard(players, finished), awards.clubBadges, career)
  const mine = me ? entries.find((e) => e.playerId === me.id) : undefined
  const playerNames = new Map(players.map((p) => [p.id, p.name]))
  const name = (id: string) => state.players[id]?.name ?? 'Removed player'
  const names = (ids: string[]) => ids.map(name)
  const mineIn = (ids: string[]) => Boolean(me && ids.includes(me.id))
  const limitMs = state.settings.rules.timeLimitMinutes === null ? null : state.settings.rules.timeLimitMinutes * 60_000

  const courts: PlayerLiveCourt[] = [...state.courts]
    .sort((a, b) => a.position - b.position)
    .map((court) => {
      const match = openMatchFor(state, court.id)
      const sides = match ? match.sides : court.lineup
      return {
        id: court.id,
        label: court.label,
        status: court.status,
        sides: [names(sides[0]), names(sides[1])],
        startedAt: match ? iso(match.startedAt) : null,
        endsAt: match && limitMs !== null ? iso(match.startedAt + limitMs) : null,
        mine: mineIn([...sides[0], ...sides[1]]),
        mySide: mineIn(sides[0]) ? 0 : mineIn(sides[1]) ? 1 : null,
      }
    })

  const queue = fairQueue(state)
  const upcoming = upcomingMatches(state)
  const playing = activePlayers(state).filter((p) => p.status === 'playing').length
  return {
    ended: false,
    sessionId: state.id,
    title: state.title ?? 'Club session',
    sportId: state.settings.sportId,
    clubName: club.name,
    clubHandle: club.handle,
    queueing: state.settings.rules.queueing,
    serverTime: iso(now),
    me: me && meView(state, me, finished, entries, now),
    courts,
    upNext: upcoming && upcoming.matches.map(([a, b]) => ({ sides: [names(a), names(b)], mine: mineIn([...a, ...b]) })),
    queue: queue.map((p) => ({ name: p.name, waitingSince: iso(p.queuedAt), gamesPlayed: p.gamesPlayed, isMe: p.id === me?.id })),
    counts: { waiting: queue.length, playing, checkingIn: awaitingCheckIn(state).length },
    clubBadges: awards.clubBadges.filter((b) => mine?.clubBadges.includes(b.id)),
    history: [...finished].sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0)).map((m) => toMatchResult(m, playerNames)),
    friendsHere: friendsOnRoster(state, friendNames, me?.id),
    info: sessionInfo(state),
    typicalMatchMinutes: Math.round(typicalMatchMs(state, finished) / 60_000),
  }
}
