import type { GameScore, MatchSide, TournamentMatchStatus } from '@matchpoynt/shared'
import type { EntrantState, TournamentMatchState, TournamentState } from '@/interfaces/TournamentState'
import { bracketReset, singleElimination } from '@/utils/tournament/bracket'

// How a tournament moves on: results fill later slots, byes and empty slots
// resolve on their own, pools turn into a knockout, and the tournament
// finishes. Pure functions over TournamentState.

const byId = (t: TournamentState) => new Map(t.matches.map((m) => [m.id, m]))

/** The entrant on a side once known. */
const entrantOn = (m: TournamentMatchState, side: 0 | 1) => m.slots[side].entrantId

export const isKnockoutStage = (m: TournamentMatchState) => m.stage !== 'pool'

export function matchStatus(m: TournamentMatchState): TournamentMatchStatus {
  if (m.result === 'void') return 'void'
  if (m.result) return m.result.walkover ? 'walkover' : 'done'
  if (m.sessionMatchId) return 'playing'
  if (m.sides) return 'ready'
  return m.slots.every((s) => s.entrantId !== null) ? 'ready' : 'waiting'
}

/** Players on each side of a match: rotating partners' sides, or the entrants' teams. */
export function sidePlayers(t: TournamentState, m: TournamentMatchState): [string[], string[]] {
  if (m.sides) return m.sides
  const team = (id: string | null) => t.entrants.find((e) => e.id === id)?.playerIds ?? []
  return [team(entrantOn(m, 0)), team(entrantOn(m, 1))]
}

/** Fills slots from finished matches and resolves byes, repeating until nothing changes. */
function resolveSlots(t: TournamentState): TournamentState {
  const matches = t.matches.map((m) => ({ ...m, slots: [{ ...m.slots[0] }, { ...m.slots[1] }] as TournamentMatchState['slots'] }))
  const index = new Map(matches.map((m) => [m.id, m]))
  let changed = true
  while (changed) {
    changed = false
    for (const m of matches) {
      if (m.result !== null || m.sides) continue
      for (const slot of m.slots) {
        if (!slot.source || slot.entrantId !== null || slot.empty) continue
        const src = index.get(slot.source.matchId)
        if (!src || src.result === null) continue
        if (src.result === 'void') slot.empty = true
        else {
          const side = slot.source.take === 'winner' ? src.result.winner : ((1 - src.result.winner) as 0 | 1)
          const entrant = entrantOn(src, side)
          if (entrant === null) slot.empty = true
          else slot.entrantId = entrant
        }
        changed = true
      }
      const known = m.slots.map((s) => s.entrantId !== null || s.empty)
      if (known[0] && known[1] && !m.sessionMatchId) {
        const [a, b] = m.slots
        if (a.empty && b.empty) m.result = 'void'
        else if (a.empty) m.result = { winner: 1, walkover: true }
        else if (b.empty) m.result = { winner: 0, walkover: true }
        if (m.result !== null) changed = true
      }
    }
  }
  return { ...t, matches }
}

/** Win/loss/points tallies for entrants (fixed teams) or players (rotating partners). */
export interface Tally {
  id: string
  played: number
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
}

/**
 * Ranks a table: most wins, then best point difference, then most points
 * scored, then seed (or the order given).
 */
export function standings(matches: TournamentMatchState[], ids: string[]): Tally[] {
  const tally = new Map<string, Tally>(ids.map((id) => [id, { id, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }]))
  for (const m of matches) {
    if (!m.result || m.result === 'void' || m.result.walkover) continue
    const sides = m.sides ?? [[entrantOn(m, 0)!], [entrantOn(m, 1)!]]
    const points = m.games.reduce((sum, g) => ({ a: sum.a + g.a, b: sum.b + g.b }), { a: 0, b: 0 })
    sides.forEach((members, side) => {
      for (const id of members) {
        const row = tally.get(id)
        if (!row) continue
        row.played++
        if (m.result !== 'void' && m.result!.winner === side) row.wins++
        else row.losses++
        row.pointsFor += side === 0 ? points.a : points.b
        row.pointsAgainst += side === 0 ? points.b : points.a
      }
    })
  }
  const order = new Map(ids.map((id, i) => [id, i]))
  return [...tally.values()].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst) ||
      b.pointsFor - a.pointsFor ||
      order.get(a.id)! - order.get(b.id)!,
  )
}

/** Entrants in each pool, in seed order. */
export function poolEntrants(t: TournamentState): EntrantState[][] {
  const pools: EntrantState[][] = Array.from({ length: t.pools?.count ?? 0 }, () => [])
  const seen = new Set<string>()
  for (const m of t.matches) {
    if (m.pool === null) continue
    for (const s of m.slots) {
      if (s.entrantId && !seen.has(s.entrantId)) {
        seen.add(s.entrantId)
        pools[m.pool]!.push(t.entrants.find((e) => e.id === s.entrantId)!)
      }
    }
  }
  return pools.map((p) => [...p].sort((a, b) => a.seed - b.seed))
}

/** Pool finishers who go through, seeded: every pool's winner first, then the runners-up, and so on. */
export function qualifiers(t: TournamentState): EntrantState[] {
  const advance = t.pools?.advance ?? 0
  const pools = poolEntrants(t).map((entrants, p) =>
    standings(
      t.matches.filter((m) => m.pool === p),
      entrants.map((e) => e.id),
    ),
  )
  const out: EntrantState[] = []
  for (let place = 0; place < advance; place++) {
    const atPlace = pools.map((rows) => rows[place]).filter((r): r is Tally => Boolean(r))
    atPlace.sort((a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst) || b.pointsFor - a.pointsFor)
    for (const row of atPlace) out.push(t.entrants.find((e) => e.id === row.id)!)
  }
  return out
}

