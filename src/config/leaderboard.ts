import type { LeaderboardBadgeId } from '@matchpoynt/shared'
import BestDiffIcon from '@/components/leaderboard/badgeIcons/BestDiffIcon'
import HotStreakIcon from '@/components/leaderboard/badgeIcons/HotStreakIcon'
import MostPlayedIcon from '@/components/leaderboard/badgeIcons/MostPlayedIcon'
import MostWinsIcon from '@/components/leaderboard/badgeIcons/MostWinsIcon'
import UnbeatenIcon from '@/components/leaderboard/badgeIcons/UnbeatenIcon'
import type { BadgeIcon } from '@/types/leaderboard'
import type { ColorToken } from '@/types/theme'

/**
 * Leaderboard presentation. The API decides ranks, streaks, movement and who
 * earns each badge; this file only says how they look.
 */

/**
 * Each badge has its own drawn SVG icon (components/leaderboard/badgeIcons) and colour
 * (`tone` classes for chips; `color`, the same theme token, for shareable images),
 * so they tell apart at a glance.
 */
export const leaderboardBadges: Record<LeaderboardBadgeId, { label: string; icon: BadgeIcon; tone: string; color: ColorToken }> = {
  'most-wins': { label: 'Most wins', icon: MostWinsIcon, tone: 'border-gold/50 bg-gold/15 text-warning-foreground', color: 'gold' },
  'best-diff': { label: 'Best +/−', icon: BestDiffIcon, tone: 'border-success/40 bg-success/12 text-success-foreground', color: 'success' },
  'most-played': { label: 'Most played', icon: MostPlayedIcon, tone: 'border-info/40 bg-info/12 text-info-foreground', color: 'info' },
  'hot-streak': { label: 'Hot streak', icon: HotStreakIcon, tone: 'border-fire/40 bg-fire/12 text-fire', color: 'fire' },
  unbeaten: { label: 'Unbeaten', icon: UnbeatenIcon, tone: 'border-primary/40 bg-primary/10 text-primary', color: 'primary' },
}

/** Shown as its own animated tag on the player's row and podium card, so it's left out of their badge chips. */
export const hotStreakBadge: LeaderboardBadgeId = 'hot-streak'

/** Gold, silver and bronze for the top three: crown, place badge and the podium bar's top edge. Colours are theme tokens. */
export const podiumMedals = {
  1: { label: 'Gold', crown: 'fill-gold text-gold', badge: 'bg-gold text-medal-foreground', bar: 'border-t-gold' },
  2: { label: 'Silver', crown: 'fill-silver text-silver', badge: 'bg-silver text-medal-foreground', bar: 'border-t-silver' },
  3: { label: 'Bronze', crown: 'fill-bronze text-bronze', badge: 'bg-bronze text-medal-foreground', bar: 'border-t-bronze' },
} as const

/** Podium bar height per place: taller is better. Order on screen is 2nd, 1st, 3rd. */
export const podiumBars = { 1: 'h-36 sm:h-44', 2: 'h-24 sm:h-32', 3: 'h-16 sm:h-24' } as const

/** Avatar colours, picked from the player's name so each player keeps theirs. */
export const avatarTones = [
  'bg-mesh-1/20 text-primary',
  'bg-mesh-2/30 text-accent-foreground',
  'bg-mesh-3/20 text-court',
  'bg-mesh-4/25 text-warning-foreground',
  'bg-info/15 text-info-foreground',
] as const

/** Badges shown on a podium card before collapsing the rest into "+N". */
export const podiumBadgeLimit = 2

/** Table columns (places 4+), shared by the table and its skeleton so they line up exactly. */
export const leaderboardColumns = [
  { key: 'rank', label: 'Rank', className: 'w-20' },
  { key: 'player', label: 'Player', className: '' },
  { key: 'played', label: 'Played', className: 'hidden w-20 text-right md:table-cell' },
  { key: 'streak', label: 'Streak', className: 'hidden w-24 md:table-cell' },
  { key: 'badges', label: 'Badges', className: 'hidden w-64 lg:table-cell' },
  { key: 'record', label: 'W–L', className: 'w-20 text-right' },
  { key: 'diff', label: '+/−', className: 'w-16 text-right' },
  { key: 'share', label: 'Share', className: 'w-14 text-right' },
] as const
