import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as SiteHeader: the floating pill with brand mark, nav links and the action. */
export default function SiteHeaderSkeleton() {
  return (
    <div className="fixed inset-x-0 top-3 z-40 flex justify-center px-3 sm:top-5">
      <div className="flex items-center gap-1 rounded-full border bg-background/75 p-1.5 shadow-lg">
        <Skeleton className="size-9 rounded-full" />
        <div className="hidden items-center gap-1 md:flex">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <Skeleton className="ml-1 h-8 w-24 rounded-full" />
      </div>
    </div>
  )
}
