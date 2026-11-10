import type { LeaderboardBadgeId } from '@matchpoynt/shared'
import type { BadgeShape } from '@/interfaces/BadgeArt'

/** Each badge's drawing, duotone on a 24×24 grid: back shapes faded, front shapes solid. */
export const badgeArt: Record<LeaderboardBadgeId, BadgeShape[]> = {
  // A trophy with faded handles.
  'most-wins': [
    { d: 'M7 5H4.5v1.5A3.5 3.5 0 0 0 7.6 10M17 5h2.5v1.5a3.5 3.5 0 0 1-3.1 3.5', stroke: { width: 2, opacity: 0.5 } },
    { d: 'M7 3h10v5a5 5 0 0 1-10 0V3Z', fill: 1 },
    { d: 'M10.5 12.6h3V16h-3z', fill: 0.6 },
    { d: 'M7 19.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2V21H7v-1.5Z', fill: 1 },
  ],
  // Rising bars with a climbing line.
  'best-diff': [
    { d: 'M3.5 15h3.5v6H3.5zM10.25 11h3.5v10h-3.5zM17 7h3.5v14H17z', fill: 0.35 },
    { d: 'm4 11 5.5-4.5 3 2.5L19.5 3.5M15.5 3.5h4v4', stroke: { width: 2.2 } },
  ],
  // A disc with two arrows going round.
  'most-played': [
    { d: 'M12 2a10 10 0 1 1 0 20a10 10 0 1 1 0-20Z', fill: 0.25 },
    { d: 'M6.6 10.2a5.6 5.6 0 0 1 9.8-2.6M17.4 13.8a5.6 5.6 0 0 1-9.8 2.6M16.9 4.4v3.7h-3.7M7.1 19.6v-3.7h3.7', stroke: { width: 2.2 } },
  ],
  // A shield with a tick.
  unbeaten: [
    { d: 'M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6l-8-3Z', fill: 0.3, stroke: { width: 1.6 } },
    { d: 'm8.5 12 2.5 2.5 4.5-5', stroke: { width: 2.4 } },
  ],
  // A flame with a glowing core.
  'hot-streak': [
    { d: 'M12 2c.6 3.2 2.6 4.8 4.3 6.6A7.4 7.4 0 0 1 19 14a7 7 0 0 1-14 0c0-2.3 1-4.1 2.4-5.4.2 1.6.9 2.8 2.1 3.4C9.4 8.6 10.2 5 12 2Z', fill: 1 },
    { d: 'M12 11.5c.4 1.8 1.6 2.6 2.3 3.7.3.5.4 1 .4 1.6a2.7 2.7 0 0 1-5.4 0c0-1.3.6-2.3 1.4-3 .1.8.4 1.3.9 1.5-.1-1.3.1-2.6.4-3.8Z', ember: true },
  ],
}
