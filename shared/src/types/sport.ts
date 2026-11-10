/** Identifier for a sport. Keys of `sportRules`. */
export type SportId = 'badminton' | 'pickleball' | 'tennis' | 'padel' | 'table-tennis' | 'volleyball'

/** How many players stand on each side of the net. */
export type MatchFormat = 'singles' | 'doubles' | 'team'

/** What a score counts: rally points, or games within a set. */
export type ScoreUnit = 'point' | 'game'
