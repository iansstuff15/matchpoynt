import { sportRules, type ScoringFormat, type SessionSettings } from '@matchpoynt/shared'

/** Players per side for the session's match format. */
export function playersPerSide(settings: SessionSettings): number {
  switch (settings.scoring.matchFormat) {
    case 'singles':
      return 1
    case 'doubles':
      return 2
    case 'team':
      return sportRules[settings.sportId].playersPerSide
  }
}

export function scoringFormat(settings: SessionSettings): ScoringFormat | undefined {
  return sportRules[settings.sportId].scoring.find((f) => f.id === settings.scoring.formatId)
}

/** Tier position within the sport, used to compare skill. Unknown tiers rank lowest. */
export function tierRank(settings: SessionSettings) {
  const tiers = sportRules[settings.sportId].tiers
  return (player: { tierId: string }) => Math.max(0, tiers.findIndex((t) => t.id === player.tierId))
}
