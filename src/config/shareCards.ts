import type { LeaderboardBadgeId, LeaderboardEntry } from '@matchpoynt/shared'
import type { ShareCardContext } from '@/interfaces/ShareCard'
import type { ColorToken } from '@/types/theme'
import type { ShareBackground } from '@/types/leaderboard'

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

/** The whole leaderboard as one image: as wide as a card, as tall as its rows need, up to `maxRows` players. */
export const leaderboardImage = {
  width: 1080,
  padding: 72,
  headerHeight: 370,
  podiumHeight: 330,
  rowHeight: 68,
  footerHeight: 150,
  maxRows: 40,
  medalRadius: 64,
} as const

/**
 * The backgrounds a share image can have, in the order the dialog offers them,
 * and the theme colours drawn on each: `stage` (top and bottom of its
 * gradient; `null` draws nothing), `ink` for names and figures, `muted` for the
 * lines under them, `plate` behind badge drawings, and `shadow` under text so
 * it reads on any photo a transparent image is laid over.
 */
export const shareBackgrounds: Record<ShareBackground, { label: string; stage: [ColorToken, ColorToken] | null; ink: ColorToken; muted: ColorToken; plate: ColorToken; shadow: boolean }> = {
  black: { label: 'Black', stage: ['deep', 'deep-strong'], ink: 'deep-foreground', muted: 'deep-muted', plate: 'deep-foreground', shadow: false },
  white: { label: 'White', stage: ['card', 'card'], ink: 'foreground', muted: 'muted-foreground', plate: 'muted', shadow: false },
  transparent: { label: 'Transparent', stage: null, ink: 'deep-foreground', muted: 'deep-foreground', plate: 'deep-foreground', shadow: true },
}

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
