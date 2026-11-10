import type { MatchmakingStrategyId } from '@matchpoynt/shared'
import type { PlayerState } from '@/interfaces/SessionState'

type Rank = (player: PlayerState) => number
type Sides = [string[], string[]]

/**
 * Chooses who plays next from a queue already in fair order.
 * `skill-grouped` keeps the fairest player as the anchor, so nobody is starved.
 */
export function pickPlayers(
  strategy: MatchmakingStrategyId,
  ordered: PlayerState[],
  count: number,
  rank: Rank,
): PlayerState[] {
  if (ordered.length < count) return []
  if (strategy !== 'skill-grouped') return ordered.slice(0, count)

  const [anchor, ...rest] = ordered
  if (!anchor) return []
  const anchorRank = rank(anchor)
  const nearest = rest
    .map((player, index) => ({ player, index, distance: Math.abs(rank(player) - anchorRank) }))
    // Ties keep fair order.
    .sort((a, b) => a.distance - b.distance || a.index - b.index)
    .slice(0, count - 1)
    .map(({ player }) => player)
  return [anchor, ...nearest]
}

/** Every way to choose `size` items from `items`, keeping their order. */
function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]]
  const [first, ...rest] = items
  if (first === undefined || items.length < size) return []
  return [...combinations(rest, size - 1).map((combo) => [first, ...combo]), ...combinations(rest, size)]
}

/**
 * Fills the open places on both sides with `picked`, around anyone already
 * placed by hand. `rotation` alternates in queue order; the other strategies
 * choose the arrangement with the closest total tier rank.
 */
export function completeSides(
  strategy: MatchmakingStrategyId,
  lineup: [PlayerState[], PlayerState[]],
  picked: PlayerState[],
  perSide: number,
  rank: Rank,
): Sides {
  const need: [number, number] = [perSide - lineup[0].length, perSide - lineup[1].length]
  const ids = (players: PlayerState[]) => players.map((p) => p.id)

  if (strategy === 'rotation' || picked.length < 2) {
    const sides: [PlayerState[], PlayerState[]] = [[...lineup[0]], [...lineup[1]]]
    let turn: 0 | 1 = 0
    for (const p of picked) {
      const side: 0 | 1 = sides[turn].length < perSide ? turn : turn === 0 ? 1 : 0
      sides[side].push(p)
      turn = turn === 0 ? 1 : 0
    }
    return [ids(sides[0]), ids(sides[1])]
  }

  const sum = (players: PlayerState[]) => players.reduce((s, p) => s + rank(p), 0)
  let best: [PlayerState[], PlayerState[]] = [lineup[0], lineup[1]]
  let bestGap = Number.POSITIVE_INFINITY
  for (const combo of combinations(picked, need[0])) {
    const chosen = new Set(combo)
    const one = [...lineup[0], ...combo]
    const two = [...lineup[1], ...picked.filter((p) => !chosen.has(p))]
    const gap = Math.abs(sum(one) - sum(two))
    if (gap < bestGap) {
      best = [one, two]
      bestGap = gap
    }
  }
  return [ids(best[0]), ids(best[1])]
}

/** Splits a full group into two sides (no one placed by hand). */
export function splitSides(strategy: MatchmakingStrategyId, players: PlayerState[], rank: Rank): Sides {
  return completeSides(strategy, [[], []], players, players.length / 2, rank)
}
