import type { ClubBadgeInput, LeaderboardEntry } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import type { MatchState } from '@/interfaces/SessionState'
import {
  addBadgeBlockedReason,
  awardClubBadges,
  badgeSummary,
  careerKey,
  careerTotals,
  cleanBadge,
  meets,
  memberCareerBadges,
  metricValue,
  validateBadge,
  type BadgeTotals,
} from '@/utils/club/badges'
import { ApiError } from '@/utils/http/errors'

const badge = (over: Partial<ClubBadgeInput> = {}): ClubBadgeInput => ({
  name: 'Sharpshooter',
  description: null,
  scope: 'session',
  conditions: [{ metric: 'wins', min: 3 }],
  ...over,
})

const totals = (over: Partial<BadgeTotals> = {}): BadgeTotals => ({ played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, streak: 0, sessions: 0, ...over })

const entry = (name: string, over: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  rank: 1,
  playerId: `p-${name}`,
  name,
  tierId: 'beginner',
  played: 0,
  wins: 0,
  losses: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  streak: 0,
  movement: 0,
  badges: [],
  clubBadges: [],
  ...over,
})

let n = 0
const match = (sideA: string[], sideB: string[], winner: 'a' | 'b' | null, games = [{ a: 21, b: 15 }]): MatchState => ({
  id: `m${++n}`,
  courtId: 'c',
  courtLabel: 'Court 1',
  sides: [sideA, sideB],
  startedAt: n,
  finishedAt: n,
  games: winner ? games : [],
  winner,
})

describe('validateBadge', () => {
  it('accepts a named badge with valid conditions', () => {
    expect(validateBadge(badge())).toEqual({})
  })

  it('names what is wrong', () => {
    expect(validateBadge(badge({ name: '  ' })).name).toBe('Give the badge a name.')
    expect(validateBadge(badge({ name: 'x'.repeat(31) })).name).toMatch(/up to 30/)
    expect(validateBadge(badge({ conditions: [] })).conditions).toMatch(/at least one condition/)
    expect(validateBadge(badge({ conditions: [{ metric: 'wins', min: 1 }, { metric: 'wins', min: 2 }] })).conditions).toBe('Use each kind of condition once.')
    expect(validateBadge(badge({ conditions: [{ metric: 'sessions', min: 2 }] })).conditions).toMatch(/can't be counted in one session/)
    expect(validateBadge(badge({ scope: 'career', conditions: [{ metric: 'streak', min: 2 }] })).conditions).toMatch(/across club sessions/)
    expect(validateBadge(badge({ conditions: [{ metric: 'winRate', min: 101 }] })).conditions).toMatch(/from 1 to 100/)
    expect(validateBadge(badge({ conditions: [{ metric: 'wins', min: 2.5 }] })).conditions).toMatch(/whole number/)
  })

  it('allows a negative point difference but not zero wins', () => {
    expect(validateBadge(badge({ conditions: [{ metric: 'pointDiff', min: -5 }] }))).toEqual({})
    expect(validateBadge(badge({ conditions: [{ metric: 'wins', min: 0 }] })).conditions).toMatch(/from 1/)
  })
})

describe('cleanBadge', () => {
  it('trims and drops a blank description', () => {
    expect(cleanBadge(badge({ name: '  Ace  ', description: '   ' }))).toMatchObject({ name: 'Ace', description: null })
  })

  it('throws an invalid ApiError with the fields at fault', () => {
    try {
      cleanBadge(badge({ name: '' }))
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).fields).toEqual({ name: 'Give the badge a name.' })
    }
  })
})

describe('addBadgeBlockedReason', () => {
  it('stops at the limit', () => {
    expect(addBadgeBlockedReason(19)).toBeNull()
    expect(addBadgeBlockedReason(20)).toMatch(/up to 20 badges/)
  })
})

describe('badgeSummary', () => {
  it('says the conditions in plain words', () => {
    expect(badgeSummary(badge())).toBe('At least 3 wins in one session.')
    expect(
      badgeSummary(
        badge({
          scope: 'career',
          conditions: [
            { metric: 'wins', min: 50 },
            { metric: 'sessions', min: 10 },
            { metric: 'winRate', min: 60 },
          ],
        }),
      ),
    ).toBe('At least 50 wins, 10 sessions played in and a 60% win rate across all club sessions.')
  })
})

