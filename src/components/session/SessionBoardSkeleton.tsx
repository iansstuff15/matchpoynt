import AddPlayerFormSkeleton from '@/components/session/AddPlayerFormSkeleton'
import CourtCardSkeleton from '@/components/session/CourtCardSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

/** The Management tab while the session loads: tabs, the add players and courts section, then the court grid. The queue panel has its own skeleton. */
export default function SessionBoardSkeleton({ courts = 4 }: { courts?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading session board">
      <Skeleton className="h-9 w-64 rounded-lg" />
      {/* Tabs puts an 8px gap above TabsContent's 24px margin. */}
      <div className="mt-8 space-y-6">
        <div className="board-tools">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="board-tools-content">
            <AddPlayerFormSkeleton />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: courts }, (_, i) => (
            <li key={i}>
              <CourtCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