const finalMatch = (t: TournamentState) => {
  const knockout = t.matches.filter((m) => m.stage === 'knockout')
  return knockout.length ? knockout.reduce((last, m) => (m.round > last.round ? m : last)) : undefined
}

/** The match that decides a double-elimination title: the reset if there is one, else the grand final. */
const deciderDE = (t: TournamentState) => byId(t).get('GF2') ?? byId(t).get('GF')

function isFinished(t: TournamentState): boolean {
  switch (t.format) {
    case 'single-elimination':
      return Boolean(finalMatch(t)?.result)
    case 'pools-knockout':
      return t.matches.some((m) => m.stage === 'knockout') && Boolean(finalMatch(t)?.result)
    case 'double-elimination': {
      const gf = byId(t).get('GF')
      if (!gf?.result) return false
      const reset = byId(t).get('GF2')
      return reset ? reset.result !== null : true
    }
    case 'round-robin':
      return t.matches.every((m) => m.result !== null)
  }
}

/**
 * Brings the tournament up to date: fills slots and byes, adds the bracket
 * reset or the knockout when they're due, and marks it finished.
 */
export function settle(t: TournamentState, now: number): TournamentState {
  let next = resolveSlots(t)
  for (;;) {
    if (next.format === 'double-elimination') {
      const gf = byId(next).get('GF')
      // The losers-bracket side won the final: one more match decides it.
      if (gf?.result && gf.result !== 'void' && gf.result.winner === 1 && !gf.result.walkover && !byId(next).has('GF2')) {
        next = resolveSlots({ ...next, matches: [...next.matches, bracketReset()] })
        continue
      }
    }
    if (next.format === 'pools-knockout' && !next.matches.some((m) => m.stage === 'knockout')) {
      const pools = next.matches.filter((m) => m.stage === 'pool')
      if (pools.length && pools.every((m) => m.result !== null)) {
        next = resolveSlots({ ...next, matches: [...next.matches, ...singleElimination(qualifiers(next), 'knockout', 'K')] })
        continue
      }
    }
    break
  }
  const done = next.status === 'active' && isFinished(next)
  return done ? { ...next, status: 'finished', finishedAt: now } : next
}

/** Records a played result and moves the tournament on. */
export function recordResult(t: TournamentState, matchId: string, winner: MatchSide, games: GameScore[], now: number): TournamentState {
  const matches = t.matches.map((m) => (m.id === matchId ? { ...m, result: { winner: winner === 'a' ? 0 : 1, walkover: false } as const, games } : m))
  return settle({ ...t, matches }, now)
}

/** The winner once decided: an entrant id, or a player id with rotating partners. */
export function championId(t: TournamentState): string | null {
  if (t.status !== 'finished') return null
  if (t.format === 'round-robin') {
    const ids = t.teamMode === 'rotating' ? t.playerIds : t.entrants.map((e) => e.id)
    return standings(t.matches, ids)[0]?.id ?? null
  }
  const decider = t.format === 'double-elimination' ? deciderDE(t) : finalMatch(t)
  if (!decider?.result || decider.result === 'void') return null
  return entrantOn(decider, decider.result.winner)
}

/** Entrants who are out: two losses in double elimination, one in a knockout, or not advancing from pools. */
export function eliminated(t: TournamentState): Set<string> {
  const out = new Set<string>()
  if (t.teamMode === 'rotating') return out
  const losses = new Map<string, number>()
  for (const m of t.matches) {
    if (!m.result || m.result === 'void' || m.stage === 'pool') continue
    const loser = entrantOn(m, (1 - m.result.winner) as 0 | 1)
    if (loser) losses.set(loser, (losses.get(loser) ?? 0) + 1)
  }
  const needed = t.format === 'double-elimination' ? 2 : 1
  for (const [id, n] of losses) if (n >= needed) out.add(id)
  if (t.format === 'pools-knockout' && t.matches.some((m) => m.stage === 'knockout')) {
    const through = new Set(qualifiers(t).map((e) => e.id))
    for (const e of t.entrants) if (!through.has(e.id)) out.add(e.id)
  }
  if (t.status === 'finished') {
    const champion = championId(t)
    for (const e of t.entrants) if (e.id !== champion) out.add(e.id)
  }
  return out
}

/** Players reserved for the tournament: kept out of open play until they're out (or it finishes). */
export function heldPlayers(t: TournamentState | null): Set<string> {
  if (!t || t.status !== 'active') return new Set()
  if (t.teamMode === 'rotating') return new Set(t.playerIds)
  const out = eliminated(t)
  return new Set(t.entrants.filter((e) => !out.has(e.id)).flatMap((e) => e.playerIds))
}

/** When a match is due, for ordering: earlier rounds first, losers rounds between winners rounds, knockouts after pools. */
function wave(m: TournamentMatchState): number {
  switch (m.stage) {
    case 'winners':
      return 2 * (m.round - 1)
    case 'losers':
      return m.round
    case 'final':
      return 1000 + m.round
    case 'knockout':
      return 100 + m.round
    case 'pool':
      return m.round
  }
}

/** Matches ready to play, in the order courts take them. */
export function readyMatches(t: TournamentState): TournamentMatchState[] {
  return t.matches
    .filter((m) => matchStatus(m) === 'ready')
    .sort((a, b) => wave(a) - wave(b) || (a.pool ?? 0) - (b.pool ?? 0) || a.index - b.index)
}
