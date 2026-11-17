import type { SportId } from '@matchpoynt/shared'
import { Badge } from '@/components/ui/badge'
import { sports } from '@/config/sports'

/** A sport's icon and name, as a small tag. */
export default function SportTag({ sportId }: { sportId: SportId }) {
  const Icon = sports[sportId].icon
  return (
    <Badge variant="secondary" className="gap-1">
      <Icon aria-hidden />
      {sports[sportId].name}
    </Badge>
  )
}
