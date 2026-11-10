import type { EntrantState, SlotSource, SlotState, TournamentMatchState } from '@/interfaces/TournamentState'

// Bracket and schedule generation. Pure: entrants in, matches out. Entrants
// arrive already seeded (index 0 is seed 1).

const fixed = (entrantId: string | null): SlotState => ({ entrantId, source: null, empty: entrantId === null })
const from = (matchId: string, take: SlotSource['take']): SlotState => ({ entrantId: null, source: { matchId, take }, empty: false })

function match(id: string, stage: TournamentMatchState['stage'], round: number, index: number, slots: [SlotState, SlotState], pool: number | null = null): TournamentMatchState {
  return { id, stage, round, index, pool, slots, sides: null, result: null, games: [], sessionMatchId: null, courtLabel: null }
}

/** The next power of two at or above `n` (at least 2). */
export const bracketSize = (n: number) => Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(n, 2))))

/**
 * Seed numbers in bracket order, so the top seeds meet as late as possible:
 * for 8, [1, 8, 4, 5, 2, 7, 3, 6].
 */
export function seedOrder(size: number): number[] {
  let order = [1]
  while (order.length < size) {
    const n = order.length * 2
    order = order.flatMap((s) => [s, n + 1 - s])
  }
  return order
}

/** First-round slots: seeds in bracket order, with byes where the seed doesn't exist. */
function firstRoundSlots(entrants: EntrantState[]): [SlotState, SlotState][] {
  const order = seedOrder(bracketSize(entrants.length))
  const at = (seed: number) => fixed(entrants[seed - 1]?.id ?? null)
  const pairs: [SlotState, SlotState][] = []
  for (let i = 0; i < order.length; i += 2) pairs.push([at(order[i]!), at(order[i + 1]!)])
  return pairs
}

/** A knockout bracket. `prefix` names its matches (e.g. "K" gives "K1-0"). */
export function singleElimination(entrants: EntrantState[], stage: 'knockout' | 'winners' = 'knockout', prefix = 'K'): TournamentMatchState[] {
  const first = firstRoundSlots(entrants)
  const rounds = Math.log2(first.length * 2)
  const matches = first.map((slots, i) => match(`${prefix}1-${i}`, stage, 1, i, slots))
  for (let r = 2; r <= rounds; r++) {
    const count = 2 ** (rounds - r)
    for (let i = 0; i < count; i++) {
      matches.push(match(`${prefix}${r}-${i}`, stage, r, i, [from(`${prefix}${r - 1}-${2 * i}`, 'winner'), from(`${prefix}${r - 1}-${2 * i + 1}`, 'winner')]))
    }
  }
  return matches
}

/**
 * Double elimination: a winners bracket, a losers bracket fed by its losers
 * (dropping in on alternate sides to avoid early rematches), and a grand final.
 * A bracket reset (a second final) is added when the losers-bracket side wins it.
 */
export function doubleElimination(entrants: EntrantState[]): TournamentMatchState[] {
  const winners = singleElimination(entrants, 'winners', 'W')
  const size = bracketSize(entrants.length)
  const k = Math.log2(size)
  const losers: TournamentMatchState[] = []
  let previous: string[] = []
  let round = 0

  if (k >= 2) {
    // Losers round 1: the winners bracket's first-round losers, in pairs.
    round = 1
    previous = []
    for (let i = 0; i < size / 4; i++) {
      const id = `L1-${i}`
      losers.push(match(id, 'losers', 1, i, [from(`W1-${2 * i}`, 'loser'), from(`W1-${2 * i + 1}`, 'loser')]))
      previous.push(id)
    }
    for (let p = 2; p <= k; p++) {
      // Drop-in round: losers-bracket survivors meet the losers of winners round p.
      round++
      const count = previous.length
      const dropIn: string[] = []
      for (let i = 0; i < count; i++) {
        const dropFrom = p % 2 === 0 ? count - 1 - i : i
        const id = `L${round}-${i}`
        losers.push(match(id, 'losers', round, i, [from(previous[i]!, 'winner'), from(`W${p}-${dropFrom}`, 'loser')]))
        dropIn.push(id)
      }
      previous = dropIn
      if (p < k) {
        // Consolidation round: survivors play each other.
        round++
        const next: string[] = []
        for (let i = 0; i < previous.length / 2; i++) {
          const id = `L${round}-${i}`
          losers.push(match(id, 'losers', round, i, [from(previous[2 * i]!, 'winner'), from(previous[2 * i + 1]!, 'winner')]))
          next.push(id)
        }
        previous = next
      }
    }
  }

  const lastWinners = `W${k}-0`
  const challenger = previous.length ? from(previous[0]!, 'winner') : from(lastWinners, 'loser')
  const final = match('GF', 'final', 1, 0, [from(lastWinners, 'winner'), challenger])
  return [...winners, ...losers, final]
}

