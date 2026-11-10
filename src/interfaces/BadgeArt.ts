/**
 * One shape of a badge drawing, on a 24×24 grid. The same data draws the SVG
 * icons (components/leaderboard/badgeIcons) and the shareable images (utils/share).
 */
export interface BadgeShape {
  /** SVG path data. */
  d: string
  /** Filled in the badge's colour at this opacity (0–1). */
  fill?: number
  /** Filled with the `ember` theme colour instead (the hot-streak flame's core). */
  ember?: boolean
  /** Outlined in the badge's colour; caps and joins are round. */
  stroke?: { width: number; opacity?: number }
}
