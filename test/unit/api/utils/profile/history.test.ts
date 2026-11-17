import type { ClubBadgeView } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import { filterGames, pageOfGames, profileBadges, profileGames, profileRecord, profileStats, rivalsOf, type MemberHistory } from '@/utils/profile/history'

const badge = (id: string, scope: 'session' | 'career', min: number): ClubBadgeView => ({
  id,
  name: id,
  description: null,
  scope,
  conditions: [{ metric: 'wins', min }],
  iconUrl: null,
  iconSource: null,
  summary: '',
})

const match = (id: string, sessionId: string, sides: [string[], string[]], winner: 'a' | 'b' | null, finishedAt: number, games = [{ a: 21, b: 15 }]) => ({
  id,
  sessionId,
  courtId: 'c',
  courtLabel: 'Court 1',
  sides,
  startedAt: finishedAt - 1000,
  finishedAt,
  games,
  winner,
})

// Ana is "Ana Reyes" on the roster: in s1 she's p1 ("ana reyes"), in s2 p5 ("Ana  Reyes").
const history: MemberHistory = {
  clubId: 'k1',
  clubName: 'Smash Club',
  memberName: 'Ana Reyes',
  badges: [badge('two-wins', 'session', 2), badge('three-career', 'career', 3)],
  sessions: [
    { id: 's1', label: 'Tuesday', sportId: 'badminton', endedAt: '2026-11-03T12:00:00Z' },
    { id: 's2', label: 'Thursday', sportId: 'badminton', endedAt: '2026-11-05T12:00:00Z' },
  ],
  players: [
    { id: 'p1', sessionId: 's1', name: 'ana reyes' },
    { id: 'p2', sessionId: 's1', name: 'Ben' },
    { id: 'p3', sessionId: 's1', name: 'Cy' },
    { id: 'p4', sessionId: 's1', name: 'Dee' },
    { id: 'p5', sessionId: 's2', name: 'Ana  Reyes' },
    { id: 'p6', sessionId: 's2', name: 'Eli' },
  ],
  matches: [
    match('m1', 's1', [['p1', 'p2'], ['p3', 'p4']], 'a', 1_000),
    match('m2', 's1', [['p3', 'p4'], ['p1', 'p2']], 'b', 2_000, [{ a: 15, b: 21 }]),
    match('m3', 's2', [['p6'], ['p5']], 'b', 3_000),
    match('m4', 's1', [['p2'], ['p3']], 'a', 4_000),
  ],
}

describe('profile history', () => {
  it("finds the person's games by their roster name, from their side, newest first", () => {
    const games = profileGames([history])
    expect(games.map((g) => [g.matchId, g.result, g.partners, g.opponents])).toEqual([
      ['m3', 'win', [], ['Eli']],
      ['m2', 'win', ['Ben'], ['Cy', 'Dee']],
      ['m1', 'win', ['Ben'], ['Cy', 'Dee']],
    ])
    // Scores turn round so their side is first.
    expect(games[1]!.games).toEqual([{ a: 21, b: 15 }])
  })

  it('pages the games', () => {
    const games = profileGames([history])
    const first = pageOfGames(games, null, 2)
    expect(first.games.map((g) => g.matchId)).toEqual(['m3', 'm2'])
    expect(pageOfGames(games, first.nextBefore, 2)).toEqual({ games: [games[2]], nextBefore: null })
  })

  it('counts their record across sessions', () => {
    expect(profileStats([history], profileGames([history]))).toEqual({ sessions: 2, played: 3, wins: 3, losses: 0, winRate: 100 })
  })

  it('awards session badges per session earned and career badges once, with leaderboard badges counted', () => {
    const { clubBadges, leaderboardBadges } = profileBadges([history])
    expect(clubBadges.map((b) => [b.badge.id, b.times])).toEqual([
      ['three-career', 1],
      ['two-wins', 1],
    ])
    // Most wins in Tuesday's session (two wins); one win on Thursday is under the leaderboard's threshold.
    expect(leaderboardBadges.find((b) => b.id === 'most-wins')?.times).toBe(1)
  })
})

