import type { GameScore, TournamentFormat, TournamentSetupInput, TournamentSeeding, TournamentStage, TournamentStatus, TournamentTeamMode } from '@matchpoynt/shared'

/** A team (or a single player in singles) taking part. */
export interface EntrantState {
  id: string
  playerIds: string[]
  seed: number
}

/** Where a slot's entrant comes from: the winner or the loser of an earlier match. */
export interface SlotSource {
  matchId: string
  take: 'winner' | 'loser'
}

/**
 * One side of a bracket match. `entrantId` is filled once known; `empty` means
 * no one will ever fill it (a bye), so the other side goes through.
 */
export interface SlotState {
  entrantId: string | null
  source: SlotSource | null
  empty: boolean
}

export type TournamentResult = { winner: 0 | 1; walkover: boolean } | 'void' | null

export interface TournamentMatchState {
  /** Stable id within the tournament, e.g. "W2-1", "L3-0", "GF", "P1-R2-0", "K1-3", "R4-1". */
  id: string
  stage: TournamentStage
  /** 1-based round within its stage. */
  round: number
  /** Position within its round, from 0. */
  index: number
  /** Pool number (from 0) for pool matches; `null` otherwise. */
  pool: number | null
  slots: [SlotState, SlotState]
  /** Rotating partners only: the players on each side this round. */
  sides: [string[], string[]] | null
  result: TournamentResult
  games: GameScore[]
  /** The session match playing it; set while on court and kept afterwards. */
  sessionMatchId: string | null
  courtLabel: string | null
}

export interface TournamentState {
  id: string
  name: string
  format: TournamentFormat
  teamMode: TournamentTeamMode
  seeding: TournamentSeeding
  status: TournamentStatus
  entrants: EntrantState[]
  /** Rotating partners: every player taking part (they have no fixed entrant). */
  playerIds: string[]
  pools: { count: number; advance: number } | null
  matches: TournamentMatchState[]
  /**
   * How it was set up, so the draw can be made again with other competitors
   * before it starts. Missing on tournaments saved before competitors could change.
   */
  setup?: Pick<TournamentSetupInput, 'teamBuild' | 'teams' | 'rounds'>
  createdAt: number
  finishedAt: number | null
}
