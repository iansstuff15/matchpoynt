import { sessionHistory } from '@matchpoynt/shared'
import PastSessionCardSkeleton from '@/components/session/past/PastSessionCardSkeleton'

/** The past sessions grid while it loads: the same grid and card frames. */
export default function PastSessionsSkeleton() {
  return (
    <ul className="club-card-grid" aria-busy="true" aria-label="Loading past sessions">
      {Array.from({ length: Math.min(sessionHistory.pageSize, 6) }, (_, i) => (
        <li key={i}>
          <PastSessionCardSkeleton />
        </li>
      ))}
    </ul>
  )
}
