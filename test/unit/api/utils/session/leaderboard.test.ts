import { describe, expect, it } from 'vitest'
import type { MatchState, PlayerState } from '@/interfaces/SessionState'
import { computeLeaderboard, computeSpotlight } from '@/utils/session/leaderboard'

const player = (id: string, active = true): PlayerState => ({
  id,
  name: id.toUpperCase(),
  tierId: 'beginner',
  gamesPlayed: 0,
  rotation: 0,
  queuedAt: 0,
  checkedInAt: 0,
  status: 'waiting',
  active,
})
const match = (a: string[], b: string[], games: [number, number][], winner: 'a' | 'b' | null): MatchState => ({
  id: a.join() + b.join(),
  courtId: 'c',
  courtLabel: 'Court 1',
  sides: [a, b],
  startedAt: 0,
  finishedAt: 1,
  games: games.map(([x, y]) => ({ a: x, b: y })),
  winner,
})

describe('computeLeaderboard', () => {
  it('ranks by wins, then point difference, and shares ranks on ties', () => {
    const board = computeLeaderboard(
      [player('a'), player('b'), player('c'), player('d'), player('gone', false), player('idle')],
      [
        match(
          ['a', 'b'],
          ['c', 'd'],
          [
            [21, 10],
            [21, 12],
          ],
          'a',
        ),
        match(
          ['a', 'c'],
          ['b', 'gone'],
          [
            [21, 19],
            [21, 19],
          ],
          'a',
        ),
        match(['d'], ['b'], [], null),
      ],
    )
    expect(board.map((e) => `${e.rank}:${e.playerId}:${e.wins}-${e.losses}:${e.played}`)).toEqual(['1:a:2-0:2', '2:b:1-1:3', '3:c:1-1:2', '4:gone:0-1:1', '5:d:0-1:2', '6:idle:0-0:0'])
  })
})

describe('streaks, movement, badges and spotlight', () => {
  const at = (m: MatchState, t: number): MatchState => ({ ...m, finishedAt: t })
  const players = ['a', 'b', 'c', 'd'].map((id) => player(id))

  it('counts the current win streak in match order; matches without a score do not break it', () => {
    const board = computeLeaderboard(players, [
      at(match(['a', 'b'], ['c', 'd'], [[21, 10]], 'b'), 1),
      at(match(['a', 'c'], ['b', 'd'], [[21, 10]], 'a'), 2),
      at(match(['a', 'd'], ['b', 'c'], [], null), 3),
      at(match(['a', 'b'], ['c', 'd'], [[21, 12]], 'a'), 4),
    ])
    const a = board.find((e) => e.playerId === 'a')!
    expect(a.streak).toBe(2)
    expect(board.find((e) => e.playerId === 'c')!.streak).toBe(0)
  })

  it('reports how many places each player moved in the latest match', () => {
    // a & b lead after the first match; c & d win the latest by more and go above them.
    const board = computeLeaderboard(players, [at(match(['a', 'b'], ['c', 'd'], [[21, 10]], 'a'), 1), at(match(['c', 'd'], ['a', 'b'], [[21, 5]], 'a'), 2)])
    expect(board.map((e) => `${e.playerId}:${e.rank}:${e.movement}`)).toEqual(['c:1:2', 'd:1:2', 'a:3:-2', 'b:3:-2'])
  })

  it('awards badges, ties included, and leaves them out when nobody qualifies', () => {
    const board = computeLeaderboard(players, [
      at(match(['a', 'b'], ['c', 'd'], [[21, 10]], 'a'), 1),
      at(match(['a', 'c'], ['b', 'd'], [[21, 18]], 'a'), 2),
      at(match(['a', 'd'], ['b', 'c'], [[21, 19]], 'a'), 3),
    ])
    const a = board.find((e) => e.playerId === 'a')!
    expect(a.badges).toEqual(['most-wins', 'best-diff', 'most-played', 'hot-streak', 'unbeaten'])
    expect(computeLeaderboard(players, []).every((e) => e.badges.length === 0)).toBe(true)
  })

  it('gives a hot streak from three wins in a row, and a loss ends it', () => {
    const three = [at(match(['a', 'b'], ['c', 'd'], [[21, 10]], 'a'), 1), at(match(['a', 'c'], ['b', 'd'], [[21, 18]], 'a'), 2), at(match(['a', 'd'], ['b', 'c'], [[21, 19]], 'a'), 3)]
    const hot = (finished: MatchState[]) =>
      computeLeaderboard(players, finished)
        .filter((e) => e.badges.includes('hot-streak'))
        .map((e) => e.playerId)
    expect(hot(three.slice(0, 2))).toEqual([])
    expect(hot(three)).toEqual(['a'])
    expect(hot([...three, at(match(['b', 'c'], ['a', 'd'], [[21, 12]], 'a'), 4)])).toEqual([])
  })

  it('names the leader and the closest chaser', () => {
    const finished = [at(match(['a', 'b'], ['c', 'd'], [[21, 10]], 'a'), 1), at(match(['a', 'c'], ['b', 'd'], [[21, 18]], 'a'), 2)]
    const spot = computeSpotlight(computeLeaderboard(players, finished), finished)
    expect(spot.leader).toEqual({ playerId: 'a', name: 'A', wins: 2 })
    expect(spot.chaser?.winsBehind).toBe(1)
    expect(spot.matchesFinished).toBe(2)
    expect(computeSpotlight(computeLeaderboard(players, []), []).leader).toBeNull()
  })
})
