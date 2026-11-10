import type { SVGProps } from 'react'
import BadgeSvg from '@/components/leaderboard/badgeIcons/BadgeSvg'
import { badgeArt } from '@/config/badgeArt'

/** "Most wins": a trophy. */
export default function MostWinsIcon(props: SVGProps<SVGSVGElement>) {
  return <BadgeSvg shapes={badgeArt['most-wins']} {...props} />
}
