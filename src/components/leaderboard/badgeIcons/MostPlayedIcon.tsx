import type { SVGProps } from 'react'
import BadgeSvg from '@/components/leaderboard/badgeIcons/BadgeSvg'
import { badgeArt } from '@/config/badgeArt'

/** "Most played": a disc with two arrows going round. */
export default function MostPlayedIcon(props: SVGProps<SVGSVGElement>) {
  return <BadgeSvg shapes={badgeArt['most-played']} {...props} />
}
