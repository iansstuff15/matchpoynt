import { describe, expect, it } from 'vitest'
import type { PlayerState } from '@/interfaces/SessionState'
import { pickPlayers, splitSides } from '@/utils/session/matchmaking'

const P = (id: string, rank: number): PlayerState => ({
  id,
  name: id,
  tierId: String(rank),
  gamesPlayed: 0,
  rotation: 0,
  queuedAt: 0,
  checkedInAt: 0,
  status: 'waiting',
  active: true,
})
const rank = (p: PlayerState) => Number(p.tierId)

describe('matchmaking', () => {
  it('rotation alternates sides in queue order', () => {
    expect(splitSides('rotation', [P('a', 0), P('b', 5), P('c', 1), P('d', 4)], rank)).toEqual([['a', 'c'], ['b', 'd']])
  })

  it('balanced picks the split with the closest total skill', () => {
    expect(splitSides('balanced', [P('w', 0), P('x', 1), P('y', 4), P('z', 5)], rank)).toEqual([['w', 'z'], ['x', 'y']])
  })

  it('balanced handles team sizes', () => {
    const team = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5].map((r, i) => P(`p${i}`, r))
    const [one, two] = splitSides('balanced', team, rank)
    const sum = (ids: string[]) => ids.reduce((s, id) => s + Number(team.find((p) => p.id === id)!.tierId), 0)
    expect(one).toHaveLength(6)
    expect(sum(one)).toBe(sum(two))
  })

  it('skill-grouped keeps the fairest player and adds the nearest tiers', () => {
    const picked = pickPlayers('skill-grouped', [P('a', 0), P('b', 5), P('c', 1), P('d', 4), P('e', 0), P('f', 2)], 4, rank)
    expect(picked.map((p) => p.id).sort()).toEqual(['a', 'c', 'e', 'f'])
    expect(picked[0]!.id).toBe('a')
  })
})
