import type { ClubBadgeView } from '@matchpoynt/shared'
/** A generated image for sharing a player's leaderboard achievements. */
export interface ShareCard {
  /** e.g. "Most wins", or "Summary" for the player card. */
  title: string
  /** File name to share or download it as. */
  fileName: string
  blob: Blob
}

/** What every card needs besides the player: where it's from. */
export interface ShareCardContext {
  sportName: string
  /** The sport's word for a point, e.g. "point". */
  scoreUnit: string
  /** Shown small at the bottom, e.g. the public leaderboard's address. */
  footer: string
  /** The club badges this player earned, each drawn on its own card. */
  clubBadges: ClubBadgeView[]
}
