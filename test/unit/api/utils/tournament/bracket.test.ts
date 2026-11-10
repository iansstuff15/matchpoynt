import { describe, expect, it } from 'vitest'
import type { EntrantState } from '@/interfaces/TournamentState'
import { doubleElimination, poolMatches, rotatingRounds, roundRobin, seedOrder, singleElimination, snakePools } from '@/utils/tournament/bracket'
import { testContext } from '@test/session'

const entrants = (n: number): EntrantState[] => Array.from({ length: n }, (_, i) => ({ id: `e${i + 1}`, playerIds: [`p${i + 1}`], seed: i + 1 }))

describe('seedOrder', () => {
  it('keeps the top seeds apart until the end', () => {
    expect(seedOrder(2)).toEqual([1, 2])
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
  })
})

describe('singleElimination', () => {
  it('pads to a power of two with byes for the top seeds', () => {
    const matches = singleElimination(entrants(5))
    expect(matches).toHaveLength(7)
    const first = matches.filter((m) => m.round === 1)
    // Seed 1 meets the empty seed 8.
    expect(first[0]!.slots.map((s) => s.entrantId)).toEqual(['e1', null])
    expect(first[0]!.slots[1]!.empty).toBe(true)
    expect(matches.find((m) => m.id === 'K3-0')!.slots.map((s) => s.source?.matchId)).toEqual(['K2-0', 'K2-1'])
  })
})

describe('doubleElimination', () => {
  it('builds winners, losers and a grand final', () => {
    const matches = doubleElimination(entrants(8))
    expect(matches.filter((m) => m.stage === 'winners')).toHaveLength(7)
    expect(matches.filter((m) => m.stage === 'losers')).toHaveLength(6)
    expect(matches.filter((m) => m.stage === 'final')).toHaveLength(1)
    // Losers round 2 takes the losers of winners round 2.
    expect(matches.filter((m) => m.stage === 'losers' && m.round === 2).every((m) => m.slots[1]!.source?.matchId.startsWith('W2-'))).toBe(true)
  })
})

describe('roundRobin', () => {
  it('has everyone meet once, nobody twice in a round', () => {
    for (const n of [4, 5, 6]) {
      const matches = roundRobin(entrants(n))
      expect(matches).toHaveLength((n * (n - 1)) / 2)
      const pairs = new Set(matches.map((m) => m.slots.map((s) => s.entrantId).sort().join('-')))
      expect(pairs.size).toBe(matches.length)
      for (const round of new Set(matches.map((m) => m.round))) {
        const ids = matches.filter((m) => m.round === round).flatMap((m) => m.slots.map((s) => s.entrantId))
        expect(new Set(ids).size).toBe(ids.length)
      }
    }
  })
})

describe('pools', () => {
  it('snakes seeds into even pools', () => {
    expect(snakePools(entrants(8), 2).map((p) => p.map((e) => e.seed))).toEqual([
      [1, 4, 5, 8],
      [2, 3, 6, 7],
    ])
    expect(poolMatches(entrants(8), 2)).toHaveLength(12)
  })
})

describe('rotatingRounds', () => {
  it('fills matches every round and rotates who sits out', () => {
    const players = Array.from({ length: 9 }, (_, i) => `p${i}`)
    const matches = rotatingRounds(players, 2, 3, testContext().random)
    expect(matches).toHaveLength(6)
    const sat = [1, 2, 3].map((r) => {
      const playing = new Set(matches.filter((m) => m.round === r).flatMap((m) => m.sides!.flat()))
      return players.filter((p) => !playing.has(p))
    })
    expect(sat.every((s) => s.length === 1)).toBe(true)
    expect(new Set(sat.flat()).size).toBe(3)
  })
})
