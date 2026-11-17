import { sportRules, tournamentLimits, type TournamentSetupInput } from '@matchpoynt/shared'
import type { EngineContext, SessionState } from '@/interfaces/SessionState'
import type { TournamentMatchState, TournamentState } from '@/interfaces/TournamentState'
import { conflict, invalid, notFound } from '@/utils/http/errors'
import { autoFill, isCheckedIn, isOnBreak, tidyLineups } from '@/utils/session/engine'
import { playersPerSide, tierRank } from '@/utils/session/rules'
import { doubleElimination, poolMatches, rotatingRounds, roundRobin, singleElimination } from '@/utils/tournament/bracket'
import { startTournamentMatchOn } from '@/utils/tournament/play'
import { settle } from '@/utils/tournament/progress'
import { buildTeams, seedEntrants } from '@/utils/tournament/teams'

// Session-level tournament changes: setting one up when the first court is
// switched to tournament play, switching courts in and out, starting a
// chosen match, and cancelling.

function requireActive(state: SessionState) {
  if (state.status !== 'active') throw conflict('This session has ended.')
}

function courtOf(state: SessionState, courtId: string) {
  const court = state.courts.find((c) => c.id === courtId)
  if (!court) throw notFound('That court is not in this session.')
  return court
}

/** Checks the entrant count against the format, in the user's words. */
function checkEntrantCount(input: TournamentSetupInput, entrants: number, noun: string) {
  const { format } = input
  const limits = tournamentLimits
  const say = (message: string) => {
    throw invalid(message, { entrants: message })
  }
  if (entrants > limits.maxEntrants) say(`A tournament can have up to ${limits.maxEntrants} ${noun}s.`)
  if (format === 'double-elimination' && entrants < limits.minDoubleEliminationEntrants) {
    say(`Double elimination needs at least ${limits.minDoubleEliminationEntrants} ${noun}s.`)
  }
  if (format === 'round-robin') {
    if (entrants < limits.minRoundRobinEntrants) say(`Round robin needs at least ${limits.minRoundRobinEntrants} ${noun}s.`)
    if (input.teamMode !== 'rotating' && entrants > limits.maxRoundRobinEntrants) {
      say(`Round robin is for up to ${limits.maxRoundRobinEntrants} ${noun}s (everyone plays everyone). Try pools then knockout.`)
    }
  }
  if (entrants < limits.minEntrants) say(`A tournament needs at least ${limits.minEntrants} ${noun}s.`)
  if (format === 'pools-knockout') {
    const { count, advance } = input.pools
    if (!Number.isInteger(count) || count < 2 || count > limits.maxPools) say(`Choose 2 to ${limits.maxPools} pools.`)
    const smallest = Math.floor(entrants / count)
    if (smallest < limits.minPoolSize) say(`${entrants} ${noun}s make pools of fewer than ${limits.minPoolSize}. Use fewer pools.`)
    if (!Number.isInteger(advance) || advance < 1 || advance > limits.maxAdvancePerPool) {
      say(`Choose 1 to ${limits.maxAdvancePerPool} ${noun}s to go through from each pool.`)
    }
    if (advance >= smallest) say(`With pools of ${smallest}, at most ${smallest - 1} can go through from each pool.`)
  }
}

/**
 * Sets up the session's tournament and switches the first court to it. A
 * finished tournament is replaced; a running one must be cancelled first.
 */
