import { describe, expect, it } from 'vitest'
import { clubStandings } from '@/utils/club/standings'

const match = (id: string, sides: [string[], string[]], winner: 'a' | 'b' | null) => ({
  id,
  courtId: 'c',
  courtLabel: 'Court 1',
  sides,
  startedAt: 0,
  finishedAt: 1,
  games: winner ? [{ a: winner === 'a' ? 21 : 10, b: winner === 'a' ? 10 : 21 }] : [],
  winner,
})

describe('clubStandings', () => {
  // Two sessions; "ana  reyes" in the second is the same player as "Ana Reyes".
  const history = {
    players: [
      { id: 'a1', sessionId: 's1', name: 'Ana Reyes' },
      { id: 'b1', sessionId: 's1', name: 'Ben' },
      { id: 'a2', sessionId: 's2', name: 'ana  reyes' },
      { id: 'c2', sessionId: 's2', name: 'Cy' },
      { id: 'd2', sessionId: 's2', name: 'Dee' },
    ],
    matches: [match('m1', [['a1'], ['b1']], 'a'), match('m2', [['a2'], ['c2']], 'a'), match('m3', [['c2'], ['a2']], 'a'), match('m4', [['b1'], ['a1']], null)],
  }

  it('ranks players across the club sessions by wins, then win rate, matching names', () => {
    expect(clubStandings(history, 10)).toEqual([
      { rank: 1, name: 'Ana Reyes', sessions: 2, played: 4, wins: 2, losses: 1, winRate: 67 },
      { rank: 2, name: 'Cy', sessions: 1, played: 2, wins: 1, losses: 1, winRate: 50 },
      { rank: 3, name: 'Ben', sessions: 1, played: 2, wins: 0, losses: 1, winRate: 0 },
    ])
  })

  it('leaves out players without a finished match, and stops at the limit', () => {
    expect(clubStandings(history, 10).map((s) => s.name)).not.toContain('Dee')
    expect(clubStandings(history, 1)).toHaveLength(1)
  })
})