/**
 * The bracket reset: both grand finalists again, after the losers-bracket side
 * won the first final. It only exists when that side (slot 1) won, so the
 * first final's loser is the winners-bracket champion: sides stay as they were.
 */
export function bracketReset(): TournamentMatchState {
  return match('GF2', 'final', 2, 0, [from('GF', 'loser'), from('GF', 'winner')])
}

/**
 * Everyone plays everyone once (circle method). Each round, nobody plays
 * twice; with an odd count, one entrant sits each round out.
 */
export function roundRobin(entrants: EntrantState[], pool: number | null = null, prefix = 'R'): TournamentMatchState[] {
  const ids: (string | null)[] = entrants.map((e) => e.id)
  if (ids.length % 2) ids.push(null)
  const n = ids.length
  const matches: TournamentMatchState[] = []
  let ring = ids
  for (let r = 1; r < n; r++) {
    let index = 0
    for (let i = 0; i < n / 2; i++) {
      const a = ring[i]!
      const b = ring[n - 1 - i]!
      if (a !== null && b !== null) {
        matches.push(match(`${prefix}${r}-${index}`, 'pool', r, index, [fixed(a), fixed(b)], pool))
        index++
      }
    }
    // Keep the first in place and rotate the rest.
    ring = [ring[0]!, ring[n - 1]!, ...ring.slice(1, n - 1)]
  }
  return matches
}

/** Splits seeded entrants into pools by snake order (1, 2, 3, 3, 2, 1, ...), so pools are even. */
export function snakePools(entrants: EntrantState[], count: number): EntrantState[][] {
  const pools: EntrantState[][] = Array.from({ length: count }, () => [])
  entrants.forEach((e, i) => {
    const lap = Math.floor(i / count)
    const at = i % count
    pools[lap % 2 === 0 ? at : count - 1 - at]!.push(e)
  })
  return pools
}

/** Round robin inside each pool. Ids are "P<pool>-R<round>-<index>". */
export function poolMatches(entrants: EntrantState[], count: number): TournamentMatchState[] {
  return snakePools(entrants, count).flatMap((pool, p) => roundRobin(pool, p, `P${p + 1}-R`))
}

/**
 * Rotating partners: every round, players are drawn into matches of
 * `2 * perSide` with new partners. Whoever sat out most plays first; the
 * rest of the order is random. Ids are "R<round>-<index>".
 */
export function rotatingRounds(playerIds: string[], perSide: number, rounds: number, random: () => number): TournamentMatchState[] {
  const size = perSide * 2
  const sitOuts = new Map(playerIds.map((id) => [id, 0]))
  const matches: TournamentMatchState[] = []
  for (let r = 1; r <= rounds; r++) {
    const order = playerIds
      .map((id) => ({ id, sat: sitOuts.get(id)!, draw: random() }))
      .sort((a, b) => b.sat - a.sat || a.draw - b.draw)
      .map((x) => x.id)
    const playing = Math.floor(order.length / size) * size
    for (const id of order.slice(playing)) sitOuts.set(id, sitOuts.get(id)! + 1)
    for (let i = 0; i < playing / size; i++) {
      const group = order.slice(i * size, (i + 1) * size)
      const m = match(`R${r}-${i}`, 'pool', r, i, [fixed(null), fixed(null)])
      m.slots = [
        { entrantId: null, source: null, empty: false },
        { entrantId: null, source: null, empty: false },
      ]
      m.sides = [group.slice(0, perSide), group.slice(perSide)]
      matches.push(m)
    }
  }
  return matches
}
