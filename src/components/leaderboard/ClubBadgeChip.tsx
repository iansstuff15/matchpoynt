import type { ClubBadgeView } from '@matchpoynt/shared'
import ClubBadgeIcon from '@/components/club/badges/ClubBadgeIcon'
import { Badge } from '@/components/ui/badge'

/** A club's own badge on a leaderboard: its GIF or image and its name. Who earns it is decided by the API. */
export default function ClubBadgeChip({ badge, holder }: { badge: ClubBadgeView; holder?: string }) {
  return (
    <Badge variant="outline" className="gap-1 py-0.5 pl-0.5 whitespace-nowrap" title={badge.summary}>
      <ClubBadgeIcon url={badge.iconUrl} name={badge.name} className="size-5" />
      {badge.name}
      {holder && <span className="font-normal opacity-80">· {holder}</span>}
    </Badge>
  )
}
