import { sportRules, type ScoringFormat } from '@matchpoynt/shared'
import { describe, expect, it } from 'vitest'
import { scoringFormat } from '@/utils/session/rules'
import { validateSetup } from '@/utils/session/setup'
import { setupInput } from '@test/session'
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
    expect(
      decideMatch(badminton, [
        { a: 21, b: 10 },
        { a: 15, b: 21 },
        { a: 19, b: 21 },
      ]),
    ).toBe('b')
  })
  it('records no result for an empty list', () => {
    expect(decideMatch(badminton, [])).toBeNull()
  })
  it('rejects undecided matches, extra games and invalid scores', () => {
    expect(() => decideMatch(badminton, [{ a: 21, b: 10 }])).toThrow('until one side has won 2')
    expect(() =>
      decideMatch(badminton, [
        { a: 21, b: 10 },
        { a: 21, b: 10 },
        { a: 10, b: 21 },
      ]),
    ).toThrow('already decided')
    expect(() =>
      decideMatch(badminton, [
        { a: 21, b: 20 },
        { a: 21, b: 10 },
      ]),
    ).toThrow("Game 1: 21–20 isn't a valid score")
  })
})

describe('race to the ceiling', () => {
  it('the first side to the ceiling wins one game, with no deuce', () => {
    const race31 = format('badminton', 'race-31')
    expect(isValidGame(race31, { a: 31, b: 29 })).toBe(true)
    expect(isValidGame(race31, { a: 31, b: 30 })).toBe(true)
    expect(isValidGame(race31, { a: 32, b: 30 })).toBe(false)
    expect(isValidGame(race31, { a: 30, b: 28 })).toBe(false)
    expect(decideMatch(race31, [{ a: 30, b: 31 }])).toBe('b')
    expect(() =>
      decideMatch(race31, [
        { a: 31, b: 10 },
        { a: 31, b: 10 },
      ]),
    ).toThrow('at most 1 game')
  })

  it('is its own group of formats, apart from the 21-point ones', () => {
    const group = sportRules.badminton.scoring.filter((f) => f.group === 'Race to the ceiling')
    expect(group.map((f) => [f.id, f.pointsToWin, f.cap, f.bestOf, f.variant])).toEqual([
      ['race-30', 30, 30, 1, 'Race to 30'],
      ['race-31', 31, 31, 1, 'Race to 31'],
      ['race-35', 35, 35, 1, 'Race to 35'],
    ])
    expect(badminton.group).toBeUndefined()
    expect(badminton.cap).toBe(30)
  })

  it('a session picks one like any format', () => {
    expect(scoringFormat({ ...setupInput(), scoring: { formatId: 'race-35', matchFormat: 'doubles' } })?.pointsToWin).toBe(35)
    expect(validateSetup({ ...setupInput(), scoring: { formatId: 'race-33', matchFormat: 'doubles' } }).scoring).toBe('Choose a scoring format.')
    expect(validateSetup({ ...setupInput(), scoring: { formatId: 'bwf-21-cap-31', matchFormat: 'doubles' } }).scoring).toBe('Choose a scoring format.')
  })
})