export function createTournament(state: SessionState, input: TournamentSetupInput, ctx: EngineContext): SessionState {
  requireActive(state)
  if (state.tournament?.status === 'active') throw conflict('A tournament is already running in this session. Cancel it first to start another.')
  const court = courtOf(state, input.courtId)
  if (court.status !== 'open') throw conflict(`${court.label} has a match on. Finish it before switching it to tournament play.`)

  const name = input.name.trim() || `${sportRules[state.settings.sportId].name} tournament`
  if (name.length > tournamentLimits.nameMaxLength) throw invalid(`Tournament names can be up to ${tournamentLimits.nameMaxLength} characters.`, { name: 'Too long' })

  const ids = [...new Set(input.playerIds)]
  const players = ids.map((id) => {
    const p = state.players[id]
    if (!p?.active) throw invalid('Some players are no longer in this session. Reload and pick again.', { entrants: 'Unknown player' })
    if (!isCheckedIn(p)) throw invalid(`${p.name} hasn't checked in yet. Check them in, or leave them out.`, { entrants: 'Not checked in' })
    if (isOnBreak(p)) throw invalid(`${p.name} is on a break. End their break, or leave them out.`, { entrants: 'On a break' })
    return p
  })

  const perSide = playersPerSide(state.settings)
  const rankOf = tierRank(state.settings)
  const rank = (id: string) => rankOf(state.players[id]!)
  // In singles every player is an entrant, so partners don't apply.
  const teamMode = perSide === 1 ? 'fixed' : input.teamMode

  let tournament: TournamentState
  const base = {
    id: ctx.newId(),
    name,
    format: input.format,
    teamMode,
    seeding: input.seeding,
    status: 'active' as const,
    setup: { teamBuild: input.teamBuild, teams: input.teams, rounds: input.rounds },
    createdAt: ctx.now,
    finishedAt: null,
  }

  if (teamMode === 'rotating') {
    if (input.format !== 'round-robin') {
      throw invalid('Rotating partners works with round robin only. Pick round robin, or play in fixed teams.', { format: 'Rotating needs round robin' })
    }
    if (players.length < perSide * 2) throw invalid(`Rotating partners needs at least ${perSide * 2} players.`, { entrants: 'Too few players' })
    if (!Number.isInteger(input.rounds) || input.rounds < 1 || input.rounds > tournamentLimits.maxRounds) {
      throw invalid(`Choose 1 to ${tournamentLimits.maxRounds} rounds.`, { rounds: 'Out of range' })
    }
    tournament = {
      ...base,
      entrants: [],
      playerIds: ids,
      pools: null,
      matches: rotatingRounds(ids, perSide, input.rounds, ctx.random),
    }
  } else {
    const noun = perSide === 1 ? 'player' : 'team'
    const teams = buildTeams(players, perSide, input.teamBuild, input.teams, rank, ctx.random)
    checkEntrantCount({ ...input, teamMode }, teams.length, noun)
    const entrants = seedEntrants(teams, input.seeding, rank, ctx.random, ctx.newId)
    const matches: TournamentMatchState[] =
      input.format === 'single-elimination'
        ? singleElimination(entrants)
        : input.format === 'double-elimination'
          ? doubleElimination(entrants)
          : input.format === 'round-robin'
            ? roundRobin(entrants)
            : poolMatches(entrants, input.pools.count)
    tournament = {
      ...base,
      entrants,
      playerIds: ids,
      pools: input.format === 'pools-knockout' ? { ...input.pools } : null,
      matches,
    }
  }

  const next: SessionState = {
    ...state,
    tournament: settle(tournament, ctx.now),
    courts: state.courts.map((c) => (c.id === court.id ? { ...c, tournament: true, lineup: [[], []] } : c)),
  }
  // Tournament players leave open-play lineups; auto-fill may start the first match.
  return autoFill(tidyLineups(next), ctx)
}

/**
 * `null` when competitors can still be changed from the board, otherwise why
 * not: only while a tournament runs, before any of its matches has been
 * played (a drawn bracket can't take new entrants later), and not when the
 * teams were picked by hand.
 */
export function competitorsBlockedReason(state: SessionState): string | null {
  const t = state.tournament
  if (!t || t.status !== 'active') return 'No tournament is running.'
  if (t.matches.some((m) => m.sessionMatchId !== null || (m.result !== null && m.result !== 'void' && !m.result.walkover))) {
    return "The tournament has started, so its draw can't change. Cancel it and set it up again to change who's competing."
  }
  if (!t.setup) return "This tournament was set up before competitors could be changed here. Cancel it and set it up again to change who's competing."
  if (t.teamMode === 'fixed' && t.setup.teamBuild === 'manual' && playersPerSide(state.settings) > 1) {
    return "Its teams were picked by hand. Cancel the tournament and set it up again to change who's competing."
  }
  return null
}

/**
 * Sets who's competing in the tournament before it starts, as a whole list
 * (in doubles, players join in pairs): the draw is made again with the same
 * settings (format, teams, seeding), and competitors sit out open play. The
 * API says why when it can't.
 */
