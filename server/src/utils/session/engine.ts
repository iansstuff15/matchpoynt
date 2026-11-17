import { sessionDefaults, type AddPlayerInput, type CourtSide, type GameScore, type MemberSetup } from '@matchpoynt/shared'
import type { CourtState, EngineContext, MatchState, PlayerState, SessionState } from '@/interfaces/SessionState'
import { conflict, invalid, notFound } from '@/utils/http/errors'
import { completeSides, pickPlayers, splitSides } from '@/utils/session/matchmaking'
import { playersPerSide, scoringFormat, tierRank } from '@/utils/session/rules'
import { decideMatch } from '@/utils/session/scoring'
import { recordTournamentFinish, startTournamentMatchOn, tournamentCourtBlockedReason } from '@/utils/tournament/play'
import { heldPlayers } from '@/utils/tournament/progress'

// Pure session engine: state in, state out. No I/O, clocks or random ids;
// those come in through EngineContext.

export function activePlayers(state: SessionState): PlayerState[] {
  return Object.values(state.players).filter((p) => p.active)
}

/** Players placed by hand on an open court. They wait there, not in the queue. */
export function placedIds(state: SessionState): Set<string> {
  return new Set(state.courts.flatMap((c) => c.lineup.flat()))
}

/** Only players who checked in at the venue can be matched or placed on a court. */
export const isCheckedIn = (player: PlayerState) => player.checkedInAt !== null

/** Players on a break sit out: they aren't matched, placed or auto-filled until they're back. */
export const isOnBreak = (player: PlayerState) => player.breakSince != null

/**
 * Waiting, checked-in players in call order: lowest rotation first, then
 * longest wait. Placed players, anyone not checked in, and players still in
 * the tournament are excluded.
 */
export function fairQueue(state: SessionState): PlayerState[] {
  const placed = placedIds(state)
  const held = heldPlayers(state.tournament)
  return activePlayers(state)
    .filter((p) => p.status === 'waiting' && isCheckedIn(p) && !isOnBreak(p) && !placed.has(p.id) && !held.has(p.id))
    .sort((a, b) => a.rotation - b.rotation || a.queuedAt - b.queuedAt)
}

/** Checked-in players taking a break, longest first. */
export function onBreak(state: SessionState): PlayerState[] {
  return activePlayers(state)
    .filter((p) => isCheckedIn(p) && isOnBreak(p))
    .sort((a, b) => a.breakSince! - b.breakSince!)
}

/**
 * Why `playerId` can't start (`on`) or end a break now, or `null` when they
 * can. Only checked-in players off court take one, and never while they're
 * still in the tournament (the bracket would wait on them).
 */
export function breakBlockedReason(state: SessionState, playerId: string, on: boolean): string | null {
  if (state.status !== 'active') return 'This session has ended.'
  const player = state.players[playerId]
  if (!player?.active) return 'That player is not in this session.'
  if (!on) return isOnBreak(player) ? null : `${player.name} isn't on a break.`
  if (isOnBreak(player)) return `${player.name} is already on a break.`
  if (!isCheckedIn(player)) return `${player.name} hasn't checked in yet.`
  if (player.status === 'playing') return `${player.name} is on court. A break can start once their match ends.`
  if (heldPlayers(state.tournament).has(playerId)) return `${player.name} is still in the tournament, so they can't take a break until they're knocked out or it finishes.`
  return null
}

/**
 * Starts or ends a player's break. Starting takes them off any court they
 * were placed on; coming back puts them in the queue from now, keeping
 * their place in the rotation, and auto-fill may pick them straight away.
 */
export function setPlayerBreak(state: SessionState, playerId: string, on: boolean, ctx: EngineContext): SessionState {
  const blocked = breakBlockedReason(state, playerId, on)
  if (blocked) throw state.players[playerId]?.active ? conflict(blocked) : notFound(blocked)
  const player = state.players[playerId]!
  const changed: PlayerState = on ? { ...player, breakSince: ctx.now } : { ...player, breakSince: null, queuedAt: ctx.now }
  const next = { ...state, players: { ...state.players, [playerId]: changed } }
  return autoFill(on ? withoutPlacement(next, playerId) : next, ctx)
}


