import type { MatchFormat, ScoreUnit, SportId } from '../types/sport.ts'

/** A way of scoring a match, e.g. "21 points, rally, best of 3". */
export interface ScoringFormat {
  id: string
  label: string
  unit: ScoreUnit
  /** Points or games needed to win one game or set. */
  pointsToWin: number
  /** Required lead at the end (2 for deuce rules, 1 for sudden death). */
  winBy: number
  /** Score at which the next point wins regardless of lead. Equal to `pointsToWin` for a race to it. */
  cap?: number
  /**
   * Formats that differ only in a detail (e.g. the ceiling of a race) share a group,
   * named here: setup lists them together under it, labelled by `variant`.
   */
  group?: string
  /** How the group plays, shown under its name in setup. */
  groupDescription?: string
  /** What sets this format apart within its group, e.g. "Race to 31". */
  variant?: string
  /** Games or sets in the match (1, 3, 5). */
  bestOf: number
  formats: MatchFormat[]
}

/** A skill level a player holds within one sport. */
export interface SkillTier {
  id: string
  label: string
}

/** Words that differ between sports. Everything else uses neutral copy. */
export interface SportTerminology {
  /** The item the session fee pays for, e.g. "shuttle", "ball". */
  equipment: string
  /** Label for the per-player equipment fee, e.g. "Shuttle fee". */
  equipmentFee: string
  /** What one scored unit is called, e.g. "point", "game". */
  scoreUnit: string
}

/** Everything about a sport except presentation (icons live in the web config). */
export interface SportRules {
  id: SportId
  name: string
  description: string
  /** Players per side when the match format is `team`. */
  playersPerSide: number
  defaultFormat: MatchFormat
  scoring: ScoringFormat[]
  tiers: SkillTier[]
  terminology: SportTerminology
}