// A second club where Ana plays pickleball, as "Ana" on its roster, and loses.
const pickle: MemberHistory = {
  clubId: 'k2',
  clubName: 'Dink Society',
  memberName: 'Ana',
  badges: [badge('one-win', 'session', 1)],
  sessions: [{ id: 's3', label: 'Open play', sportId: 'pickleball', endedAt: '2026-11-07T12:00:00Z' }],
  players: [
    { id: 'q1', sessionId: 's3', name: 'Ana' },
    { id: 'q2', sessionId: 's3', name: 'Fay' },
  ],
  matches: [match('n1', 's3', [['q1'], ['q2']], 'b', 5_000, [{ a: 9, b: 11 }])],
}

describe('profile record across clubs and sports', () => {
  const record = profileRecord([history, pickle])

  it('totals every club and breaks the record down by sport and by club', () => {
    expect(record.stats).toEqual({ sessions: 3, played: 4, wins: 3, losses: 1, winRate: 75 })
    expect(record.bySport.map((s) => [s.sportId, s.stats.played, s.stats.wins, s.stats.sessions])).toEqual([
      ['badminton', 3, 3, 2],
      ['pickleball', 1, 0, 1],
    ])
    expect(record.byClub.map((c) => [c.clubName, c.sportIds, c.stats.losses])).toEqual([
      ['Smash Club', ['badminton'], 0],
      ['Dink Society', ['pickleball'], 1],
    ])
  })

  it('lists each session newest first with their record, place and what they earned there', () => {
    expect(record.sessions.map((s) => [s.sessionId, s.played, s.wins, s.losses, s.rank, s.clubBadges.map((b) => b.id)])).toEqual([
      ['s3', 1, 0, 1, 2, []],
      ['s2', 1, 1, 0, 1, []],
      ['s1', 2, 2, 0, 2, ['two-wins']], // Ben won m4 too, so he's first
    ])
  })

  it('collects each badge with the sports and sessions it came from', () => {
    const twoWins = record.collection.clubBadges.find((b) => b.badge.id === 'two-wins')!
    expect(twoWins).toMatchObject({ clubName: 'Smash Club', times: 1, sportIds: ['badminton'], lastEarnedAt: '2026-11-03T12:00:00Z' })
    expect(twoWins.earnedIn.map((e) => e.sessionLabel)).toEqual(['Tuesday'])
    const career = record.collection.clubBadges.find((b) => b.badge.id === 'three-career')!
    expect(career).toMatchObject({ earnedIn: [], lastEarnedAt: '2026-11-05T12:00:00Z' })
    for (const b of record.collection.leaderboardBadges) expect(b.earnedIn.length).toBe(b.times)
  })

  it('filters games by sport, club or session', () => {
    const games = profileGames([history, pickle])
    expect(filterGames(games, { sport: 'pickleball' }).map((g) => g.matchId)).toEqual(['n1'])
    expect(filterGames(games, { club: 'k1' }).map((g) => g.matchId)).toEqual(['m3', 'm2', 'm1'])
    expect(filterGames(games, { session: 's1' }).map((g) => g.matchId)).toEqual(['m2', 'm1'])
  })
})

describe('rivalsOf', () => {
  const game = (id: string, partners: string[], opponents: string[], result: 'win' | 'loss' | null, finishedAt: string) => ({
    matchId: id,
    sessionId: 's',
    sessionLabel: 'S',
    clubId: 'k',
    clubName: 'K',
    sportId: 'badminton' as const,
    finishedAt,
    partners,
    opponents,
    games: [],
    result,
    winner: null,
  })

  it('counts who they played against and with most, matched by name across clubs, with their record', () => {
    const games = [
      game('3', ['Ben'], ['Cy', 'Dee'], 'win', '2026-11-03'),
      game('2', ['ben '], ['cy'], 'loss', '2026-11-02'),
      game('1', [], ['Eli'], 'win', '2026-11-01'),
    ]
    const { opponents, partners } = rivalsOf(games)
    // Cy twice (one win, one loss); Dee and Eli once, below the two-match minimum.
    expect(opponents).toEqual([{ name: 'Cy', played: 2, wins: 1, losses: 1, lastPlayedAt: '2026-11-03' }])
    expect(partners).toEqual([{ name: 'Ben', played: 2, wins: 1, losses: 1, lastPlayedAt: '2026-11-03' }])
  })
})
