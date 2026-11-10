/** Limits the tournament setup dialog shows and the API enforces. */
export const tournamentLimits = {
  nameMaxLength: 60,
  /** Elimination brackets: entrants (players or teams). */
  minEntrants: 2,
  maxEntrants: 64,
  /** Double elimination needs a losers bracket. */
  minDoubleEliminationEntrants: 3,
  /** Round robin: everyone plays everyone, so it stays small. */
  minRoundRobinEntrants: 3,
  maxRoundRobinEntrants: 16,
  maxPools: 8,
  minPoolSize: 2,
  maxAdvancePerPool: 4,
  /** Rotating partners: rounds to play. */
  maxRounds: 20,
  defaultRounds: 5,
}
