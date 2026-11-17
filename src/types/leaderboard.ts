import type { ComponentType, SVGProps } from 'react'

/** A leaderboard badge's drawn icon (components/leaderboard/badgeIcons). Coloured by `currentColor`. */
export type BadgeIcon = ComponentType<SVGProps<SVGSVGElement>>

/** What a share image is drawn on: the dark stage, white, or nothing (a transparent PNG to lay over a photo). */
export type ShareBackground = 'black' | 'white' | 'transparent'
