import type { LeaderboardBadgeId, LeaderboardEntry } from '@matchpoynt/shared'
import type { ShareCardContext } from '@/interfaces/ShareCard'

/** Shareable images: portrait, the size social apps show best. */
export const shareCard = {
  width: 1080,
  height: 1350,
  padding: 96,
  /** The badge drawing on a badge card, and its glow. */
  iconSize: 380,
  glowRadius: 330,
  /** Small badge drawings on the summary card. */
  miniIconSize: 120,
  /** Every drawing sits on a light round plate (radius = size × this), like a medal, so every colour reads on the dark stage. */
  plate: 0.68,
  type: 'image/png',
} as const

const signed = (n: number) => (n > 0 ? `+${n}` : String(n))
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** The line under a badge's name: what earned it. The API decided who earns it; this only words it. */
export const badgeLine: Record<LeaderboardBadgeId, (e: LeaderboardEntry, ctx: ShareCardContext) => string> = {
  'most-wins': (e) => `${plural(e.wins, 'win')} · the most of anyone`,
  'best-diff': (e, ctx) => `${signed(e.pointsFor - e.pointsAgainst)} ${ctx.scoreUnit}s · the best margin`,
  'most-played': (e) => `${plural(e.played, 'match', 'matches')} played · on court the most`,
  'hot-streak': (e) => `${e.streak} wins in a row`,
  unbeaten: (e) => `${e.wins}–0 · not beaten yet`,
}
