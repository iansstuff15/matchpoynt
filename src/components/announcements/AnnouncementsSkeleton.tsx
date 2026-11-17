import { Skeleton } from '@/components/ui/skeleton'

/** Stands in for a list of announcements while it loads: the same bordered items, title, date and message lines. */
export default function AnnouncementsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="grid gap-3" aria-busy="true" aria-label="Loading announcements">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="grid gap-2 rounded-xl border p-4">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </li>
      ))}
    </ul>
  )
}