export function setTournamentCompetitors(state: SessionState, playerIds: string[], ctx: EngineContext): SessionState {
  requireActive(state)
  const blocked = competitorsBlockedReason(state)
  if (blocked) throw conflict(blocked)
  const t = state.tournament!
  const ids = [...new Set(playerIds)]
  if (ids.length === t.playerIds.length && ids.every((id) => t.playerIds.includes(id))) return state
  for (const id of ids) {
    const player = state.players[id]
    if (!player?.active) throw notFound('Some players are no longer in this session. Reload and pick again.')
    if (!isCheckedIn(player)) throw invalid(`${player.name} hasn't checked in yet. Check them in first.`, { entrants: 'Not checked in' })
    if (isOnBreak(player) && !t.playerIds.includes(id)) throw invalid(`${player.name} is on a break. End their break first.`, { entrants: 'On a break' })
    if (player.status === 'playing' && !t.playerIds.includes(id)) throw conflict(`${player.name} is on court. Finish their match first.`)
  }

  const court = state.courts.find((c) => c.tournament && c.status === 'open') ?? state.courts.find((c) => c.tournament)
  if (!court) throw conflict('The tournament has no court. Switch a court to tournament play first.')
  const redrawn = createTournament(
    { ...state, tournament: null },
    {
      courtId: court.id,
      name: t.name,
      format: t.format,
      teamMode: t.teamMode,
      teamBuild: t.setup!.teamBuild,
      teams: t.setup!.teams,
      seeding: t.seeding,
      pools: t.pools ?? { count: 2, advance: 1 },
      rounds: t.setup!.rounds,
      playerIds: ids,
    },
    ctx,
  )
  // Courts already playing the tournament stay switched to it.
  return { ...redrawn, courts: redrawn.courts.map((c) => (state.courts.find((o) => o.id === c.id)?.tournament ? { ...c, tournament: true } : c)) }
}

/** Switches a court in or out of tournament play once a tournament exists. */
export function setCourtTournament(state: SessionState, courtId: string, on: boolean, ctx: EngineContext): SessionState {
  requireActive(state)
  const court = courtOf(state, courtId)
  if (court.tournament === on) return state
  if (court.status !== 'open') throw conflict(`${court.label} has a match on. Finish it first.`)
  if (on && state.tournament?.status !== 'active') throw invalid('Set up a tournament first.', { courtId: 'No tournament' })
  const next: SessionState = { ...state, courts: state.courts.map((c) => (c.id === courtId ? { ...c, tournament: on, lineup: [[], []] } : c)) }
  return autoFill(next, ctx)
}

/** Starts a chosen ready match on the first open tournament court. */
export function startTournamentMatch(state: SessionState, tournamentMatchId: string, ctx: EngineContext): SessionState {
  requireActive(state)
  if (!state.tournament) throw notFound('This session has no tournament.')
  if (!state.tournament.matches.some((m) => m.id === tournamentMatchId)) throw notFound('That match is not in this tournament.')
  const court = [...state.courts].sort((a, b) => a.position - b.position).find((c) => c.tournament && c.status === 'open')
  if (!court) {
    throw conflict(
      state.courts.some((c) => c.tournament) ? 'Every tournament court has a match on. Wait for one to finish.' : 'Switch a court to tournament play to start matches.',
    )
  }
  return startTournamentMatchOn(state, court, ctx, tournamentMatchId)
}

/**
 * Cancels the tournament: courts go back to open play and its players rejoin
 * the queue. Matches already played stay on the leaderboard. A match on court
 * must finish first.
 */
export function cancelTournament(state: SessionState, ctx: EngineContext): SessionState {
  requireActive(state)
  const t = state.tournament
  if (!t) throw notFound('This session has no tournament.')
  const onCourt = t.matches.find((m) => m.sessionMatchId && m.result === null)
  if (onCourt) throw conflict(`A tournament match is on ${onCourt.courtLabel ?? 'court'}. Finish it first.`)
  return autoFill(
    {
      ...state,
      tournament: null,
      tournamentSlug: null,
      courts: state.courts.map((c) => ({ ...c, tournament: false })),
    },
    ctx,
  )
}
