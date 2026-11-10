import type { GameScore, PlayerRef } from './Session.ts'
import type { SportId } from '../types/sport.ts'
import type {
  TournamentFormat,
  TournamentMatchStatus,
  TournamentSeeding,
  TournamentStage,
  TournamentStatus,
  TournamentTeamBuild,
  TournamentTeamMode,
} from '../types/tournament.ts'

/** Body of switching the first court to tournament play: the tournament to run on it. */
export interface TournamentSetupInput {
  /** The court being switched on. */
  courtId: string
  name: string
  format: TournamentFormat
  /** Ignored in singles, where every player is an entrant. */
  teamMode: TournamentTeamMode
  teamBuild: TournamentTeamBuild
  /** Checked-in players taking part. */
  playerIds: string[]
  /** `manual` team build only: the teams, each a list of player ids. */
  teams: string[][]
  seeding: TournamentSeeding
  /** Pools then knockout only. */
  pools: { count: number; advance: number }
  /** Rotating partners only: rounds to play. */
  rounds: number
}

/** Body of setting who competes in the running tournament, before it starts: every competitor's player id. */
export interface TournamentCompetitorsInput {
  playerIds: string[]
}

/** Body of switching a court in or out of tournament play once a tournament exists. */
export interface CourtTournamentInput {
  on: boolean
}

export interface TournamentEntrantView {
  id: string
  /** Team or player name, e.g. "Ana & Ben". */
  label: string
  players: PlayerRef[]
  seed: number
  /** Out of the tournament (lost in a knockout, or didn't advance from pools). */
  eliminated: boolean
}

/** One side of a tournament match: an entrant, or what it's waiting for ("Winner of QF 1", "Bye"). */
export interface TournamentSideView {
  entrantId: string | null
  label: string
  players: PlayerRef[]
  /** Set while the side isn't known yet, or is a bye. */
  placeholder: string | null
}

export interface TournamentMatchView {
  id: string
  /** e.g. "Quarterfinal 2", "Losers round 3, match 1", "Pool A, round 2". */
  label: string
  stage: TournamentStage
  round: number
  status: TournamentMatchStatus
  sides: [TournamentSideView, TournamentSideView]
  /** 0 or 1 once decided. */
  winner: 0 | 1 | null
  games: GameScore[]
  courtLabel: string | null
  /** Whether "start" would succeed now (a tournament court is open and every player is free). Always false on the public page. */
  canStart: boolean
  /** Why it can't start, in the user's words, while it's ready. */
  startBlockedReason: string | null
}

export interface TournamentRoundView {
  label: string
  matches: TournamentMatchView[]
}

export interface TournamentStandingView {
  rank: number
  /** Entrant id, or player id with rotating partners. */
  id: string
  label: string
  played: number
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  /** Finished high enough to reach the knockout (pools then knockout). */
  advancing: boolean
}

/** A part of the tournament drawn together: a bracket (columns of rounds) or a pool (standings and rounds). */
export interface TournamentSectionView {
  id: string
  label: string
  kind: 'bracket' | 'pool'
  rounds: TournamentRoundView[]
  /** Pools and round robin; empty for brackets. */
  standings: TournamentStandingView[]
}

export interface TournamentView {
  name: string
  format: TournamentFormat
  teamMode: TournamentTeamMode
  status: TournamentStatus
  /** The winner once the tournament is decided. */
  champion: { label: string; players: PlayerRef[] } | null
  entrants: TournamentEntrantView[]
  sections: TournamentSectionView[]
  /** Ready matches in the order courts take them. */
  upNext: TournamentMatchView[]
  /** Matches on court right now. */
  playing: TournamentMatchView[]
  matchesPlayed: number
  matchesTotal: number
  /** Courts switched to tournament play. */
  courtLabels: string[]
  /** What to do next, in the user's words, e.g. "Switch a court to tournament play to start matches." */
  hint: string | null
  /** Public link, or `null` when not published (or publishing is switched off). */
  publicUrl: string | null
}

/** The live tournament for anyone with its published link. */
export interface PublicTournamentView {
  sportId: SportId
  /** The session's status: a tournament stops when its session ends. */
  sessionStatus: 'active' | 'ended'
  updatedAt: string
  tournament: TournamentView
}

export interface TournamentPublishResponse {
  publicUrl: string | null
}
