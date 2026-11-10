/** How a tournament is played. Picked when the first court is switched to tournament play. */
export type TournamentFormat = 'single-elimination' | 'double-elimination' | 'round-robin' | 'pools-knockout'

/**
 * Who the entrants are when more than one plays per side:
 * - `fixed`: teams are formed once and stay together;
 * - `rotating`: players enter alone and get new partners every round (round robin only).
 */
export type TournamentTeamMode = 'fixed' | 'rotating'

/** How fixed teams are formed: picked by hand, drawn at random, or balanced by skill tier. */
export type TournamentTeamBuild = 'manual' | 'random' | 'balanced'

/** Seeding order: by skill tier (strongest first) or drawn at random. */
export type TournamentSeeding = 'tier' | 'random'

/** Part of a tournament a match belongs to. */
export type TournamentStage = 'knockout' | 'winners' | 'losers' | 'final' | 'pool'

export type TournamentStatus = 'active' | 'finished'

/** Where a tournament match stands. `walkover` advances the only entrant; `void` had no one to play. */
export type TournamentMatchStatus = 'waiting' | 'ready' | 'playing' | 'done' | 'walkover' | 'void'
