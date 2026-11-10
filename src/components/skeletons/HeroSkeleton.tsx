import { Skeleton } from '@/components/ui/skeleton'

/** Same frame as HeroSection: framed mesh panel, eyebrow, two-line headline, lead, two buttons and the sports strip. */
export default function HeroSkeleton() {
  return (
    <div className="frame-hero flex min-h-[calc(100svh-1rem)] items-center py-28 sm:min-h-[calc(100svh-2rem)]">
      <div className="container-page grid grid-cols-[minmax(0,1fr)] justify-items-center gap-10">
        <div className="grid justify-items-center gap-5">
          <Skeleton className="h-4 w-56 bg-white/20" />
          <Skeleton className="h-[clamp(3rem,7vw+1rem,6.5rem)] w-[min(90%,52rem)] bg-white/20" />
          <Skeleton className="h-[clamp(3rem,7vw+1rem,6.5rem)] w-[min(70%,36rem)] bg-white/20" />
          <Skeleton className="h-6 w-[min(90%,30rem)] bg-white/20" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-40 rounded-full bg-white/20" />
          <Skeleton className="h-10 w-48 rounded-full bg-white/20" />
        </div>
        <Skeleton className="h-11 w-full max-w-2xl rounded-full bg-white/20" />
      </div>
    </div>
  )
}
