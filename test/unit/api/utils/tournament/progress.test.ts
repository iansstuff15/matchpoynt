import type { TournamentFormat } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import type { EntrantState, TournamentState } from '@/interfaces/TournamentState'
import { testContext } from '@test/session'
import { doubleElimination, poolMatches, rotatingRounds, roundRobin, singleElimination } from '@/utils/tournament/bracket'
import { championId, eliminated, heldPlayers, matchStatus, readyMatches, recordResult, settle } from '@/utils/tournament/progress'

const entrants = (n: number): EntrantState[] => Array.from({ length: n }, (_, i) => ({ id: `e${i + 1}`, playerIds: [`p${i + 1}`], seed: i + 1 }))
const win = [{ a: 21, b: 10 }]
const lose = [{ a: 10, b: 21 }]

function tournament(format: TournamentFormat, n: number, pools = { count: 2, advance: 2 }): TournamentState {
  const es = entrants(n)
  const matches =
    format === 'single-elimination' ? singleElimination(es) : format === 'double-elimination' ? doubleElimination(es) : format === 'round-robin' ? roundRobin(es) : poolMatches(es, pools.count)
  const t: TournamentState = {
    id: 't',
    name: 'Cup',
    format,
    teamMode: 'fixed',
    seeding: 'tier',
    status: 'active',
    entrants: es,
    playerIds: es.flatMap((e) => e.playerIds),
    pools: format === 'pools-knockout' ? pools : null,
    matches,
    createdAt: 0,
    finishedAt: null,
  }
  return settle(t, 0)
}

/** Plays every ready match until nothing is left, the given side always winning. */
function playOut(t: TournamentState, pick: (i: number) => 'a' | 'b' = () => 'a'): TournamentState {
  let next = t
  for (let i = 0; i < 1000 && next.status === 'active'; i++) {
    const m = readyMatches(next)[0]
    if (!m) break
    const side = pick(i)
    next = recordResult(next, m.id, side, side === 'a' ? win : lose, i)
  }
  return next
}

describe('every format plays out to a champion', () => {
  const sizes: Record<TournamentFormat, number[]> = {
    'single-elimination': [2, 3, 5, 8, 13],
    'double-elimination': [3, 4, 5, 7, 8, 11, 16],
    'round-robin': [3, 4, 7],
    'pools-knockout': [4, 7, 10, 16],
  }
  for (const [format, ns] of Object.entries(sizes) as [TournamentFormat, number[]][]) {
    for (const n of ns) {
      it(`${format} with ${n}`, () => {
        const random = testContext().random
        const done = playOut(tournament(format, n), () => (random() < 0.5 ? 'a' : 'b'))
        expect(done.status).toBe('finished')
        expect(championId(done)).not.toBeNull()
        expect(done.matches.some((m) => matchStatus(m) === 'waiting' || matchStatus(m) === 'ready')).toBe(false)
        expect(heldPlayers(done).size).toBe(0)
      })
    }
  }
})

describe('byes', () => {
  it('send the top seeds through without playing', () => {
    const t = tournament('single-elimination', 6)
    expect(t.matches.filter((m) => matchStatus(m) === 'walkover').map((m) => m.slots.find((s) => !s.empty)?.entrantId)).toEqual(['e1', 'e2'])
  })
})

describe('double elimination', () => {
  it('adds a reset final when the losers-bracket side wins the first final', () => {
    // Seed 1 wins every winners-bracket match, then loses the grand final.
    let t = tournament('double-elimination', 4)
    while (!t.matches.find((m) => m.id === 'GF' && matchStatus(m) === 'ready')) {
      const m = readyMatches(t)[0]!
      t = recordResult(t, m.id, 'a', win, 0)
    }
    t = recordResult(t, 'GF', 'b', lose, 0)
    expect(t.status).toBe('active')
    expect(t.matches.some((m) => m.id === 'GF2' && matchStatus(m) === 'ready')).toBe(true)
    t = recordResult(t, 'GF2', 'a', win, 1)
    expect(t.status).toBe('finished')
    expect(championId(t)).toBe('e1')
  })

  it('knocks entrants out after their second loss only', () => {
    let t = tournament('double-elimination', 4)
    t = recordResult(t, 'W1-0', 'a', win, 0)
    expect(eliminated(t).size).toBe(0)
  })
})

describe('pools then knockout', () => {
  it('draws the knockout from the top finishers once pools are done', () => {
    let t = tournament('pools-knockout', 8, { count: 2, advance: 2 })
    expect(t.matches.some((m) => m.stage === 'knockout')).toBe(false)
    while (readyMatches(t).some((m) => m.stage === 'pool')) t = recordResult(t, readyMatches(t)[0]!.id, 'a', win, 0)
    const knockout = t.matches.filter((m) => m.stage === 'knockout')
    expect(knockout).toHaveLength(3)
    // Non-qualifiers are out and back in open play.
    expect(eliminated(t).size).toBe(4)
    expect(heldPlayers(t).size).toBe(4)
  })
})

describe('rotating partners', () => {
  it('ranks individuals and finishes after every round', () => {
    const players = Array.from({ length: 8 }, (_, i) => `p${i}`)
    const t = settle(
      {
        id: 't',
        name: 'Social',
        format: 'round-robin',
        teamMode: 'rotating',
        seeding: 'random',
        status: 'active',
        entrants: [],
        playerIds: players,
        pools: null,
        matches: rotatingRounds(players, 2, 3, testContext().random),
        createdAt: 0,
        finishedAt: null,
      },
      0,
    )
    expect(heldPlayers(t).size).toBe(8)
    const done = playOut(t)
    expect(done.status).toBe('finished')
    expect(players).toContain(championId(done))
  })
})
