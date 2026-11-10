import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as AddPlayerForm: name field, tier select, "Already checked in", add button. */
export default function AddPlayerFormSkeleton() {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-9 w-60" />
      </div>
      <div className="grid gap-1.5">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-9 w-36" />
      <Skeleton className="h-9 w-36" />
    </div>
  )
}
