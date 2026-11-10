import type { LeaderboardBadgeId } from '@matchpoynt/shared'
import { Badge } from '@/components/ui/badge'
import { leaderboardBadges } from '@/config/leaderboard'
import { cn } from '@/utils/cn'

/** A leaderboard recognition, e.g. "Most wins". Who earns it is decided by the API. */
export default function LeaderboardBadgeChip({ id, holder }: { id: LeaderboardBadgeId; holder?: string }) {
  const { label, icon: Icon, tone } = leaderboardBadges[id]
  return (
    <Badge variant="outline" className={cn('gap-1 whitespace-nowrap [&>svg]:size-3.5', tone)}>
      <Icon aria-hidden />
      {label}
      {holder && <span className="font-normal opacity-80">· {holder}</span>}
    </Badge>
  )
}
