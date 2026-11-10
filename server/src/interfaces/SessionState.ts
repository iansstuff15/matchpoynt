import type { CourtStatus, GameScore, MatchSide, SessionSettings } from '@matchpoynt/shared'
import type { TournamentState } from '@/interfaces/TournamentState'

export type PlayerStatus = 'waiting' | 'playing'
export type SessionStatus = 'active' | 'ended'

export interface PlayerState {
  id: string
  name: string
  tierId: string
  /** Matches actually played, for display. */
  gamesPlayed: number
  /**
   * Position in the rotation. Starts equal to `gamesPlayed`, but a late
   * joiner may start higher so they don't jump ahead of everyone.
   */
  rotation: number
  /** When the player last joined the queue, in ms. */
  queuedAt: number
  status: PlayerStatus
  /** False once removed; kept so past results still show their name. */
  active: boolean
  /** When they checked in at the venue, in ms; `null` until then. Only checked-in players are matched. */
  checkedInAt: number | null
}

export interface CourtState {
  id: string
  label: string
  position: number
  status: CourtStatus
  /** Player ids placed by hand on each side while the court is open. */
  lineup: [string[], string[]]
  /** Switched to tournament play: plays bracket matches only. */
  tournament: boolean
}

export interface MatchState {
  id: string
  courtId: string
  courtLabel: string
  sides: [string[], string[]]
  startedAt: number
  finishedAt: number | null
  games: GameScore[]
  winner: MatchSide | null
}

/** One session as the engine sees it. Only open matches (plus any finished in this request) are loaded. */
export interface SessionState {
  id: string
  ownerId: string
  /** 0 until first saved. */
  version: number
  status: SessionStatus
  /** Set when planned in a club; null otherwise. Kept by saves (save_session doesn't write it). */
  title: string | null
  /** The club that runs it (set when a planned session starts); null otherwise. Kept by saves, like the title. */
  clubId: string | null
  /** Token for the public leaderboard link; null when not published. */
  publicSlug: string | null
  /** Token behind the check-in QR; null until the Queue Master first opens it. */
  checkInSlug: string | null
  settings: SessionSettings
  players: Record<string, PlayerState>
  courts: CourtState[]
  matches: Record<string, MatchState>
  /** The session's tournament, or `null`. Saved as one JSON document on the session. */
  tournament: TournamentState | null
  /** Token for the public tournament page; null when not published. */
  tournamentSlug: string | null
}

/** Time and id source, injected so the engine stays pure and testable. */
export interface EngineContext {
  now: number
  newId: () => string
  /** A number in [0, 1), for draws (random teams, seeding, rotating partners). */
  random: () => number
}