/** On the roster but not at the venue yet, by name. */
export function awaitingCheckIn(state: SessionState): PlayerState[] {
  return activePlayers(state)
    .filter((p) => !isCheckedIn(p))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function playersPerMatch(state: SessionState): number {
  return playersPerSide(state.settings) * 2
}

export function hasEnoughWaiting(state: SessionState): boolean {
  return fairQueue(state).length >= playersPerMatch(state)
}

export function openMatchFor(state: SessionState, courtId: string): MatchState | undefined {
  return Object.values(state.matches).find((m) => m.courtId === courtId && m.finishedAt === null)
}

function requireActive(state: SessionState) {
  if (state.status !== 'active') throw conflict('This session has ended.')
}

/**
 * A check-in is settled once the player has joined the queue for it
 * (`queuedAt` at or after `checkedInAt`). QR check-ins are recorded by the
 * database alone, so they arrive unsettled.
 */
const isSettled = (p: PlayerState) => p.checkedInAt !== null && p.queuedAt >= p.checkedInAt

/** Rotation a newcomer starts at, per the late-joiner rule, measured against players already in the queue. */
function startingRotation(state: SessionState): number {
  const rotations = activePlayers(state)
    .filter(isSettled)
    .map((p) => p.rotation)
  if (state.settings.rules.lateJoiners === 'priority' || rotations.length === 0) return 0
  return Math.min(...rotations)
}

/**
 * Puts checked-in players into the queue in the order they arrived, at the
 * late-joiner rotation. Runs on every load, so QR check-ins recorded since
 * the last change take their fair place. Settled players are untouched.
 */
export function settleCheckIns(state: SessionState): SessionState {
  const arrivals = activePlayers(state)
    .filter((p) => p.checkedInAt !== null && !isSettled(p))
    .sort((a, b) => a.checkedInAt! - b.checkedInAt!)
  let next = state
  for (const p of arrivals) {
    const settled: PlayerState = { ...p, queuedAt: p.checkedInAt!, rotation: startingRotation(next) }
    next = { ...next, players: { ...next.players, [p.id]: settled } }
  }
  return next
}

/**
 * Adds a player without auto-filling, so bulk setup can fill once at the end.
 * Roster players start not checked in; `checkedIn` is for someone the Queue
 * Master adds at the venue.
 */
export function insertPlayer(state: SessionState, member: MemberSetup, ctx: EngineContext, checkedIn = false): SessionState {
  const player: PlayerState = {
    id: member.id,
    name: member.name.trim(),
    tierId: member.tierId,
    gamesPlayed: 0,
    rotation: startingRotation(state),
    queuedAt: ctx.now,
    status: 'waiting',
    active: true,
    checkedInAt: checkedIn ? ctx.now : null,
  }
  return { ...state, players: { ...state.players, [player.id]: player } }
}

/**
 * A player added by the Queue Master from the board. Usually they're at the
 * venue, so they're checked in; with `checkedIn: false` they wait to check in.
 */
export function addPlayer(state: SessionState, input: AddPlayerInput, ctx: EngineContext): SessionState {
  requireActive(state)
  const { checkedIn = true, ...member } = input
  return autoFill(insertPlayer(state, { id: ctx.newId(), ...member }, ctx, checkedIn), ctx)
}

/**
 * The Queue Master checks a roster player in by hand (the QR does the same in
 * the database). They join the queue now, at the late-joiner rotation.
 * Checking in twice changes nothing.
 */
export function checkInPlayer(state: SessionState, playerId: string, ctx: EngineContext): SessionState {
  requireActive(state)
  const player = state.players[playerId]
  if (!player?.active) throw notFound('That player is not in this session.')
  if (isCheckedIn(player)) return state
  const arrived = { ...state, players: { ...state.players, [playerId]: { ...player, checkedInAt: ctx.now } } }
  return autoFill(settleCheckIns(arrived), ctx)
}

/** Removes a waiting or placed player. Players on court stay until their match ends. */
export function removePlayer(state: SessionState, playerId: string): SessionState {
  requireActive(state)
  const player = state.players[playerId]
  if (!player?.active) throw notFound('That player is not in this session.')
  if (player.status === 'playing') throw conflict(`${player.name} is on court. Finish the match first.`)
  if (heldPlayers(state.tournament).has(playerId)) {
    throw conflict(`${player.name} is still in the tournament. Cancel the tournament, or wait until they're knocked out, to remove them.`)
  }
  return withoutPlacement({ ...state, players: { ...state.players, [playerId]: { ...player, active: false } } }, playerId)
}

function withoutPlacement(state: SessionState, playerId: string): SessionState {
  return {
    ...state,
    courts: state.courts.map((c) => ({ ...c, lineup: [c.lineup[0].filter((id) => id !== playerId), c.lineup[1].filter((id) => id !== playerId)] })),
  }
}

/**
 * Places a waiting player on one side of an open court, moving them from
 * wherever they were placed before. The match starts separately.
 */
export function assignPlayer(state: SessionState, courtId: string, playerId: string, side: CourtSide): SessionState {
  requireActive(state)
  const court = state.courts.find((c) => c.id === courtId)
  if (!court) throw notFound('That court is not in this session.')
  if (court.status !== 'open') throw conflict(`${court.label} has a match in progress. Place players on an open court.`)
  if (court.tournament) throw conflict(`${court.label} plays tournament matches: the bracket decides who plays there.`)
  const player = state.players[playerId]
  if (!player?.active) throw notFound('That player is not in this session.')
  if (player.status === 'playing') throw conflict(`${player.name} is on court. Finish their match first.`)
  if (!isCheckedIn(player)) throw conflict(`${player.name} hasn't checked in yet. Check them in first.`)
  if (isOnBreak(player)) throw conflict(`${player.name} is on a break. End their break first.`)
  if (heldPlayers(state.tournament).has(playerId)) {
    throw conflict(`${player.name} is in the tournament, so they stay out of open play until they're knocked out.`)
  }

  const next = withoutPlacement(state, playerId)
  const target = next.courts.find((c) => c.id === courtId)!
  const perSide = playersPerSide(state.settings)
  if (target.lineup[side].length >= perSide) {
    throw conflict(`Side ${side + 1} of ${court.label} is full (${perSide} per side). Move someone off it first.`)
  }
  const lineup: CourtState['lineup'] = [[...target.lineup[0]], [...target.lineup[1]]]
  lineup[side].push(playerId)
  return { ...next, courts: next.courts.map((c) => (c.id === courtId ? { ...c, lineup } : c)) }
}

/** Sends a placed player back to the queue. Does nothing if they weren't placed. */
export function unassignPlayer(state: SessionState, playerId: string): SessionState {
  requireActive(state)
  if (!state.players[playerId]?.active) throw notFound('That player is not in this session.')
  return withoutPlacement(state, playerId)
}

/** Drops players who left, and trims sides that are now too big (e.g. doubles changed to singles). */
export function tidyLineups(state: SessionState): SessionState {
  const perSide = playersPerSide(state.settings)
  const held = heldPlayers(state.tournament)
  const keep = (ids: string[]) =>
    ids
      .filter((id) => {
        const p = state.players[id]
        return p?.active && p.status === 'waiting' && isCheckedIn(p) && !isOnBreak(p) && !held.has(id)
      })
      .slice(0, perSide)
  return { ...state, courts: state.courts.map((c) => ({ ...c, lineup: [keep(c.lineup[0]), keep(c.lineup[1])] })) }
}

/** `null` when the court can start now, otherwise why not, in the user's words. */
export function startBlockedReason(state: SessionState, court: CourtState): string | null {
  if (state.status !== 'active') return 'This session has ended.'
  if (court.status !== 'open') return `${court.label} already has a match.`
  if (court.tournament) return tournamentCourtBlockedReason(state, court)
  const perSide = playersPerSide(state.settings)
  const placed = court.lineup[0].length + court.lineup[1].length
  const open = perSide * 2 - placed
  if (open === 0) return null
  if (state.settings.rules.queueing === 'manual') {
    return `Drag ${open} more player${open === 1 ? '' : 's'} onto ${court.label}. Automatic queueing is off.`
  }
  const waiting = fairQueue(state).length
  if (waiting >= open) return null
  const short = open - waiting
  return `${court.label} needs ${short} more checked-in player${short === 1 ? '' : 's'} waiting.`
}

/**
 * Starts the match on a court: players placed by hand keep their sides; with
 * automatic queueing, the session's matchmaking fills any places left. A
 * tournament court starts the next bracket match instead.
 */
export function startMatch(state: SessionState, courtId: string, ctx: EngineContext): SessionState {
  requireActive(state)
  const court = state.courts.find((c) => c.id === courtId)
  if (!court) throw notFound('That court is not in this session.')
  if (court.tournament) {
    if (court.status !== 'open') throw conflict(`${court.label} already has a match.`)
    return startTournamentMatchOn(state, court, ctx)
  }
  const blocked = startBlockedReason(state, court)
  if (blocked) throw conflict(blocked)

  const { matchmaking } = state.settings
  const rank = tierRank(state.settings)
  const perSide = playersPerSide(state.settings)
  const lineup: [PlayerState[], PlayerState[]] = [
    court.lineup[0].map((id) => state.players[id]!),
    court.lineup[1].map((id) => state.players[id]!),
  ]
  const open = perSide * 2 - lineup[0].length - lineup[1].length
  const picked = open > 0 ? pickPlayers(matchmaking, fairQueue(state), open, rank) : []
  const sides = completeSides(matchmaking, lineup, picked, perSide, rank)
  const match: MatchState = {
    id: ctx.newId(),
    courtId,
    courtLabel: court.label,
    sides,
    startedAt: ctx.now,
    finishedAt: null,
    games: [],
    winner: null,
  }

  const players = { ...state.players }
  for (const id of sides.flat()) players[id] = { ...players[id]!, status: 'playing' }

  return {
    ...state,
    players,
    courts: state.courts.map((c) => (c.id === courtId ? { ...c, status: 'playing', lineup: [[], []] } : c)),
    matches: { ...state.matches, [match.id]: match },
  }
}

/**
 * Fills every open court it can, when auto-fill is on. Open-play courts fill
 * from the queue when queueing is automatic, leaving courts someone is
 * arranging by hand alone; tournament courts take the next bracket match.
 */
export function autoFill(state: SessionState, ctx: EngineContext): SessionState {
  const { autoFill: on, queueing } = state.settings.rules
  if (!on) return state
  let next = state
  for (const court of state.courts) {
    const current = next.courts.find((c) => c.id === court.id)!
    if (current.status !== 'open') continue
    if (current.tournament) {
      if (tournamentCourtBlockedReason(next, current) === null) next = startMatch(next, court.id, ctx)
      continue
    }
    const untouched = current.lineup[0].length + current.lineup[1].length === 0
    if (queueing === 'automatic' && untouched && hasEnoughWaiting(next)) next = startMatch(next, court.id, ctx)
  }
  return next
}

/**
 * Records the result, returns the players to the back of the queue and
 * frees the court. An empty `games` list ends the match with no result.
 */
export function finishMatch(state: SessionState, courtId: string, games: GameScore[], ctx: EngineContext): SessionState {
  requireActive(state)
  const match = openMatchFor(state, courtId)
  if (!match) throw conflict('That court has no match in progress.')
  const format = scoringFormat(state.settings)
  if (!format) throw invalid('This session has no valid scoring format. Check the session settings.')

  const winner = decideMatch(format, games)
  // A tournament match moves its bracket on (and needs a score to do it).
  const scored = recordTournamentFinish(state, match.id, winner, games, ctx.now)
  const players = { ...scored.players }
  for (const id of match.sides.flat()) {
    const p = players[id]
    if (p) {
      players[id] = { ...p, status: 'waiting', gamesPlayed: p.gamesPlayed + 1, rotation: p.rotation + 1, queuedAt: ctx.now }
    }
  }

  return autoFill(
    tidyLineups({
      ...scored,
      players,
      courts: scored.courts.map((c) => (c.id === courtId ? { ...c, status: 'open' } : c)),
      matches: { ...scored.matches, [match.id]: { ...match, finishedAt: ctx.now, games, winner } },
    }),
    ctx,
  )
}


/**
 * Replays the match on a court from the start: same players on the same
 * sides, the clock back to zero, nothing recorded. For a false start or a
 * timer started too early.
 */
export function restartMatch(state: SessionState, courtId: string, ctx: EngineContext): SessionState {
  requireActive(state)
  const court = state.courts.find((c) => c.id === courtId)
  if (!court) throw notFound('That court is not in this session.')
  const match = openMatchFor(state, courtId)
  if (!match) throw conflict(`${court.label} has no match in progress to restart.`)
  return { ...state, matches: { ...state.matches, [match.id]: { ...match, startedAt: ctx.now, games: [] } } }
}

/**
 * Cancels the match on a court: no result, nothing recorded. Its players go
 * back to the queue where they were (starting a match doesn't move anyone
 * in it), and the court opens. A tournament match goes back to waiting for a
 * court. Auto-fill doesn't refill this court straight away, or it would put
 * the same players back on it.
 */
export function cancelMatch(state: SessionState, courtId: string): SessionState {
  requireActive(state)
  const court = state.courts.find((c) => c.id === courtId)
  if (!court) throw notFound('That court is not in this session.')
  const match = openMatchFor(state, courtId)
  if (!match) throw conflict(`${court.label} has no match in progress to cancel.`)

  const players = { ...state.players }
  for (const id of match.sides.flat()) if (players[id]) players[id] = { ...players[id], status: 'waiting' }
  const matches = { ...state.matches }
  delete matches[match.id]
  const t = state.tournament
  const tournament = t && { ...t, matches: t.matches.map((m) => (m.sessionMatchId === match.id && m.result === null ? { ...m, sessionMatchId: null, courtLabel: null } : m)) }

  return {
    ...state,
    players,
    matches,
    tournament,
    courts: state.courts.map((c) => (c.id === courtId ? { ...c, status: 'open', lineup: [[], []] } : c)),
  }
}

/**
 * Starts the session over, keeping its setup: every match (finished or on
 * court) and the tournament are dropped, courts open, and everyone still in
 * the session waits in the order they arrived with no games played.
 * Check-ins are kept. The caller also deletes the stored results
 * (`restart_session`), since saves never delete matches.
 */
export function restartSession(state: SessionState, ctx: EngineContext): SessionState {
  requireActive(state)
  const players = Object.fromEntries(
    Object.values(state.players).map((p) => [
      p.id,
      { ...p, status: 'waiting' as const, gamesPlayed: 0, rotation: 0, queuedAt: p.checkedInAt ?? p.queuedAt },
    ]),
  )
  return autoFill(
    {
      ...state,
      players,
      courts: state.courts.map((c) => ({ ...c, status: 'open' as const, lineup: [[], []] as CourtState['lineup'], tournament: false })),
      matches: {},
      tournament: null,
    },
    ctx,
  )
}

/** `null` when the session can be finished now, otherwise why not: never with a match on court. */
export function endBlockedReason(state: SessionState): string | null {
  if (state.status !== 'active') return 'This session has already ended.'
  const playing = [...state.courts].sort((a, b) => a.position - b.position).filter((c) => c.status === 'playing')
  if (!playing.length) return null
  const names = playing.map((c) => c.label)
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
  return `${list} still ${names.length === 1 ? 'has a match' : 'have matches'} on. Finish ${names.length === 1 ? 'it' : 'them'} before ending the session.`
}

/** `null` when another court can be added, otherwise why not. */
export function addCourtBlockedReason(state: SessionState): string | null {
  if (state.status !== 'active') return 'This session has ended.'
  if (state.courts.length >= sessionDefaults.maxCourts) return `A session can have up to ${sessionDefaults.maxCourts} courts.`
  return null
}

/**
 * Adds an open court at the end, named after the first free "Court N".
 * With auto-fill on, it takes the next group straight away.
 */
export function addCourt(state: SessionState, ctx: EngineContext): SessionState {
  requireActive(state)
  const blocked = addCourtBlockedReason(state)
  if (blocked) throw conflict(blocked)
  const taken = new Set(state.courts.map((c) => c.label.trim().toLowerCase()))
  let n = state.courts.length + 1
  while (taken.has(`court ${n}`)) n++
  const court: CourtState = { id: ctx.newId(), label: `Court ${n}`, position: state.courts.length, status: 'open', lineup: [[], []], tournament: false }
  return autoFill({ ...state, courts: [...state.courts, court] }, ctx)
}

/** `null` when the court can be removed now, otherwise why not: never with a match on it, never the last court (or a running tournament's last court). */
export function removeCourtBlockedReason(state: SessionState, court: CourtState): string | null {
  if (state.status !== 'active') return 'This session has ended.'
  if (court.status === 'playing') return `${court.label} has a match on. Finish or cancel it first.`
  if (state.courts.length <= 1) return 'A session needs at least one court.'
  if (court.tournament && state.tournament?.status === 'active' && state.courts.filter((c) => c.tournament).length <= 1) {
    return `${court.label} is the tournament's only court. Switch another court to the tournament first.`
  }
  return null
}

/**
 * Removes a court with no match on it. Players placed on it go back to the
 * queue (placing them didn't move them in it); the other courts keep their
 * order. Past results keep the court's name.
 */
export function removeCourt(state: SessionState, courtId: string): SessionState {
  requireActive(state)
  const court = state.courts.find((c) => c.id === courtId)
  if (!court) throw notFound('That court is no longer in this session.')
  const blocked = removeCourtBlockedReason(state, court)
  if (blocked) throw conflict(blocked)
  return {
    ...state,
    courts: state.courts.filter((c) => c.id !== courtId).map((c, position) => ({ ...c, position })),
  }
}

export interface UpcomingMatches {
  /** Groups in the order they'll be called, each already split into sides. */
  matches: [string[], string[]][]
  /** Checked-in players left over after the full groups, in fair order. */
  waiting: string[]
}

/**
 * Who plays next, and against whom, when queueing is automatic: the
 * session's matchmaking run over the queue again and again, exactly as
 * starting an empty court would pick and split. `null` in manual mode.
 */
export function upcomingMatches(state: SessionState): UpcomingMatches | null {
  if (state.settings.rules.queueing !== 'automatic') return null
  const { matchmaking } = state.settings
  const rank = tierRank(state.settings)
  const size = playersPerMatch(state)
  const matches: UpcomingMatches['matches'] = []
  let queue = fairQueue(state)
  while (queue.length >= size) {
    const picked = pickPlayers(matchmaking, queue, size, rank)
    if (picked.length < size) break
    matches.push(splitSides(matchmaking, picked, rank))
    const called = new Set(picked.map((p) => p.id))
    queue = queue.filter((p) => !called.has(p.id))
  }
  return { matches, waiting: queue.map((p) => p.id) }
}
