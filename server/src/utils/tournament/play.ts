import type { GameScore, MatchSide } from '@matchpoynt/shared'
import type { CourtState, EngineContext, MatchState, SessionState } from '@/interfaces/SessionState'
import type { TournamentMatchState } from '@/interfaces/TournamentState'
import { conflict, invalid } from '@/utils/http/errors'
import { readyMatches, recordResult, sidePlayers } from '@/utils/tournament/progress'

// Tournament matches on session courts: which one a tournament court plays
// next, why it can't start, starting it, and recording its result.

/** Every player of the match is free (not on another court) and still in the session. */
function playersFree(state: SessionState, players: string[]): boolean {
  return players.every((id) => {
    const p = state.players[id]
    return p?.active === true && p.status === 'waiting'
  })
}

/** The next ready tournament match whose players are all free, in bracket order. */
export function nextPlayable(state: SessionState): TournamentMatchState | undefined {
  const t = state.tournament
  if (!t || t.status !== 'active') return undefined
  return readyMatches(t).find((m) => playersFree(state, sidePlayers(t, m).flat()))
}

/**
 * Which match each open tournament court takes next, courts in order: each
 * gets the next playable match whose players aren't already due on an
 * earlier court. The court card previews it and "start" plays exactly it.
 */
export function courtAssignments(state: SessionState): Map<string, TournamentMatchState> {
  const out = new Map<string, TournamentMatchState>()
  const t = state.tournament
  if (!t || t.status !== 'active') return out
  const taken = new Set<string>()
  const ready = readyMatches(t)
  for (const court of [...state.courts].sort((a, b) => a.position - b.position)) {
    if (!court.tournament || court.status !== 'open') continue
    const m = ready.find((r) => {
      const players = sidePlayers(t, r).flat()
      return !out.has(r.id) && ![...out.values()].includes(r) && players.every((id) => !taken.has(id)) && playersFree(state, players)
    })
    if (!m) continue
    out.set(court.id, m)
    for (const id of sidePlayers(t, m).flat()) taken.add(id)
  }
  return out
}

/** Why a ready tournament match can't start now, or `null` if it can. */
export function tournamentMatchBlockedReason(state: SessionState, m: TournamentMatchState): string | null {
  const t = state.tournament!
  if (!state.courts.some((c) => c.tournament && c.status === 'open')) {
    return state.courts.some((c) => c.tournament) ? 'Every tournament court has a match on. Wait for one to finish.' : 'Switch a court to tournament play to start matches.'
  }
  const busy = sidePlayers(t, m)
    .flat()
    .filter((id) => !playersFree(state, [id]))
    .map((id) => state.players[id]?.name ?? 'A player')
  if (busy.length) return `Waiting for ${busy.join(', ')} to finish on another court.`
  return null
}

/** `null` when a tournament court can start its next match, otherwise why not. */
export function tournamentCourtBlockedReason(state: SessionState, court: CourtState): string | null {
  const t = state.tournament
  if (!t) return 'Set up the tournament first: switch this court off and on again.'
  if (t.status === 'finished') return 'The tournament is finished. Switch this court back to open play.'
  if (court.status !== 'open') return `${court.label} already has a match.`
  if (courtAssignments(state).has(court.id)) return null
  if (nextPlayable(state)) return 'The next tournament match is due on another tournament court.'
  return readyMatches(t).length ? 'The next tournament matches are waiting for players still on court.' : 'No tournament match is ready yet: waiting for results.'
}

/**
 * Starts a tournament match on a tournament court: the requested one, or the
 * next playable in bracket order. Its players go on court as fixed sides.
 */
export function startTournamentMatchOn(state: SessionState, court: CourtState, ctx: EngineContext, tournamentMatchId?: string): SessionState {
  const t = state.tournament
  if (!t || t.status !== 'active') throw conflict(tournamentCourtBlockedReason(state, court) ?? 'There is no tournament running.')
  const target = tournamentMatchId ? t.matches.find((m) => m.id === tournamentMatchId) : courtAssignments(state).get(court.id)
  if (!target) throw conflict(tournamentCourtBlockedReason(state, court) ?? 'That tournament match is not in this tournament.')
  if (!readyMatches(t).some((m) => m.id === target.id)) throw conflict('That tournament match is not ready to play.')
  const blocked = tournamentMatchBlockedReason(state, target)
  if (blocked) throw conflict(blocked)

  const sides = sidePlayers(t, target)
  const match: MatchState = { id: ctx.newId(), courtId: court.id, courtLabel: court.label, sides, startedAt: ctx.now, finishedAt: null, games: [], winner: null }
  const players = { ...state.players }
  for (const id of sides.flat()) players[id] = { ...players[id]!, status: 'playing' }
  return {
    ...state,
    players,
    courts: state.courts.map((c) => (c.id === court.id ? { ...c, status: 'playing', lineup: [[], []] } : c)),
    matches: { ...state.matches, [match.id]: match },
    tournament: { ...t, matches: t.matches.map((m) => (m.id === target.id ? { ...m, sessionMatchId: match.id, courtLabel: court.label } : m)) },
  }
}

/** The tournament match a session match is playing, if any. */
export const tournamentMatchFor = (state: SessionState, sessionMatchId: string) =>
  state.tournament?.matches.find((m) => m.sessionMatchId === sessionMatchId && m.result === null)

/**
 * Records a finished tournament match. It needs a score: the score decides
 * who goes through.
 */
export function recordTournamentFinish(state: SessionState, sessionMatchId: string, winner: MatchSide | null, games: GameScore[], now: number): SessionState {
  const t = state.tournament
  const tm = tournamentMatchFor(state, sessionMatchId)
  if (!t || !tm) return state
  if (winner === null) throw invalid('Tournament matches need a score: it decides who goes through.', { games: 'Score needed' })
  return { ...state, tournament: recordResult(t, tm.id, winner, games, now) }
}
