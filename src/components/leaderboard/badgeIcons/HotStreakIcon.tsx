import type { SVGProps } from 'react'
import BadgeSvg from '@/components/leaderboard/badgeIcons/BadgeSvg'
import { badgeArt } from '@/config/badgeArt'

/** "Hot streak": a flame with a glowing core in the `ember` theme colour. */
export default function HotStreakIcon(props: SVGProps<SVGSVGElement>) {
  return <BadgeSvg shapes={badgeArt['hot-streak']} {...props} />
}
