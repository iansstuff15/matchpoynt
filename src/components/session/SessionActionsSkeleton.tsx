import { Skeleton } from '@/components/ui/skeleton'

/** Queueing, Check-in QR, Settings, Publish, Start over, Finish session and Delete session while the session loads. */
export default function SessionActionsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-9 w-36" />
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-9 w-36" />
      <Skeleton className="h-9 w-36" />
      <Skeleton className="h-9 w-36" />
    </div>
  )
}
