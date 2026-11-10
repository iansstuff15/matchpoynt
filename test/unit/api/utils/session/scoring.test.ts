import { sportRules, type ScoringFormat } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import { decideMatch, isValidGame } from '@/utils/session/scoring'

const format = (sport: keyof typeof sportRules, id: string) => sportRules[sport].scoring.find((f) => f.id === id) as ScoringFormat
const badminton = format('badminton', 'bwf-21')

describe('isValidGame', () => {
  it.each([
    [badminton, 21, 19, true],
    [badminton, 21, 20, false],
    [badminton, 22, 20, true],
    [badminton, 23, 20, false],
    [badminton, 30, 29, true],
    [badminton, 31, 29, false],
    [badminton, 20, 18, false],
    [format('pickleball', 'to-11'), 15, 13, true],
    [format('tennis', 'fast4'), 4, 3, true],
    [format('tennis', 'pro-set'), 9, 8, true],
    [format('padel', 'full-set'), 7, 5, true],
    [format('padel', 'full-set'), 6, 5, false],
  ])('%#: %s %i-%i is %s', (f, a, b, valid) => {
    expect(isValidGame(f, { a, b })).toBe(valid)
    expect(isValidGame(f, { a: b, b: a })).toBe(valid)
  })
})

describe('decideMatch', () => {
  it('returns the side that won the majority of games', () => {
    expect(decideMatch(badminton, [{ a: 21, b: 10 }, { a: 15, b: 21 }, { a: 19, b: 21 }])).toBe('b')
  })
  it('records no result for an empty list', () => {
    expect(decideMatch(badminton, [])).toBeNull()
  })
  it('rejects undecided matches, extra games and invalid scores', () => {
    expect(() => decideMatch(badminton, [{ a: 21, b: 10 }])).toThrow('until one side has won 2')
    expect(() => decideMatch(badminton, [{ a: 21, b: 10 }, { a: 21, b: 10 }, { a: 10, b: 21 }])).toThrow('already decided')
    expect(() => decideMatch(badminton, [{ a: 21, b: 20 }, { a: 21, b: 10 }])).toThrow("Game 1: 21–20 isn't a valid score")
  })
})
