import type { ScoringFormat, SportRules } from '../interfaces/SportRules.ts'
import type { SportId } from '../types/sport.ts'

const rally = (id: string, label: string, pointsToWin: number, cap: number | undefined, bestOf: number) => ({
  id,
  label,
  unit: 'point' as const,
  pointsToWin,
  winBy: 2,
  cap,
  bestOf,
})

/**
 * One game raced to a ceiling, a choice of ceilings as a group of formats
 * (`race-<n>`): the first side to the ceiling wins, with no deuce.
 */
const raceTo = (caps: number[]): ScoringFormat[] =>
  caps.map((cap) => ({
    ...rally(`race-${cap}`, `Race to ${cap}`, cap, cap, 1),
    winBy: 1,
    group: 'Race to the ceiling',
    groupDescription: 'One game. The first side to reach the ceiling wins, with no deuce.',
    variant: `Race to ${cap}`,
    formats: ['singles', 'doubles'],
  }))

/** Scoring, tiers and terminology for every sport. The API validates against these. */
export const sportRules: Record<SportId, SportRules> = {
  badminton: {
    id: 'badminton',
    name: 'Badminton',
    description: 'Rally scoring to 21 with a cap at 30, played singles or doubles.',
    playersPerSide: 2,
    defaultFormat: 'doubles',
    scoring: [
      { ...rally('bwf-21', '21 points, best of 3', 21, 30, 3), formats: ['singles', 'doubles'] },
      { ...rally('single-21', '21 points, one game', 21, 30, 1), formats: ['singles', 'doubles'] },
      { ...rally('single-15', '15 points, one game', 15, 21, 1), formats: ['singles', 'doubles'] },
      ...raceTo([30, 31, 35]),
    ],
    tiers: [
      { id: 'beginner', label: 'Beginner' },
      { id: 'low-intermediate', label: 'Low Intermediate' },
      { id: 'intermediate', label: 'Intermediate' },
      { id: 'high-intermediate', label: 'High Intermediate' },
      { id: 'advanced', label: 'Advanced' },
      { id: 'open', label: 'Open' },
    ],
    terminology: { equipment: 'shuttle', equipmentFee: 'Shuttle fee', scoreUnit: 'point' },
  },
  pickleball: {
    id: 'pickleball',
    name: 'Pickleball',
    description: 'Games to 11, win by 2, mostly doubles at open play.',
    playersPerSide: 2,
    defaultFormat: 'doubles',
    scoring: [
      { ...rally('to-11', '11 points, one game', 11, undefined, 1), formats: ['singles', 'doubles'] },
      { ...rally('to-11-bo3', '11 points, best of 3', 11, undefined, 3), formats: ['singles', 'doubles'] },
      { ...rally('rally-15', '15 points rally, one game', 15, undefined, 1), formats: ['doubles'] },
    ],
    tiers: [
      { id: '2.5', label: '2.5' },
      { id: '3.0', label: '3.0' },
      { id: '3.5', label: '3.5' },
      { id: '4.0', label: '4.0' },
      { id: '4.5', label: '4.5' },
      { id: '5.0', label: '5.0+' },
    ],
    terminology: { equipment: 'ball', equipmentFee: 'Ball fee', scoreUnit: 'point' },
  },
  tennis: {
    id: 'tennis',
    name: 'Tennis',
    description: 'Short sets for rotation-friendly open play, singles or doubles.',
    playersPerSide: 2,
    defaultFormat: 'doubles',
    scoring: [
      {
        id: 'fast4',
        label: 'Fast4 set to 4 games',
        unit: 'game',
        pointsToWin: 4,
        winBy: 1,
        bestOf: 1,
        formats: ['singles', 'doubles'],
      },
      {
        id: 'pro-set',
        label: 'Pro set to 8 games',
        unit: 'game',
        pointsToWin: 8,
        winBy: 2,
        cap: 9,
        bestOf: 1,
        formats: ['singles', 'doubles'],
      },
    ],
    tiers: [
      { id: '2.5', label: 'NTRP 2.5' },
      { id: '3.0', label: 'NTRP 3.0' },
      { id: '3.5', label: 'NTRP 3.5' },
      { id: '4.0', label: 'NTRP 4.0' },
      { id: '4.5', label: 'NTRP 4.5+' },
    ],
    terminology: { equipment: 'ball', equipmentFee: 'Ball fee', scoreUnit: 'game' },
  },
  padel: {
    id: 'padel',
    name: 'Padel',
    description: 'Always doubles, with short sets suited to court rotation.',
    playersPerSide: 2,
    defaultFormat: 'doubles',
    scoring: [
      {
        id: 'short-set',
        label: 'Set to 4 games',
        unit: 'game',
        pointsToWin: 4,
        winBy: 1,
        bestOf: 1,
        formats: ['doubles'],
      },
      {
        id: 'full-set',
        label: 'Set to 6 games',
        unit: 'game',
        pointsToWin: 6,
        winBy: 2,
        cap: 7,
        bestOf: 1,
        formats: ['doubles'],
      },
    ],
    tiers: [
      { id: '1', label: 'Level 1–2' },
      { id: '3', label: 'Level 3' },
      { id: '4', label: 'Level 4' },
      { id: '5', label: 'Level 5' },
      { id: '6', label: 'Level 6+' },
    ],
    terminology: { equipment: 'ball', equipmentFee: 'Ball fee', scoreUnit: 'game' },
  },
  'table-tennis': {
    id: 'table-tennis',
    name: 'Table Tennis',
    description: 'Games to 11, win by 2, best of 3 or 5.',
    playersPerSide: 1,
    defaultFormat: 'singles',
    scoring: [
      { ...rally('to-11-bo3', '11 points, best of 3', 11, undefined, 3), formats: ['singles', 'doubles'] },
      { ...rally('to-11-bo5', '11 points, best of 5', 11, undefined, 5), formats: ['singles', 'doubles'] },
    ],
    tiers: [
      { id: 'beginner', label: 'Beginner' },
      { id: 'intermediate', label: 'Intermediate' },
      { id: 'advanced', label: 'Advanced' },
      { id: 'competitive', label: 'Competitive' },
    ],
    terminology: { equipment: 'ball', equipmentFee: 'Ball fee', scoreUnit: 'point' },
  },
  volleyball: {
    id: 'volleyball',
    name: 'Volleyball',
    description: 'Team rally scoring to 25, with a 15-point deciding set.',
    playersPerSide: 6,
    defaultFormat: 'team',
    scoring: [
      { ...rally('to-25', '25 points, one set', 25, undefined, 1), formats: ['team'] },
      { ...rally('to-25-bo3', '25 points, best of 3', 25, undefined, 3), formats: ['team'] },
    ],
    tiers: [
      { id: 'recreational', label: 'Recreational' },
      { id: 'intermediate', label: 'Intermediate' },
      { id: 'advanced', label: 'Advanced' },
    ],
    terminology: { equipment: 'ball', equipmentFee: 'Ball fee', scoreUnit: 'point' },
  },
}

export const defaultSportId: SportId = 'badminton'
