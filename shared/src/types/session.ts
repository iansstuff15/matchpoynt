/** How the next group is chosen from the queue and split into sides. */
export type MatchmakingStrategyId = 'rotation' | 'balanced' | 'skill-grouped'

/**
 * `automatic`: the matchmaking algorithm picks who plays next (and fills any
 * slots left open after manual placement). `manual`: the Queue Master drags
 * every player onto courts; nothing is picked for them.
 */
export type QueueingMode = 'automatic' | 'manual'

/** Which side of the net (0 or 1) a player is placed on. */
export type CourtSide = 0 | 1

/** Where a player who arrives mid-session enters the rotation. */
export type LateJoinerPlacement = 'fair' | 'priority'

/** Steps of the session setup dialog, in order. Server validation errors are keyed by these. */
export type SetupStepId = 'courts' | 'members' | 'scoring' | 'rules' | 'matchmaking' | 'fees'

export type CourtStatus = 'open' | 'playing'

/** Recognitions on the leaderboard. The API decides who earns them; the web app labels them. */
export type LeaderboardBadgeId = 'most-wins' | 'best-diff' | 'most-played' | 'hot-streak' | 'unbeaten'

/** Which side of the net won. */
export type MatchSide = 'a' | 'b'
