import type { SVGProps } from 'react'
import BadgeSvg from '@/components/leaderboard/badgeIcons/BadgeSvg'
import { badgeArt } from '@/config/badgeArt'

/** "Best +/−": rising bars with a climbing line. */
export default function BestDiffIcon(props: SVGProps<SVGSVGElement>) {
  return <BadgeSvg shapes={badgeArt['best-diff']} {...props} />
}