describe('metricValue and meets', () => {
  it('works out win rate from matches with a result, rounding down', () => {
    expect(metricValue(totals({ played: 4, wins: 2, losses: 1 }), 'winRate')).toBe(66)
    expect(metricValue(totals({ played: 1 }), 'winRate')).toBe(0)
    expect(metricValue(totals({ pointsFor: 40, pointsAgainst: 45 }), 'pointDiff')).toBe(-5)
  })

  it('needs every condition, and at least one match played', () => {
    const conditions = [
      { metric: 'wins', min: 2 },
      { metric: 'winRate', min: 50 },
    ] as const
    expect(meets(totals({ played: 3, wins: 2, losses: 1 }), [...conditions])).toBe(true)
    expect(meets(totals({ played: 5, wins: 2, losses: 3 }), [...conditions])).toBe(false)
    expect(meets(totals({ pointsFor: 10, pointsAgainst: 0 }), [{ metric: 'pointDiff', min: -5 }])).toBe(false)
  })
})

describe('careerKey', () => {
  it('matches names regardless of case and spacing', () => {
    expect(careerKey('  Ana   Reyes ')).toBe('ana reyes')
    expect(careerKey('ANA REYES')).toBe(careerKey('ana reyes'))
  })
})

describe('careerTotals', () => {
  it('adds up results for the same name across sessions', () => {
    const players = [
      { id: 'a1', sessionId: 's1', name: 'Ana' },
      { id: 'b1', sessionId: 's1', name: 'Ben' },
      { id: 'a2', sessionId: 's2', name: ' ana ' },
      { id: 'b2', sessionId: 's2', name: 'Ben' },
      { id: 'c2', sessionId: 's2', name: 'Cy' },
    ]
    const matches = [match(['a1'], ['b1'], 'a'), match(['a2'], ['b2'], 'a', [{ a: 21, b: 19 }]), match(['b2'], ['c2'], null)]
    const career = careerTotals({ players, matches })
    expect(career.get('ana')).toMatchObject({ played: 2, wins: 2, losses: 0, pointsFor: 42, pointsAgainst: 34, sessions: 2 })
    expect(career.get('ben')).toMatchObject({ played: 3, wins: 0, losses: 2, sessions: 2 })
    // A match without a score counts as played but not as a result.
    expect(career.get('cy')).toMatchObject({ played: 1, wins: 0, losses: 0, sessions: 1 })
  })

  it('counts only sessions someone actually played in', () => {
    const career = careerTotals({ players: [{ id: 'x', sessionId: 's1', name: 'Dee' }], matches: [] })
    expect(career.get('dee')).toMatchObject({ played: 0, sessions: 0 })
  })
})

describe('awardClubBadges', () => {
  const session = { id: 'b-session', scope: 'session' as const, conditions: [{ metric: 'wins' as const, min: 2 }] }
  const career = { id: 'b-career', scope: 'career' as const, conditions: [{ metric: 'sessions' as const, min: 2 }] }

  it('gives session badges from this session and career badges from club totals', () => {
    const entries = [entry('Ana', { played: 2, wins: 2 }), entry('Ben', { played: 2, wins: 1, losses: 1 })]
    const totalsByName = new Map([
      ['ana', totals({ played: 5, wins: 4, losses: 1, sessions: 1 })],
      ['ben', totals({ played: 9, wins: 3, losses: 6, sessions: 3 })],
    ])
    const awarded = awardClubBadges(entries, [session, career], totalsByName)
    expect(awarded.find((e) => e.name === 'Ana')!.clubBadges).toEqual(['b-session'])
    expect(awarded.find((e) => e.name === 'Ben')!.clubBadges).toEqual(['b-career'])
  })

  it('gives no career badge to a name with no club history', () => {
    expect(awardClubBadges([entry('New', { played: 3, wins: 3 })], [career], new Map())[0]!.clubBadges).toEqual([])
  })
})

describe('memberCareerBadges', () => {
  it('only career badges, matched by name', () => {
    const career = new Map([['ana reyes', totals({ played: 12, wins: 10, losses: 2, sessions: 4 })]])
    const badges = [
      { id: 'veteran', scope: 'career' as const, conditions: [{ metric: 'sessions' as const, min: 3 }] },
      { id: 'tonight', scope: 'session' as const, conditions: [{ metric: 'wins' as const, min: 1 }] },
    ]
    expect(memberCareerBadges('Ana  Reyes', badges, career)).toEqual(['veteran'])
    expect(memberCareerBadges('Nobody', badges, career)).toEqual([])
  })
})
