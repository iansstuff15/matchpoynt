import type { SVGProps } from 'react'
import BadgeSvg from '@/components/leaderboard/badgeIcons/BadgeSvg'
import { badgeArt } from '@/config/badgeArt'

/** "Unbeaten": a shield with a tick. */
export default function UnbeatenIcon(props: SVGProps<SVGSVGElement>) {
  return <BadgeSvg shapes={badgeArt['unbeaten']} {...props} />
}
